import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
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

const STEP_META: Record<StepType, { label: string; description: string; color: string }> = {
  tool_call: { label: 'Tool Call', description: 'Invoke a registered tool', color: 'bg-blue-500/10 text-blue-400' },
  sub_agent: { label: 'Sub-agent', description: 'Spawn an autonomous agent', color: 'bg-purple-500/10 text-purple-400' },
  connector: { label: 'Connector', description: 'Use an external service', color: 'bg-green-500/10 text-green-400' },
  video_edit: { label: 'Video Edit', description: 'Run FFmpeg pipeline', color: 'bg-pink-500/10 text-pink-400' },
  llm: { label: 'LLM', description: 'Configure a model call', color: 'bg-amber-500/10 text-amber-400' },
  skill: { label: 'Skill', description: 'Enable a capability pack', color: 'bg-orange-500/10 text-orange-400' },
  mcp: { label: 'MCP', description: 'Connect to an MCP server', color: 'bg-teal-500/10 text-teal-400' },
};

const STEP_ORDER: StepType[] = ['tool_call', 'sub_agent', 'connector', 'llm', 'skill', 'mcp', 'video_edit'];

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
      <div className="mx-auto pt-8 pb-12" style={{ maxWidth: '800px' }}>
        <div className="relative mb-8">
          <button
            onClick={() => navigate('/workflow')}
            className="absolute flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            style={{ right: 'calc(100% + 24px)', top: '4px' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <h1 className="text-xl font-semibold text-foreground mb-1">Create New Run</h1>
          <p className="text-sm text-muted-foreground">
            Configure your automation run and save it for execution.
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Briefing"
              className="w-full px-4 py-3 rounded-[6px] border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-purple-500/40 transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Describe what this run should do..."
              rows={4}
              className="w-full px-4 py-3 rounded-[6px] border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-purple-500/40 transition-shadow resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-foreground">Steps</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStepPicker(!showStepPicker)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[6px] border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  + Add Step
                </button>
                {showStepPicker && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-[6px] shadow-xl shadow-black/20 z-50 py-1">
                    {availableStepTypes.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">All step types added</div>
                    ) : (
                      availableStepTypes.map((type) => {
                        const meta = STEP_META[type];
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => { setSteps((prev) => [...prev, type]); setShowStepPicker(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted"
                          >
                            <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0 text-xs font-bold uppercase ${meta.color}`}>
                              {meta.label[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-foreground">{meta.label}</div>
                              <div className="text-xs text-muted-foreground truncate">{meta.description}</div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
            {steps.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border rounded-[6px] bg-card">
                No steps yet — add one to define what this run does
              </p>
            ) : (
              <div className="rounded-[6px] border border-border bg-card divide-y divide-border overflow-hidden">
                {steps.map((type, i) => {
                  const meta = STEP_META[type];
                  return (
                    <div
                      key={`${type}-${i}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 text-xs font-bold uppercase ${meta.color}`}>
                        {meta.label[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">{meta.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{meta.description}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                        className="p-1 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Connectors</label>
            <ConnectorSelector options={CONNECTOR_OPTIONS} selected={connectors} onChange={setConnectors} />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Schedule</label>
            <DateTimePicker value={scheduledAt} onChange={setScheduledAt} />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-[6px] bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={16} />
            Save &amp; Continue
          </button>
        </form>
      </div>
    </div>
  );
}
