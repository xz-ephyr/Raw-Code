import { useState, useCallback, useEffect, useRef } from 'react';
import { onEvent } from '@doktor/tool-runtime';
import type { AgentEntry } from '@/types/agent-workspace';

export function useAgentWorkspace() {
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const agentsRef = useRef<AgentEntry[]>([]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    const unsubStart = onEvent('subagent_start', (event) => {
      const entry: AgentEntry = {
        sessionID: event.sessionID,
        agentID: event.agentID,
        parentSessionID: event.payload.parentSessionID as string | undefined,
        task: event.payload.task as string || '',
        status: 'running',
        steps: 0,
        toolCalls: 0,
        startedAt: event.timestamp,
      };
      setAgents((prev) => [entry, ...prev]);
      setActiveAgentId(event.sessionID);
      setIsPanelOpen(true);
    });

    const unsubStep = onEvent('subagent_step', (event) => {
      const sessionID = event.sessionID;
      setAgents((prev) =>
        prev.map((a) =>
          a.sessionID === sessionID
            ? {
                ...a,
                steps: (event.payload.steps as number) ?? a.steps,
                toolCalls: (event.payload.toolCalls as number) ?? a.toolCalls,
              }
            : a,
        ),
      );
    });

    const unsubEnd = onEvent('subagent_end', (event) => {
      const sessionID = event.sessionID;
      setAgents((prev) =>
        prev.map((a) =>
          a.sessionID === sessionID
            ? {
                ...a,
                status: 'complete',
                output: event.payload.text as string || a.output,
                steps: (event.payload.steps as number) ?? a.steps,
                toolCalls: (event.payload.toolCalls as number) ?? a.toolCalls,
                usage: event.payload.usage as { inputTokens: number; outputTokens: number } | undefined,
                endedAt: event.timestamp,
              }
            : a,
        ),
      );
    });

    return () => {
      unsubStart();
      unsubStep();
      unsubEnd();
    };
  }, []);

  const selectAgent = useCallback((sessionID: string) => {
    setActiveAgentId(sessionID);
    setIsPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  const clearAgents = useCallback(() => {
    setAgents([]);
    setActiveAgentId(null);
    setIsPanelOpen(false);
  }, []);

  const activeAgent = activeAgentId
    ? agents.find((a) => a.sessionID === activeAgentId) || null
    : null;

  return {
    agents,
    activeAgentId,
    activeAgent,
    isPanelOpen,
    selectAgent,
    closePanel,
    openPanel,
    clearAgents,
  };
}
