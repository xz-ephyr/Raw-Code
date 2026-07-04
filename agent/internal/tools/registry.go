package tools

import (
	"fmt"
	"sync"

	"github.com/xz-ephyr/raw-code/agent/pkg/api"
)

type Registry struct {
	mu       sync.RWMutex
	tools    map[string]api.ToolDefinition
	handlers map[string]ToolHandler
}

func NewRegistry() *Registry {
	return &Registry{
		tools:    make(map[string]api.ToolDefinition),
		handlers: make(map[string]ToolHandler),
	}
}

func (r *Registry) Register(def api.ToolDefinition, handler ToolHandler) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.tools[def.Name]; exists {
		return fmt.Errorf("tool %q already registered", def.Name)
	}
	r.tools[def.Name] = def
	r.handlers[def.Name] = handler
	return nil
}

func (r *Registry) Get(name string) (api.ToolDefinition, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	def, ok := r.tools[name]
	return def, ok
}

func (r *Registry) GetHandler(name string) (ToolHandler, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	h, ok := r.handlers[name]
	return h, ok
}

func (r *Registry) List() []api.ToolDefinition {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]api.ToolDefinition, 0, len(r.tools))
	for _, def := range r.tools {
		result = append(result, def)
	}
	return result
}

func (r *Registry) ListByCategory(category string) []api.ToolDefinition {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []api.ToolDefinition
	for _, def := range r.tools {
		if def.Category == category {
			result = append(result, def)
		}
	}
	return result
}

func (r *Registry) Remove(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.tools, name)
	delete(r.handlers, name)
}

func (r *Registry) RegisterDefaults() {
	for _, td := range allTools() {
		r.tools[td.Definition.Name] = td.Definition
		r.handlers[td.Definition.Name] = td.Handler
	}
}

func allTools() []ToolDef {
	return []ToolDef{
		webSearchTool(),
		fetchPageTool(),
		imageSearchTool(),
		newsSearchTool(),
		searchDocsTool(),
		codeSearchTool(),
		readFileTool(),
		writeFileTool(),
		editFileTool(),
		listDirectoryTool(),
		findFilesTool(),
		fileStatsTool(),
		countLinesTool(),
		grepFilesTool(),
		gitStatusTool(),
		gitDiffTool(),
		gitLogTool(),
		gitBranchesTool(),
		gitShowTool(),
		runCommandTool(),
		systemInfoTool(),
		listProcessesTool(),
		resolvePathTool(),
		httpRequestTool(),
		checkURLTool(),
	}
}
