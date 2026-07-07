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
)

//go:embed agents/strategy-auditor.md
var strategyAuditorAgentPrompt string

//go:embed agents/debug.md
var debugAgentPrompt string

//go:embed agents/teamwork.md
var teamworkAgentPrompt string

// AgentConfig defines the configuration for a named agent type.
type AgentConfig struct {
	ID           string   `json:"id"`
	Label        string   `json:"label"`
	SystemPrompt string   `json:"systemPrompt"`
	ToolScope    []string `json:"toolScope"`
}

// defaultTools are always available to every agent.
var defaultTools = []string{
	"web_search", "read_file", "list_directory",
	"grep_files", "glob_files", "write_file", "edit_file",
}

// agentRegistry maps agent type IDs to their configurations.
var agentRegistry = map[string]AgentConfig{
	AgentStrategyAuditor: {
		ID:           AgentStrategyAuditor,
		Label:        "Plan Buddy",
		SystemPrompt: strategyAuditorAgentPrompt,
		ToolScope:    append(defaultTools, "subagent_run", "git_status", "git_log"),
	},
	AgentDebug: {
		ID:           AgentDebug,
		Label:        "Bug Buster",
		SystemPrompt: debugAgentPrompt,
		ToolScope:    append(defaultTools, "subagent_run", "git_status", "git_diff", "git_log", "git_branches", "git_show", "write_file", "edit_file"),
	},
	AgentTeamwork: {
		ID:           AgentTeamwork,
		Label:        "Team Work",
		SystemPrompt: teamworkAgentPrompt,
		ToolScope:    append(defaultTools, "subagent_run", "write_file", "edit_file"),
	},
}

// GetAgentConfig returns the config for the given agent type.
// If the type is empty or unknown, it returns the generic sub-agent config.
func GetAgentConfig(agentType string) AgentConfig {
	if agentType == "" {
		return AgentConfig{
			ID:           "",
			Label:        "Sub-Agent",
			SystemPrompt: subagentSystemPrompt,
			ToolScope:    nil, // all tools
		}
	}
	cfg, ok := agentRegistry[agentType]
	if !ok {
		return AgentConfig{
			ID:           agentType,
			Label:        agentType,
			SystemPrompt: subagentSystemPrompt,
			ToolScope:    nil,
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
