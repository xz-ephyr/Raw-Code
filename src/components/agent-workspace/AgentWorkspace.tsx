import React from 'react';
import type { AgentEntry } from '@/types/agent-workspace';
import { AgentCard } from './AgentCard';

interface AgentWorkspaceProps {
  agents: AgentEntry[];
  activeAgent: AgentEntry | null;
  onClose: () => void;
  onSelectAgent: (sessionID: string) => void;
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AgentsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const runningCount = (agents: AgentEntry[]) => agents.filter((a) => a.status === 'running').length;

export const AgentWorkspace = React.memo(function AgentWorkspace({
  agents,
  activeAgent,
  onClose,
  onSelectAgent,
}: AgentWorkspaceProps) {
  return (
    <div className="flex-1 flex flex-col h-full" style={{ backgroundColor: '#080808' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0 min-h-[49px]">
        <div className="flex items-center gap-2">
          <span className="text-white/50">
            <AgentsIcon />
          </span>
          <span className="text-[13px] font-medium text-white/70 tracking-wide">Agents</span>
          {agents.length > 0 && (
            <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
              {agents.length}
            </span>
          )}
          {runningCount(agents) > 0 && (
            <span className="text-[10px] text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded-full animate-pulse">
              {runningCount(agents)} active
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-auto thin-scrollbar">
        {activeAgent ? (
          <div className="p-3 space-y-3">
            <AgentCard
              agentID={activeAgent.agentID}
              task={activeAgent.task}
              status={activeAgent.status}
              steps={activeAgent.steps}
              toolCalls={activeAgent.toolCalls}
              duration={activeAgent.endedAt ? Math.round((activeAgent.endedAt - activeAgent.startedAt) / 1000) : undefined}
              output={activeAgent.output}
              selected
              onClick={() => onSelectAgent(activeAgent.sessionID)}
            />
            {activeAgent.usage && (
              <div className="flex items-center gap-3 text-[10px] text-white/30 border-t border-white/[0.06] pt-3 mx-1">
                <span>Tokens: {activeAgent.usage.inputTokens} in / {activeAgent.usage.outputTokens} out</span>
              </div>
            )}
            {agents.filter((a) => a.sessionID !== activeAgent.sessionID).length > 0 && (
              <>
                <div className="text-[10px] text-white/20 uppercase tracking-wider font-medium mx-1 mt-4">
                  Other agents
                </div>
                <div className="space-y-2">
                  {agents.filter((a) => a.sessionID !== activeAgent.sessionID).map((agent) => (
                    <AgentCard
                      key={agent.sessionID}
                      agentID={agent.agentID}
                      task={agent.task}
                      status={agent.status}
                      steps={agent.steps}
                      toolCalls={agent.toolCalls}
                      duration={agent.endedAt ? Math.round((agent.endedAt - agent.startedAt) / 1000) : undefined}
                      onClick={() => onSelectAgent(agent.sessionID)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : agents.length > 0 ? (
          <div className="p-3 space-y-2">
            {agents.map((agent) => (
              <AgentCard
                key={agent.sessionID}
                agentID={agent.agentID}
                task={agent.task}
                status={agent.status}
                steps={agent.steps}
                toolCalls={agent.toolCalls}
                duration={agent.endedAt ? Math.round((agent.endedAt - agent.startedAt) / 1000) : undefined}
                onClick={() => onSelectAgent(agent.sessionID)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
            <span className="text-white/10">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <p className="text-[12px] text-white/20 text-center leading-relaxed">
              Agent activity will appear here<br />when agents are running
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
