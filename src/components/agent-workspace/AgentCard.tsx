import React from 'react';
import type { AgentStatus } from '@/types/agent-workspace';

interface AgentCardProps {
  agentID: string;
  task: string;
  status: AgentStatus;
  steps: number;
  toolCalls: number;
  duration?: number;
  output?: string;
  selected?: boolean;
  onClick?: () => void;
}

const AGENT_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  default: {
    label: 'Default',
    color: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  teamwork: {
    label: 'Teamwork',
    color: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
};

function getMeta(agentID: string) {
  return AGENT_META[agentID] || { label: agentID, color: 'from-gray-500/20 to-gray-500/5 border-gray-500/30', icon: AGENT_META.default.icon };
}

function StatusIndicator({ status }: { status: AgentStatus }) {
  if (status === 'running') {
    return (
      <span className="relative inline-flex size-2">
        <span className="absolute inline-flex w-full h-full rounded-full bg-blue-400 opacity-75 animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-blue-400" />
      </span>
    );
  }
  if (status === 'complete') {
    return <span className="inline-block size-2 rounded-full bg-emerald-400" />;
  }
  return <span className="inline-block size-2 rounded-full bg-red-400" />;
}

export const AgentCard = React.memo(function AgentCard({
  agentID,
  task,
  status,
  steps,
  toolCalls,
  duration,
  output,
  selected,
  onClick,
}: AgentCardProps) {
  const meta = getMeta(agentID);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border bg-gradient-to-br ${meta.color} transition-all duration-150 overflow-hidden ${
        selected ? 'ring-1 ring-white/20' : 'hover:brightness-110'
      }`}
    >
      <div className="p-3 flex items-start gap-3">
        <div className="size-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0 text-white/70">
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white/80">{meta.label}</span>
            <StatusIndicator status={status} />
            <span className="text-[10px] uppercase tracking-wider text-white/30 ml-auto">
              {status}
            </span>
          </div>
          <p className="text-[11px] text-white/50 truncate mt-1">{task}</p>
          <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-white/40">
            {steps > 0 && <span>{steps} step{steps !== 1 ? 's' : ''}</span>}
            {toolCalls > 0 && <span>{toolCalls} call{toolCalls !== 1 ? 's' : ''}</span>}
            {duration !== undefined && <span>{duration}s</span>}
          </div>
        </div>
      </div>
      {output && (
        <div className="px-3 pb-3">
          <div className="text-[11px] text-white/40 leading-relaxed line-clamp-3 border-t border-white/[0.06] pt-2">
            {output}
          </div>
        </div>
      )}
    </button>
  );
});
