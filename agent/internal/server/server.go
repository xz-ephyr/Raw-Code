package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"github.com/xz-ephyr/raw-code/agent/internal/agent"
	"github.com/xz-ephyr/raw-code/agent/internal/infra"
	"github.com/xz-ephyr/raw-code/agent/internal/model"
	"github.com/xz-ephyr/raw-code/agent/internal/task"
	"github.com/xz-ephyr/raw-code/agent/internal/tool"
	"github.com/xz-ephyr/raw-code/agent/internal/worker"
	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type Server struct {
	router       *mux.Router
	http         *http.Server
	taskManager  *task.Manager
	toolRegistry *tool.Registry
	executor     *tool.Executor
	pool         *worker.Pool
	orchestrator *agent.Orchestrator
	express      *infra.ExpressClient
	tauri        *infra.TauriShell
	modelClient  model.ModelProvider
	apiKey       string
	startTime    time.Time
	workerCount  int
}

func New(
	tm *task.Manager,
	reg *tool.Registry,
	exec *tool.Executor,
	pool *worker.Pool,
	orch *agent.Orchestrator,
	exp *infra.ExpressClient,
	ts *infra.TauriShell,
	mc model.ModelProvider,
	apiKey string,
	workerCount int,
) *Server {
	s := &Server{
		router:       mux.NewRouter(),
		taskManager:  tm,
		toolRegistry: reg,
		executor:     exec,
		pool:         pool,
		orchestrator: orch,
		express:      exp,
		tauri:        ts,
		modelClient:  mc,
		apiKey:       apiKey,
		startTime:    time.Now(),
		workerCount:  workerCount,
	}
	s.registerRoutes()
	return s
}

func (s *Server) Handler() http.Handler {
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})
	return c.Handler(s.router)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.Handler().ServeHTTP(w, r)
}

func (s *Server) Listen(addr string) *http.Server {
	s.http = &http.Server{
		Addr:         addr,
		Handler:      s.Handler(),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 5 * time.Minute,
	}
	return s.http
}

func (s *Server) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.apiKey != "" && r.Header.Get("x-api-key") != s.apiKey {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		next(w, r)
	}
}

func (s *Server) registerRoutes() {
	s.router.HandleFunc("/health", s.handleHealth).Methods("GET")
	s.router.HandleFunc("/api/tools", s.handleListTools).Methods("GET")
	s.router.HandleFunc("/api/tasks", s.auth(s.handleSubmitTask)).Methods("POST")
	s.router.HandleFunc("/api/tasks/{id}", s.handleGetTask).Methods("GET")
	s.router.HandleFunc("/api/tasks/{id}/cancel", s.auth(s.handleCancelTask)).Methods("POST")
	s.router.HandleFunc("/api/tasks", s.handleListTasks).Methods("GET")
	s.router.HandleFunc("/api/clis", s.handleDetectCLIs).Methods("GET")
	s.router.HandleFunc("/api/clis/{name}", s.handleCLIInfo).Methods("GET")
	s.router.HandleFunc("/api/chat", s.auth(s.handleChatProxy)).Methods("POST")
	s.router.HandleFunc("/api/workflows", s.handleListWorkflows).Methods("GET")
	s.router.HandleFunc("/api/tools/execute", s.auth(s.handleExecuteTool)).Methods("POST")
	s.router.HandleFunc("/api/agents", s.handleListAgents).Methods("GET")
	s.router.HandleFunc("/api/chat/stream", s.auth(s.handleChatStream)).Methods("POST")
	s.router.HandleFunc("/api/chat/completion", s.auth(s.handleChatCompletion)).Methods("POST")
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Failed to encode JSON response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	uptime := time.Since(s.startTime).Round(time.Second).String()

	expressOK := true
	if err := s.express.HealthCheck(r.Context()); err != nil {
		expressOK = false
	}

	writeJSON(w, http.StatusOK, api.HealthResponse{
		Status:    "ok",
		Version:   "0.1.0",
		Uptime:    uptime,
		Workers:   s.workerCount,
		TasksInQ:  s.taskManager.QueueLength(),
		ExpressOK: expressOK,
	})
}

