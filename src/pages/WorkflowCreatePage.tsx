import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, Plus, Zap, Bot, Plug, Film, Brain, Package, Server, ChevronRight } from 'lucide-react';
import { useRunStore } from '@/stores/runStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { ConnectorSelector, type ConnectorOption } from '@/components/workflow/ConnectorSelector';
import { DateTimePicker } from '@/components/workflow/DateTimePicker';
import { CONNECTOR_ICONS, CONNECTOR_BRAND_COLORS } from '@/components/chat/connectorMentions';
import type { StepType } from '@/types/workflow';

const CONNECTOR_KEYS = Object.keys(CONNECTOR_ICONS);
const CONNECTOR_OPTIONS: ConnectorOption[] = CONNECTOR_KEYS.map((key) => ({
  key,
  label: key,
  icon: CONNECTOR_ICONS[key],
  color: CONNECTOR_BRAND_COLORS[key]?.color ?? '#888',
}));

type StepMeta = {
  label: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  badge: string;
};

const STEP_META: Record<StepType, StepMeta> = {
  tool_call: {
    label: 'Tool Call',
    description: 'Invoke a registered tool',
    icon: <Zap size={14} />,
    gradient: 'from-blue-500/20 to-blue-600/10',
    badge: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  },
  sub_agent: {
    label: 'Sub-agent',
    description: 'Spawn an autonomous agent',
    icon: <Bot size={14} />,
    gradient: 'from-purple-500/20 to-purple-600/10',
    badge: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  },
  connector: {
    label: 'Connector',
    description: 'Use an external service',
    icon: <Plug size={14} />,
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  },
  video_edit: {
    label: 'Video Edit',
    description: 'Run FFmpeg pipeline',
    icon: <Film size={14} />,
    gradient: 'from-pink-500/20 to-pink-600/10',
    badge: 'bg-pink-500/15 text-pink-400 border border-pink-500/20',
  },
  llm: {
    label: 'LLM',
    description: 'Configure a model call',
    icon: <Brain size={14} />,
    gradient: 'from-amber-500/20 to-amber-600/10',
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  },
  skill: {
    label: 'Skill',
    description: 'Enable a capability pack',
    icon: <Package size={14} />,
    gradient: 'from-orange-500/20 to-orange-600/10',
    badge: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  },
  mcp: {
    label: 'MCP',
    description: 'Connect to an MCP server',
    icon: <Server size={14} />,
    gradient: 'from-teal-500/20 to-teal-600/10',
    badge: 'bg-teal-500/15 text-teal-400 border border-teal-500/20',
  },
};

const STEP_ORDER: StepType[] = ['tool_call', 'sub_agent', 'connector', 'llm', 'skill', 'mcp', 'video_edit'];

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
      {children}
    </label>
  );
}

