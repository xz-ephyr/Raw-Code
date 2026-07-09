package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/xz-ephyr/raw-code/agent/internal/model"
	"github.com/xz-ephyr/raw-code/agent/internal/tool"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

// ── Stop conditions ──────────────────────────────────────────────────────

type StopReason string

const (
	StopReasonMaxSteps     StopReason = "max_steps"
	StopReasonMaxWallClock StopReason = "max_wall_clock"
	StopReasonTaskComplete StopReason = "task_complete"
	StopReasonStuckLoop    StopReason = "stuck_loop"
	StopReasonError        StopReason = "error"
	StopReasonContextDone  StopReason = "context_cancelled"
)

// ── Step record for structured logging ────────────────────────────────────

type StepRecord struct {
	Step             int    `json:"step"`
	ToolName         string `json:"toolName,omitempty"`
	ToolParams       string `json:"toolParams,omitempty"`
	ResultSummary    string `json:"resultSummary,omitempty"`
	Error            string `json:"error,omitempty"`
	DurationMs       int64  `json:"durationMs"`
	TransientRetries int    `json:"transientRetries,omitempty"`
	Verified         bool   `json:"verified,omitempty"`
	VerifyPassed     bool   `json:"verifyPassed,omitempty"`
}

// ── Error classification ──────────────────────────────────────────────────

type errorClass int

const (
	errorClassUnknown  errorClass = iota
	errorClassTransient
	errorClassLogical
)

func classifyError(err string) errorClass {
	errLower := strings.ToLower(err)

	transientPatterns := []string{
		"timeout", "timed out", "deadline exceeded", "connection refused",
		"connection reset", "temporary", "try again",
		"resource temporarily", "too many requests",
		"429", "502", "503", "504",
		"service unavailable", "rate limit",
		"context deadline", "i/o timeout", "temporary failure",
	}
	for _, p := range transientPatterns {
		if strings.Contains(errLower, p) {
			return errorClassTransient
		}
	}

	logicalPatterns := []string{
		"not found", "no such file", "permission denied",
		"old_string not found", "path is required",
		"invalid", "sandbox", "outside project root",
		"unknown tool", "failed to read file",
		"failed to write", "is required",
		"unmarshal", "syntax error",
		"cannot find", "does not exist",
	}
	for _, p := range logicalPatterns {
		if strings.Contains(errLower, p) {
			return errorClassLogical
		}
	}

	return errorClassLogical
}

// ── Params key for stuck-loop detection ───────────────────────────────────