func (s *Server) handleListTools(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	var tools []api.ToolDefinition
	if category != "" {
		tools = s.toolRegistry.ListByCategory(category)
	} else {
		tools = s.toolRegistry.List()
	}
	writeJSON(w, http.StatusOK, map[string]any{"tools": tools, "count": len(tools)})
}

func (s *Server) handleSubmitTask(w http.ResponseWriter, r *http.Request) {
	var req api.TaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Prompt == "" {
		writeError(w, http.StatusBadRequest, "prompt is required")
		return
	}
	if req.Type == "" {
		req.Type = "direct"
	}
	if req.MaxSteps <= 0 {
		req.MaxSteps = 6
	}

	t := s.orchestrator.SubmitTask(req)
	writeJSON(w, http.StatusAccepted, map[string]any{
		"taskId": t.ID,
		"status": t.Status,
	})
}

func (s *Server) handleGetTask(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	t, ok := s.taskManager.Get(id)
	if !ok {
		writeError(w, http.StatusNotFound, "task not found")
		return
	}
	writeJSON(w, http.StatusOK, t.ToAPI())
}

func (s *Server) handleCancelTask(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	s.taskManager.Cancel(id)
	writeJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

func (s *Server) handleListTasks(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("sessionId")
	var tasks []*task.Task
	if sessionID != "" {
		tasks = s.taskManager.ListBySession(sessionID)
	} else {
		tasks = s.taskManager.List()
	}

	apiTasks := make([]api.AgentTask, len(tasks))
	for i, t := range tasks {
		apiTasks[i] = t.ToAPI()
	}

	writeJSON(w, http.StatusOK, map[string]any{"tasks": apiTasks, "count": len(apiTasks)})
}

func (s *Server) handleDetectCLIs(w http.ResponseWriter, r *http.Request) {
	clis := s.tauri.DetectCLIs()
	writeJSON(w, http.StatusOK, map[string]any{"clis": clis, "count": len(clis)})
}

func (s *Server) handleCLIInfo(w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]
	info := s.tauri.GetCLIInfo(name)
	writeJSON(w, http.StatusOK, info)
}

func (s *Server) handleChatProxy(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionID string `json:"sessionId"`
		Message   string `json:"message"`
		AgentType string `json:"agentType"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Delegate the message as a task to the orchestrator
	taskReq := api.TaskRequest{
		SessionID: req.SessionID,
		Type:      "delegate",
		Prompt:    req.Message,
		MaxSteps:  10,
		AgentType: req.AgentType,
	}

	t := s.orchestrator.SubmitTask(taskReq)
	writeJSON(w, http.StatusAccepted, map[string]any{
		"taskId": t.ID,
		"status": t.Status,
	})
}

func (s *Server) handleListWorkflows(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"workflows": []map[string]string{
			{"name": "research_and_summarize", "description": "Search the web and create a summary"},
			{"name": "codebase_audit", "description": "Search codebase for patterns and report findings"},
		},
	})
}

func (s *Server) handleListAgents(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"agents": agent.ListAgentTypes(),
		"count":  len(agent.ListAgentTypes()),
	})
}

func (s *Server) handleExecuteTool(w http.ResponseWriter, r *http.Request) {
	// Limit request body to 10MB to prevent OOM
	r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024)

	var req struct {
		Tool   string         `json:"tool"`
		Params map[string]any `json:"params"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Tool == "" {
		writeError(w, http.StatusBadRequest, "tool name is required")
		return
	}

	call := api.ToolCall{
		Tool:   req.Tool,
		Params: req.Params,
	}

	// Verify tool existence before execution for proper 404 response
	if _, ok := s.toolRegistry.GetHandler(req.Tool); !ok {
		writeError(w, http.StatusNotFound, "unknown tool: "+req.Tool)
		return
	}

	result := s.executor.Execute(r.Context(), call)

	if result.Error != "" {
		// Map internal execution errors to 500 or 400 if it was a validation error
		// For now keeping it simple with 500 for execution failures
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"error":  result.Error,
			"result": nil,
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"error":      nil,
		"result":     result.Result,
		"durationMs": result.Duration,
	})
}