export function WorkflowCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [connectors, setConnectors] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<number | null>(null);
  const [steps, setSteps] = useState<StepType[]>([]);
  const [showStepPicker, setShowStepPicker] = useState(false);

  const createRun = useRunStore((s) => s.createRun);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);
  const addStep = useWorkflowStore((s) => s.addStep);

  const availableStepTypes = STEP_ORDER.filter((t) => !steps.includes(t));

  const handleSave = () => {
    if (!name.trim()) return;
    const workflowId = createWorkflow();
    for (const type of steps) {
      addStep(workflowId, type);
    }
    createRun({
      name: name.trim(),
      systemPrompt: systemPrompt.trim(),
      connectors,
      scheduledAt,
    });
    navigate('/workflow');
  };

  return (
    <div className="flex-1 bg-background overflow-y-auto thin-scrollbar">
      {/* Subtle ambient gradient */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 70% 10%, oklch(0.45 0.18 280 / 0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto px-6 pt-10 pb-16" style={{ maxWidth: '720px' }}>

        {/* Back button */}
        <button
          onClick={() => navigate('/workflow')}
          className="group mb-8 flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          Back to workflows
        </button>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1.5">
            Create workflow
          </h1>
          <p className="text-sm text-muted-foreground/70">
            Configure an automation run — define steps, connect services, and set a schedule.
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSave(); }}
          className="space-y-3"
        >
          {/* Title */}
          <SectionCard>
            <FieldLabel>Title</FieldLabel>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Briefing"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
              style={{ caretColor: 'oklch(0.65 0.2 280)' }}
              autoFocus
            />
            {/* Animated underline */}
            <div className="mt-2 h-px w-full rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  background: name
                    ? 'linear-gradient(90deg, oklch(0.55 0.22 280), oklch(0.6 0.2 260))'
                    : 'oklch(1 0 0 / 0.07)',
                  width: name ? '100%' : '100%',
                }}
              />
            </div>
          </SectionCard>

          {/* System Prompt */}
          <SectionCard>
            <FieldLabel>System Prompt</FieldLabel>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Describe what this workflow should do…"
              rows={4}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none resize-none leading-relaxed"
              style={{ caretColor: 'oklch(0.65 0.2 280)' }}
            />
            <div className="mt-2 h-px w-full rounded-full bg-white/[0.07]" />
          </SectionCard>

          {/* Steps */}
          <SectionCard>
            <div className="flex items-center justify-between mb-3">
              <FieldLabel>Steps</FieldLabel>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStepPicker(!showStepPicker)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide rounded-lg border border-dashed border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
                >
                  <Plus size={11} />
                  Add Step
                </button>

                {showStepPicker && (
                  <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-white/[0.08] bg-[oklch(0.18_0.004_49)] shadow-2xl shadow-black/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    {availableStepTypes.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-muted-foreground">All step types added</div>
                    ) : (
                      availableStepTypes.map((type) => {
                        const meta = STEP_META[type];
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => { setSteps((prev) => [...prev, type]); setShowStepPicker(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                          >
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${meta.badge}`}>
                              {meta.icon}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs font-medium text-foreground">{meta.label}</span>
                              <span className="block text-[11px] text-muted-foreground/60 truncate">{meta.description}</span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {steps.length === 0 ? (
              <button
                type="button"
                onClick={() => setShowStepPicker(true)}
                className="group w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-dashed border-white/[0.07] text-muted-foreground/40 hover:text-muted-foreground/70 hover:border-white/[0.12] transition-all"
              >
                <Plus size={18} className="transition-transform group-hover:scale-110" />
                <span className="text-xs">Add your first step</span>
              </button>
            ) : (
              <div className="space-y-1.5">
                {steps.map((type, i) => {
                  const meta = STEP_META[type];
                  return (
                    <div
                      key={`${type}-${i}`}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r ${meta.gradient} border border-white/[0.05] transition-all`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {/* Step number */}
                      <span className="text-[10px] font-bold text-muted-foreground/40 w-4 shrink-0 text-center select-none">
                        {i + 1}
                      </span>
                      {/* Icon badge */}
                      <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 shadow-sm ${meta.badge}`}>
                        {meta.icon}
                      </span>
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-foreground">{meta.label}</div>
                        <div className="text-[11px] text-muted-foreground/50 truncate">{meta.description}</div>
                      </div>
                      {/* Drag handle hint + remove */}
                      <button
                        type="button"
                        onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-white/[0.06] transition-all"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Connectors */}
          <SectionCard>
            <FieldLabel>Connectors</FieldLabel>
            <ConnectorSelector options={CONNECTOR_OPTIONS} selected={connectors} onChange={setConnectors} />
          </SectionCard>

          {/* Schedule */}
          <SectionCard>
            <FieldLabel>Schedule</FieldLabel>
            <DateTimePicker value={scheduledAt} onChange={setScheduledAt} />
          </SectionCard>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="group relative w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-semibold text-white overflow-hidden transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, oklch(0.52 0.22 280), oklch(0.48 0.22 260))',
                boxShadow: name.trim()
                  ? '0 0 0 1px oklch(0.55 0.22 280 / 0.4), 0 8px 24px oklch(0.45 0.2 280 / 0.35)'
                  : 'none',
              }}
            >
              {/* Shine overlay */}
              <span
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, white/10 0%, transparent 60%)' }}
              />
              <Save size={15} />
              Save & Continue
              <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