func paramsKey(toolName string, params map[string]any) string {
	data, _ := json.Marshal(params)
	maxLen := 300
	if len(data) > maxLen {
		return toolName + ":" + string(data[:maxLen])
	}
	return toolName + ":" + string(data)
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// ── Edit/write detection ─────────────────────────────────────────────────

func isEditOrWrite(toolName string) bool {
	return toolName == "edit_file" || toolName == "write_file"
}

// ── Verification command auto-detection ───────────────────────────────────

func detectVerificationCommand(projectRoot string) (command string, workdir string) {
	if projectRoot == "" {
		return "", ""
	}

	pkgPath := filepath.Join(projectRoot, "package.json")
	if data, err := os.ReadFile(pkgPath); err == nil {
		var pkg struct {
			Scripts map[string]string `json:"scripts"`
		}
		if json.Unmarshal(data, &pkg) == nil {
			for _, name := range []string{"typecheck", "type-check", "lint", "test"} {
				if _, ok := pkg.Scripts[name]; ok {
					cmd := "npx " + name
					if name == "test" {
						cmd = "npx test 2>&1 || true"
					}
					return cmd, projectRoot
				}
			}
			if _, ok := pkg.Scripts["build"]; ok {
				return "npx build", projectRoot
			}
		}
	}

	makefilePath := filepath.Join(projectRoot, "Makefile")
	if _, err := os.Stat(makefilePath); err == nil {
		return "make lint 2>&1 || make test 2>&1 || true", projectRoot
	}

	goModPath := filepath.Join(projectRoot, "go.mod")
	if _, err := os.Stat(goModPath); err == nil {
		return "go build ./...", projectRoot
	}

	return "", ""
}

// ── Config & Result (extended) ────────────────────────────────────────────

type AgentLoopConfig struct {
	ModelClient       model.ModelProvider
	Executor          *tool.Executor
	MaxSteps          int
	Depth             int
	ToolScope         []string
	MaxContextTokens  int
	PlanningModel     model.ModelProvider
	VerifyFn          func(ctx context.Context, result *AgentLoopResult) (ok bool, feedback string)
	Logger            LogFn

	MaxWallClockMs      int64
	MaxTransientRetries int
	SkipVerification    bool
	Model               string
}

type AgentLoopResult struct {
	Messages    []model.Message
	Steps       int
	FinalResp   string
	Error       string
	DidEdit     bool
	Planned     bool
	Verified    bool
	StopReason  StopReason    `json:"stopReason"`
	StepLog     []StepRecord  `json:"stepLog,omitempty"`
	WallClockMs int64         `json:"wallClockMs"`
	RetryCount  int           `json:"retryCount"`
}

func makeResult(messages []model.Message, steps int, err string, reason StopReason, stepLog []StepRecord, startTime time.Time) *AgentLoopResult {
	return &AgentLoopResult{
		Messages:    messages,
		Steps:       steps,
		Error:       err,
		StopReason:  reason,
		StepLog:     stepLog,
		WallClockMs: time.Since(startTime).Milliseconds(),
	}
}

// ── Main entry point ──────────────────────────────────────────────────────

func RunAgentLoop(ctx context.Context, cfg AgentLoopConfig, messages []model.Message) *AgentLoopResult {
	maxCtx := cfg.MaxContextTokens
	if maxCtx <= 0 {
		maxCtx = 0
	}
	ctxSafety := 4000

	maxTransientRetries := cfg.MaxTransientRetries
	if maxTransientRetries <= 0 {
		maxTransientRetries = 5
	}

	startTime := time.Now()
	var stepRecords []StepRecord
	projectRoot := ""
	if cfg.Executor != nil {
		projectRoot = cfg.Executor.ProjectRoot()
	}

	var lastCallKey string
	var consecutiveCount int
	var stuckWarningIssued bool
	totalTransientRetries := 0

	// ── Planning step (cheap model, no tools) ──────────────────────────
	if cfg.PlanningModel != nil {
		logEvent(cfg.Logger, LogInfo, "starting planning phase", map[string]any{
			"plan_model": cfg.PlanningModel.Model(),
		})
		plan := runPlanningStep(ctx, cfg.PlanningModel, messages)
		if plan != "" {
			planMsg := model.Message{
				Role:    "system",
				Content: "## Plan\n\n" + plan + "\n\nFollow this plan. Gather the information needed for each step. When all steps are done, provide the final answer.",
			}
			messages = append([]model.Message{planMsg}, messages...)
		}
	}

	// ── Execution loop ─────────────────────────────────────────────────
	logEvent(cfg.Logger, LogInfo, "starting agent loop", map[string]any{
		"max_steps": cfg.MaxSteps,
		"depth":     cfg.Depth,
		"model":     cfg.ModelClient.Model(),
	})

	for step := 0; step < cfg.MaxSteps; step++ {
		// 1. Check context cancellation
		select {
		case <-ctx.Done():
			logEvent(cfg.Logger, LogInfo, "loop: context cancelled", map[string]any{"step": step})
			return makeResult(messages, step, "context cancelled", StopReasonContextDone, stepRecords, startTime)
		default:
		}

		// 2. Check wall-clock budget
		if cfg.MaxWallClockMs > 0 {
			elapsed := time.Since(startTime).Milliseconds()
			if elapsed >= cfg.MaxWallClockMs {
				logEvent(cfg.Logger, LogInfo, "loop: wall-clock budget exceeded", map[string]any{
					"step":    step,
					"elapsed_ms": elapsed,
					"budget_ms":  cfg.MaxWallClockMs,
				})
				res := makeResult(messages, step, fmt.Sprintf("wall-clock budget exceeded (%dms)", elapsed), StopReasonMaxWallClock, stepRecords, startTime)
				res.FinalResp = "The agent loop reached its wall-clock time limit before completing the task."
				return res
			}
		}

		toolDefs := listModelTools(cfg.Executor, cfg.ToolScope)

		resp, err := cfg.ModelClient.ChatCompletion(ctx, model.ChatRequest{
			Model:    cfg.Model,
			Messages: messages,
			Tools:    toolDefs,
		})
		if err != nil {
			logEvent(cfg.Logger, LogWarn, "loop: LLM call failed", map[string]any{
				"step": step,
				"err":  err.Error(),
			})
			return makeResult(messages, step, fmt.Sprintf("LLM call failed: %v", err), StopReasonError, stepRecords, startTime)
		}

		messages = append(messages, model.Message{
			Role:    "assistant",
			Content: resp.Content,
		})

		// 3. Task-complete detection: model wants to reply (no tool calls)
		if len(resp.ToolCalls) == 0 {
			didEdit := hadEditOrWriteCall(messages)

			res := &AgentLoopResult{
				Messages:    messages,
				Steps:       step + 1,
				FinalResp:   resp.Content,
				StopReason:  StopReasonTaskComplete,
				StepLog:     stepRecords,
				WallClockMs: time.Since(startTime).Milliseconds(),
				DidEdit:     didEdit,
			}

			// Run post-loop verification if edits were made
			runVerifyHook(ctx, cfg, res)

			logEvent(cfg.Logger, LogInfo, "loop: task complete", map[string]any{
				"steps":    step + 1,
				"wall_ms":  res.WallClockMs,
				"did_edit": didEdit,
				"verified": res.Verified,
			})
			return res
		}

		logEvent(cfg.Logger, LogDebug, "LLM tool calls", map[string]any{
			"step":       step + 1,
			"tool_calls": len(resp.ToolCalls),
		})

		tcMsg := model.Message{Role: "assistant", ToolCalls: resp.ToolCalls, ExtraContent: resp.ExtraContent}
		messages = append(messages, tcMsg)

		// 4. Execute tool calls
		for _, tc := range resp.ToolCalls {
			if tc.Type != "function" {
				continue
			}

			var params map[string]any
			if err := json.Unmarshal([]byte(tc.Function.Arguments), &params); err != nil {
				params = map[string]any{"raw": tc.Function.Arguments}
			}

			if tc.Function.Name == "subagent_run" {
				params["_depth"] = float64(cfg.Depth + 1)
			}

			// ── Stuck-loop detection ─────────────────────────────────
			key := paramsKey(tc.Function.Name, params)
			if key == lastCallKey {
				consecutiveCount++
			} else {
				consecutiveCount = 1
				lastCallKey = key
				stuckWarningIssued = false
			}

			if consecutiveCount >= 4 {
				errMsg := fmt.Sprintf("stuck in repeated action loop: %q called %d times consecutively with identical parameters", tc.Function.Name, consecutiveCount)
				logEvent(cfg.Logger, LogWarn, "loop: stuck-loop abort", map[string]any{
					"tool":   tc.Function.Name,
					"count":  consecutiveCount,
					"params": truncateString(key, 200),
				})
				res := makeResult(messages, step, errMsg, StopReasonStuckLoop, stepRecords, startTime)
				res.FinalResp = errMsg
				return res
			}

			if consecutiveCount == 3 && !stuckWarningIssued {
				stuckWarningIssued = true
				warnContent := fmt.Sprintf(
					"[System] Warning: You have called %q with identical parameters %d times in a row without making progress. "+
						"Do NOT repeat this call — try a different approach or explain why you are stuck.",
					tc.Function.Name, consecutiveCount,
				)
				messages = append(messages, model.Message{Role: "system", Content: warnContent})

				stepRecords = append(stepRecords, StepRecord{
					Step:       step + 1,
					ToolName:   tc.Function.Name + "_stuck_warning",
					ToolParams: truncateString(key, 200),
					Error:      warnContent,
				})

				logEvent(cfg.Logger, LogWarn, "loop: stuck-loop warning issued", map[string]any{
					"tool":  tc.Function.Name,
					"count": consecutiveCount,
				})
				continue
			}

			// ── Execute tool with transient retry ─────────────────────
			callStart := time.Now()
			transientRetries := 0
			var result api.ToolCall
			var callErr string

			for attempt := 0; attempt <= 2; attempt++ {
				if attempt > 0 {
					if totalTransientRetries >= maxTransientRetries {
						logEvent(cfg.Logger, LogWarn, "loop: transient retry budget exhausted", nil)
						break
					}
					backoff := time.Duration(500*(1<<(attempt-1))) * time.Millisecond
					time.Sleep(backoff)
				}

				result = cfg.Executor.Execute(ctx, api.ToolCall{
					ID:     tc.ID + fmt.Sprintf("_try%d", attempt),
					Tool:   tc.Function.Name,
					Params: params,
				})

				if result.Error == "" {
					break
				}

				callErr = result.Error
				ec := classifyError(callErr)

				if ec == errorClassLogical {
					break
				}

				if attempt < 2 {
					transientRetries++
					totalTransientRetries++
					logEvent(cfg.Logger, LogDebug, "loop: transient retry", map[string]any{
						"tool":    tc.Function.Name,
						"attempt": attempt + 1,
						"err":     truncateString(callErr, 150),
					})
				}
			}

			// ── Build result message for the model ────────────────────
			resultJSON, _ := json.Marshal(result.Result)
			if resultJSON == nil {
				resultJSON = []byte("null")
			}

			resultContent := string(resultJSON)
			if result.Error != "" {
				resultContent = fmt.Sprintf("Error: %s", result.Error)
			}

			messages = append(messages, model.Message{
				Role:       "tool",
				ToolCallID: tc.ID,
				Content:    resultContent,
				Name:       tc.Function.Name,
			})

			// ── Record step ───────────────────────────────────────────
			rec := StepRecord{
				Step:             step + 1,
				ToolName:         tc.Function.Name,
				ToolParams:       truncateString(paramsKey(tc.Function.Name, params), 200),
				DurationMs:       time.Since(callStart).Milliseconds(),
				TransientRetries: transientRetries,
			}
			if result.Error != "" {
				rec.Error = truncateString(result.Error, 300)
			} else {
				rec.ResultSummary = truncateString(string(resultJSON), 200)
			}

			// ── Verification hook after successful edit/write ─────────
			if result.Error == "" && isEditOrWrite(tc.Function.Name) && !cfg.SkipVerification && projectRoot != "" {
				rec.Verified = true
				verifyOutput, verifyErr := runStepVerification(ctx, projectRoot)
				if verifyErr != nil {
					rec.VerifyPassed = false
					verifyContent := fmt.Sprintf(
						"Verification failed after %s:\n\n%s\n\nPlease fix the issues and try again.",
						tc.Function.Name, verifyOutput,
					)
					messages = append(messages, model.Message{
						Role:       "tool",
						ToolCallID: tc.ID + "_verify",
						Content:    verifyContent,
						Name:       "verification",
					})
					logEvent(cfg.Logger, LogWarn, "loop: verification failed after edit", map[string]any{
						"tool":   tc.Function.Name,
						"output": truncateString(verifyOutput, 200),
					})
				} else {
					rec.VerifyPassed = true
					logEvent(cfg.Logger, LogDebug, "loop: verification passed after edit", map[string]any{
						"tool": tc.Function.Name,
					})
				}
			}

			stepRecords = append(stepRecords, rec)
		}

		// 5. Context window management
		if maxCtx > 0 && messagesTokenCount(messages) > maxCtx-ctxSafety {
			messages = trimMessages(messages, maxCtx-ctxSafety)
		}
	}

	// ── Max steps reached — final summary ──────────────────────────────
	logEvent(cfg.Logger, LogInfo, "max steps reached, requesting final summary", map[string]any{
		"steps": cfg.MaxSteps,
	})
	if maxCtx > 0 {
		messages = trimMessagesForFinal(messages, maxCtx)
	}

	messages = append(messages, model.Message{
		Role:    "user",
		Content: "Provide a concise final answer synthesizing all the information gathered.",
	})

	finalResp, err := cfg.ModelClient.ChatCompletion(ctx, model.ChatRequest{
		Model:    cfg.Model,
		Messages: messages,
	})
	if err != nil {
		res := makeResult(messages, cfg.MaxSteps, fmt.Sprintf("final LLM call failed: %v", err), StopReasonError, stepRecords, startTime)
		return res
	}

	messages = append(messages, model.Message{
		Role:    "assistant",
		Content: finalResp.Content,
	})

	didEdit := hadEditOrWriteCall(messages)

	res := &AgentLoopResult{
		Messages:    messages,
		Steps:       cfg.MaxSteps,
		FinalResp:   finalResp.Content,
		StopReason:  StopReasonMaxSteps,
		StepLog:     stepRecords,
		WallClockMs: time.Since(startTime).Milliseconds(),
		DidEdit:     didEdit,
	}
	runVerifyHook(ctx, cfg, res)
	return res
}

func hadEditOrWriteCall(messages []model.Message) bool {
	for _, m := range messages {
		for _, tc := range m.ToolCalls {
			if tc.Function.Name == "write_file" || tc.Function.Name == "edit_file" || tc.Function.Name == "run_command" {
				return true
			}
		}
	}
	return false
}

// ── Step-level verification runner ────────────────────────────────────────

func runStepVerification(ctx context.Context, projectRoot string) (string, error) {
	cmd, workdir := detectVerificationCommand(projectRoot)
	if cmd == "" {
		return "", nil
	}

	stdout, stderr, exitCode, err := tool.RunShell(ctx, cmd, workdir, 60*time.Second)
	combined := strings.TrimSpace(stdout + "\n" + stderr)

	if exitCode != 0 || err != nil {
		if combined == "" {
			combined = fmt.Sprintf("command exited with code %d", exitCode)
		}
		return combined, fmt.Errorf("verification failed (exit %d)", exitCode)
	}

	return "", nil
}

// ── Planning step ────────────────────────────────────────────────────────

func runPlanningStep(ctx context.Context, planModel model.ModelProvider, messages []model.Message) string {
	sysPrompt := ""
	userTask := ""
	for _, m := range messages {
		if m.Role == "system" {
			sysPrompt = m.Content
		}
		if m.Role == "user" {
			userTask = m.Content
			break
		}
	}

	planPrompt := fmt.Sprintf(`Given the following system context and user task, create a concise step-by-step plan.

System context: %s

Task: %s

Return ONLY a numbered plan (3-6 steps). Each step should be a single sentence describing what to do.`, truncateText(sysPrompt, 500), truncateText(userTask, 2000))

	resp, err := planModel.ChatCompletion(ctx, model.ChatRequest{
		Messages: []model.Message{
			{Role: "system", Content: "You are a planning expert. Produce concise numbered plans. No commentary, no markdown."},
			{Role: "user", Content: planPrompt},
		},
	})
	if err != nil {
		logEvent(nil, LogWarn, "planning step failed", map[string]any{"error": err.Error()})
		return ""
	}
	return resp.Content
}

func truncateText(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// ── Self-verification hook (post-loop) ────────────────────────────────────

func runVerifyHook(ctx context.Context, cfg AgentLoopConfig, res *AgentLoopResult) {
	if cfg.VerifyFn == nil {
		return
	}

	if !res.DidEdit {
		return
	}

	ok, feedback := cfg.VerifyFn(ctx, res)
	res.Verified = ok
	if !ok && feedback != "" {
		feedbackMsg := model.Message{
			Role:    "user",
			Content: fmt.Sprintf("Verification of the changes produced the following feedback:\n\n%s\n\nPlease fix the issues identified above.", feedback),
		}
		res.Messages = append(res.Messages, feedbackMsg)

		toolDefs := listModelTools(cfg.Executor, cfg.ToolScope)
		resp, err := cfg.ModelClient.ChatCompletion(ctx, model.ChatRequest{
			Model:    cfg.Model,
			Messages: res.Messages,
			Tools:    toolDefs,
		})
		if err != nil {
			res.Error = fmt.Sprintf("LLM call after verification failed: %v", err)
			return
		}

		res.Messages = append(res.Messages, model.Message{
			Role:    "assistant",
			Content: resp.Content,
		})

		if len(resp.ToolCalls) > 0 {
			tcMsg := model.Message{Role: "assistant", ToolCalls: resp.ToolCalls, ExtraContent: resp.ExtraContent}
			res.Messages = append(res.Messages, tcMsg)

			for _, tc := range resp.ToolCalls {
				if tc.Type != "function" {
					continue
				}
				var params map[string]any
				if err := json.Unmarshal([]byte(tc.Function.Arguments), &params); err != nil {
					params = map[string]any{"raw": tc.Function.Arguments}
				}
				call := api.ToolCall{ID: tc.ID, Tool: tc.Function.Name, Params: params}
				result := cfg.Executor.Execute(ctx, call)

				resultJSON, _ := json.Marshal(result.Result)
				if resultJSON == nil {
					resultJSON = []byte("null")
				}
				resultContent := string(resultJSON)
				if result.Error != "" {
					resultContent = fmt.Sprintf("Error: %s", result.Error)
				}
				res.Messages = append(res.Messages, model.Message{
					Role: "tool", ToolCallID: tc.ID, Content: resultContent, Name: tc.Function.Name,
				})
			}

			msg := model.Message{Role: "user", Content: "Summarize what was fixed and the final result."}
			res.Messages = append(res.Messages, msg)
			fixResp, err := cfg.ModelClient.ChatCompletion(ctx, model.ChatRequest{Model: cfg.Model, Messages: res.Messages})
			if err == nil {
				res.Messages = append(res.Messages, model.Message{Role: "assistant", Content: fixResp.Content})
				res.FinalResp = fixResp.Content
			}
		} else {
			res.FinalResp = resp.Content
		}
	}
}

// ── Context window helpers ──────────────────────────────────────────────

func roughTokenCount(s string) int {
	if s == "" {
		return 0
	}
	return len(s) / 3
}

func messagesTokenCount(msgs []model.Message) int {
	total := 0
	for _, m := range msgs {
		total += roughTokenCount(m.Content)
		total += roughTokenCount(m.ExtraContent)
		for _, tc := range m.ToolCalls {
			total += roughTokenCount(tc.Function.Name)
			total += roughTokenCount(tc.Function.Arguments)
		}
		total += 10
	}
	return total
}

func trimMessages(msgs []model.Message, maxTokens int) []model.Message {
	if len(msgs) <= 3 {
		return msgs
	}

	for messagesTokenCount(msgs) > maxTokens && len(msgs) > 3 {
		removed := false
		for i := 1; i < len(msgs)-1 && !removed; i++ {
			if msgs[i].Role == "user" {
				msgs = append(msgs[:i], msgs[i+1:]...)
				removed = true
			}
		}
		if !removed && len(msgs) > 3 {
			msgs = append(msgs[:1], msgs[3:]...)
		}
	}
	return msgs
}

func trimMessagesForFinal(msgs []model.Message, maxTokens int) []model.Message {
	if messagesTokenCount(msgs) <= maxTokens {
		return msgs
	}

	safe := maxTokens - 4000
	var kept []model.Message
	var header []model.Message
	for _, m := range msgs {
		if m.Role == "system" {
			header = append(header, m)
		} else {
			break
		}
	}

	tail := make([]model.Message, 0, len(msgs))
	for i := len(msgs) - 1; i >= 0; i-- {
		if msgs[i].Role == "system" {
			break
		}
		tail = append([]model.Message{msgs[i]}, tail...)
		if safe > 0 && messagesTokenCount(tail) > safe {
			break
		}
	}

	kept = append(kept, header...)
	kept = append(kept, tail...)
	return kept
}

// ── Tool listing ─────────────────────────────────────────────────────────

func listModelTools(executor *tool.Executor, scope []string) []model.ToolDefinition {
	if executor == nil {
		return []model.ToolDefinition{
			{Name: "web_search", Description: "Search the web for information", Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{"type": "string", "description": "Search query"},
				},
				"required": []string{"query"},
			}},
			{Name: "read_file", Description: "Read a file from the filesystem", Parameters: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"path": map[string]any{"type": "string", "description": "File path"},
				},
				"required": []string{"path"},
			}},
		}
	}

	allTools := executor.Registry().List()
	if scope != nil {
		filtered := make([]api.ToolDefinition, 0, len(allTools))
		for _, t := range allTools {
			if FilterToolScope(scope, t.Name) {
				filtered = append(filtered, t)
			}
		}
		return ToolsToModelDefinitions(filtered)
	}
	return ToolsToModelDefinitions(allTools)
}

