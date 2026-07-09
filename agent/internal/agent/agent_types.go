package agent

import (
	_ "embed"
	"fmt"
	"strings"
)

// Built-in agent type identifiers.
const (
	AgentStrategyAuditor = "strategy-auditor"
	AgentDebug           = "debug"
	AgentTeamwork        = "teamwork"
	AgentExplorer        = "explorer"
)

//go:embed agents/strategy-auditor.md
var strategyAuditorAgentPrompt string

//go:embed agents/debug.md
var debugAgentPrompt string

//go:embed agents/teamwork.md
var teamworkAgentPrompt string

//go:embed agents/explorer.md
var explorerAgentPrompt string

// AgentConfig defines the configuration for a named agent type.
type AgentConfig struct {
	ID           string   `json:"id"`
	Label        string   `json:"label"`
	SystemPrompt string   `json:"systemPrompt"`
	ToolScope    []string `json:"toolScope"`
}

// defaultTools are always available to every named agent.
var defaultTools = []string{
	"web_search", "read_file", "list_directory",
	"search_codebase", "write_file", "edit_file",
}

// defaultUntypedScope is the restricted tool set for sub-agents without a
// named AgentType.  Only read-oriented tools — no subagent_run, write_file,
// edit_file, or run_command.
var defaultUntypedScope = []string{
	"web_search", "read_file", "list_directory",
	"search_codebase",
}

// agentRegistry maps agent type IDs to their configurations.
var agentRegistry = map[string]AgentConfig{
	AgentStrategyAuditor: {
		ID:           AgentStrategyAuditor,
		Label:        "Plan Buddy",
		SystemPrompt: strategyAuditorAgentPrompt,
		ToolScope:    append(defaultTools, "subagent_run", "run_command"),
	},
	AgentDebug: {
		ID:           AgentDebug,
		Label:        "Bug Buster",
		SystemPrompt: debugAgentPrompt,
		ToolScope:    append(defaultTools, "subagent_run", "run_command", "write_file", "edit_file"),
	},
	AgentTeamwork: {
		ID:           AgentTeamwork,
		Label:        "Team Work",
		SystemPrompt: teamworkAgentPrompt,
		ToolScope:    append(defaultTools, "subagent_run", "write_file", "edit_file"),
	},
	AgentExplorer: {
		ID:           AgentExplorer,
		Label:        "Explore Task",
		SystemPrompt: explorerAgentPrompt,
		ToolScope:    []string{"search_codebase", "read_file", "list_directory"},
	},
}

// GetAgentConfig returns the config for the given agent type.
// If the type is empty or unknown, it returns the generic sub-agent config
// with a restricted read-only tool scope.
func GetAgentConfig(agentType string) AgentConfig {
	if agentType == "" {
		return AgentConfig{
			ID:           "",
			Label:        "Sub-Agent",
			SystemPrompt: subagentSystemPrompt,
			ToolScope:    defaultUntypedScope,
		}
	}
	cfg, ok := agentRegistry[agentType]
	if !ok {
		return AgentConfig{
			ID:           agentType,
			Label:        agentType,
			SystemPrompt: subagentSystemPrompt,
			ToolScope:    defaultUntypedScope,
		}
	}
	return cfg
}

// ListAgentTypes returns all registered agent type IDs and labels.
func ListAgentTypes() []map[string]string {
	var out []map[string]string
	for _, cfg := range agentRegistry {
		out = append(out, map[string]string{
			"id":    cfg.ID,
			"label": cfg.Label,
		})
	}
	return out
}

// BuildAgentSystemPrompt combines the base sub-agent prompt with an agent-specific prompt.
func BuildAgentSystemPrompt(agentType string) string {
	cfg := GetAgentConfig(agentType)
	if cfg.ID == "" {
		return cfg.SystemPrompt // generic
	}

	var b strings.Builder
	b.WriteString(cfg.SystemPrompt)
	b.WriteString("\n\n---\n\n")
	b.WriteString("## General Rules\n\n")
	b.WriteString("- Call independent operations in parallel.\n")
	b.WriteString("- Prefer dedicated tools over shell commands.\n")
	b.WriteString("- On error: report and move on. Do not retry with alternatives.\n")
	b.WriteString("- For edits: read first, then edit — one read can inform multiple edits.\n")
	b.WriteString("\n")
	b.WriteString("## Search Methodology — Apply to ALL searches\n\n")
	b.WriteString("1. Progressive Narrowing (Broad → Narrow): Start with a wide glob or case-insensitive alternation grep, then narrow based on results. Never guess file locations.\n")
	b.WriteString("2. Reconnaissance Before Action: Run 1-2 broad exploratory calls before constructing a precise query. Calibrate on naming conventions and layout first.\n")
	b.WriteString("3. Use Regex Alternation: Prefer `(pattern1|pattern2|pattern3)` over single literal strings to cover naming variants.\n")
	b.WriteString("4. Search Budget: First 1-2 searches are for calibration. If a search returns nothing useful, widen — don't repeat with synonyms.\n")
	b.WriteString("5. Tool-Use Reflection: After each search call, assess what worked and what the next query should change.\n")
	b.WriteString("6. Penalize Overly Narrow First Queries: Before the first search, ask \"Is this too specific? Could it miss case/naming/file type variations?\" If yes, widen.\n")

	return b.String()
}

// FilterToolScope returns true if the tool is within the agent's allowed scope.
// A nil scope means all tools are allowed.
func FilterToolScope(scope []string, toolName string) bool {
	if scope == nil {
		return true
	}
	for _, s := range scope {
		if s == toolName {
			return true
		}
	}
	return false
}

func init() {
	// Verify all embedded prompts loaded
	for id, cfg := range agentRegistry {
		if cfg.SystemPrompt == "" {
			panic(fmt.Sprintf("agent %s has empty system prompt (embedding failed)", id))
		}
	}
}