func (s *Server) handleChatStream(w http.ResponseWriter, r *http.Request) {
	if s.modelClient == nil {
		writeError(w, http.StatusServiceUnavailable, "model client not configured")
		return
	}

	var req api.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.Messages) == 0 {
		writeError(w, http.StatusBadRequest, "messages are required")
		return
	}

	if req.Model == "" {
		req.Model = s.modelClient.Model()
	}

	toolDefs := agent.ToolsToModelDefinitions(s.toolRegistry.List())

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	modelMsgs := make([]model.Message, len(req.Messages))
	for i, msg := range req.Messages {
		m := model.Message{Role: msg.Role, Content: msg.Content, ToolCallID: msg.ToolCallID}
		if len(msg.ToolCalls) > 0 {
			m.ToolCalls = make([]model.ToolCall, len(msg.ToolCalls))
			for j, tc := range msg.ToolCalls {
				args := ""
				if tc.Params != nil {
					argsBytes, _ := json.Marshal(tc.Params)
					args = string(argsBytes)
				}
				m.ToolCalls[j] = model.ToolCall{
					ID:   tc.ID,
					Type: "function",
					Function: model.ToolCallFunction{
						Name:      tc.Tool,
						Arguments: args,
					},
				}
			}
		}
		modelMsgs[i] = m
	}

	if err := s.modelClient.ChatCompletionStream(r.Context(), model.ChatRequest{
		Messages: modelMsgs,
		Tools:    toolDefs,
		Stream:   true,
	}, func(chunk model.StreamChunk) {
		event := api.StreamEvent{Type: "chunk", Content: chunk.Content}
		if chunk.FinishReason != "" {
			event.Type = "done"
			event.Done = true
		}
		if chunk.Error != "" {
			event.Type = "error"
			event.Error = chunk.Error
		}
		data, _ := json.Marshal(event)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}); err != nil {
		event := api.StreamEvent{Type: "error", Error: err.Error()}
		data, _ := json.Marshal(event)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}
}

func (s *Server) handleChatCompletion(w http.ResponseWriter, r *http.Request) {
	if s.modelClient == nil {
		writeError(w, http.StatusServiceUnavailable, "model client not configured")
		return
	}

	var req api.ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.Messages) == 0 {
		writeError(w, http.StatusBadRequest, "messages are required")
		return
	}

	if req.Model == "" {
		req.Model = s.modelClient.Model()
	}

	toolDefs := agent.ToolsToModelDefinitions(s.toolRegistry.List())

	modelMsgs := make([]model.Message, len(req.Messages))
	for i, msg := range req.Messages {
		m := model.Message{Role: msg.Role, Content: msg.Content, ToolCallID: msg.ToolCallID}
		if len(msg.ToolCalls) > 0 {
			m.ToolCalls = make([]model.ToolCall, len(msg.ToolCalls))
			for j, tc := range msg.ToolCalls {
				args := ""
				if tc.Params != nil {
					argsBytes, _ := json.Marshal(tc.Params)
					args = string(argsBytes)
				}
				m.ToolCalls[j] = model.ToolCall{
					ID:   tc.ID,
					Type: "function",
					Function: model.ToolCallFunction{
						Name:      tc.Tool,
						Arguments: args,
					},
				}
			}
		}
		modelMsgs[i] = m
	}

	resp, err := s.modelClient.ChatCompletion(r.Context(), model.ChatRequest{
		Messages: modelMsgs,
		Tools:    toolDefs,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	apiResp := api.ChatResponse{
		FinishReason: resp.FinishReason,
		Message: api.ChatMessage{
			Role:    "assistant",
			Content: resp.Content,
		},
	}

	for _, tc := range resp.ToolCalls {
		var params map[string]any
		json.Unmarshal([]byte(tc.Function.Arguments), &params)
		apiResp.Message.ToolCalls = append(apiResp.Message.ToolCalls, api.ToolCall{
			ID:     tc.ID,
			Tool:   tc.Function.Name,
			Params: params,
		})
	}

	writeJSON(w, http.StatusOK, apiResp)
}