// RunAgentTask is a convenience method on Orchestrator that runs the shared
// agent loop directly — no SubAgent lifecycle, no summarization, no depth
// wrapper. Callers that need lifecycle tracking should use SubAgentManager.
func (o *Orchestrator) RunAgentTask(ctx context.Context, req SubAgentRequest) *AgentLoopResult {
	if o.modelClient == nil {
		return &AgentLoopResult{Error: "no model client configured"}
	}

	agentPrompt := BuildAgentSystemPrompt(req.AgentType)
	messages := []model.Message{
		{Role: "system", Content: agentPrompt},
		{Role: "user", Content: req.Task},
	}
	if req.Context != "" {
		messages = append(messages, model.Message{Role: "user", Content: "Context:\n" + req.Context})
	}

	scope := GetAgentConfig(req.AgentType).ToolScope
	if req.ToolScope != nil {
		scope = req.ToolScope
	}

	cfg := AgentLoopConfig{
		ModelClient:        o.modelClient,
		Executor:           o.executor,
		MaxSteps:           req.MaxSteps,
		Depth:              req.Depth,
		ToolScope:          scope,
		MaxWallClockMs:     req.MaxWallClockMs,
		SkipVerification:   req.SkipVerification,
		MaxTransientRetries: req.MaxTransientRetries,
		Model:              req.Model,
	}

	return RunAgentLoop(ctx, cfg, messages)
}
