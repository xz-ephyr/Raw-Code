import { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { Message01Icon, Brain01Icon, Bug01Icon } from '@hugeicons/core-free-icons';
import { useRunStore, type Run } from '@/stores/runStore';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';
import { ActivityLog } from '@/components/workflow/ActivityLog';

type Tab = 'timeline' | 'mindmap' | 'inspection';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'timeline', label: 'Timeline', icon: Message01Icon },
  { key: 'mindmap', label: 'Mind Map', icon: Brain01Icon },
  { key: 'inspection', label: 'Inspection', icon: Bug01Icon },
];



const MOCK_MESSAGES: { role: 'user' | 'assistant'; text: string }[] = [
  { role: 'user', text: 'Modify the email campaign to target a technical audience.' },
  { role: 'assistant', text: 'Updated the system prompt to use technical language. The Gmail connector will now send developer-oriented content.\n\n**Changes applied:**\n- Tone adjusted to technical/professional\n- Jargon and API references added\n- Follow-up sequence shortened to 2 days' },
  { role: 'user', text: 'Add a Slack notification after sending.' },
  { role: 'assistant', text: 'Added a Slack connector step after the Gmail send. The run will now post a confirmation with open/click stats to #email-reports.' },
];

const MOCK_RUNS: { id: string; label: string; status: 'success' | 'error' | 'running'; parent?: string }[] = [
  { id: 'r1', label: 'Email Campaign', status: 'success' },
  { id: 'r2', label: 'Content Generation', status: 'running', parent: 'r1' },
  { id: 'r3', label: 'Gmail Send', status: 'success', parent: 'r1' },
  { id: 'r4', label: 'Analytics Fetch', status: 'error', parent: 'r1' },
  { id: 'r5', label: 'Slack Notification', status: 'pending' as any, parent: 'r3' },
];

function TimelineTab({ run }: { run: Run }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user' as const, text: input.trim() }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant' as const, text: `I've processed your request for run "${run.name}". Changes have been applied to the execution plan.` }]);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4 thin-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-foreground text-background rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            }`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Modify this run using natural language..."
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-sidebar text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MindMapTab(_props: { run: Run }) {
  const children = MOCK_RUNS.filter((r) => r.parent);
  const roots = MOCK_RUNS.filter((r) => !r.parent);

  return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-8">
        {/* Root node */}
        <div className="flex items-center gap-8">
          {roots.map((r) => (
            <div key={r.id} className="flex flex-col items-center gap-1">
              <div className={`px-4 py-2 rounded-xl border text-sm font-medium ${
                r.status === 'running' ? 'border-blue-400 bg-blue-400/10 text-blue-300' :
                r.status === 'success' ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300' :
                'border-red-400 bg-red-400/10 text-red-300'
              }`}>
                {r.label}
              </div>
              <span className="text-[10px] text-muted-foreground">{r.status}</span>
            </div>
          ))}
        </div>

        {/* Connector line */}
        <div className="w-px h-6 bg-border" />

        {/* Children row */}
        <div className="flex items-center gap-6">
          {children.map((r) => (
            <div key={r.id} className="flex flex-col items-center gap-1 relative">
              <div className="w-px h-4 bg-border absolute -top-4" />
              <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                r.status === 'running' ? 'border-blue-400 bg-blue-400/10 text-blue-300' :
                r.status === 'success' ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300' :
                r.status === 'error' ? 'border-red-400 bg-red-400/10 text-red-300' :
                'border-border bg-muted text-muted-foreground'
              }`}>
                {r.label}
              </div>
              <span className="text-[10px] text-muted-foreground">{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InspectionTab({ run }: { run: Run }) {
  return (
    <div className="p-4 space-y-3 h-full overflow-y-auto thin-scrollbar">
      <ActivityLog sessionId={run.id} />
    </div>
  );
}

export function RunSynthesisPage() {
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const run = useRunStore((s) => s.runs.find((r) => r.id === s.activeRunId));
  const setView = useRunStore((s) => s.setView);

  if (!run) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No run selected. <button onClick={() => setView('dashboard')} className="underline ml-1 hover:text-foreground">Go back.</button>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{run.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                run.status === 'running' || run.status === 'starting' ? 'bg-blue-400/10 text-blue-400' :
                run.status === 'complete' ? 'bg-emerald-400/10 text-emerald-400' :
                run.status === 'paused' ? 'bg-orange-400/10 text-orange-400' :
                'bg-muted text-muted-foreground'
              }`}>{run.status}</span>
              <span className="text-[11px] text-muted-foreground">{run.connectors.length} connectors</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border mb-0 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <HugeiconRenderer icon={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 border-l border-r border-border rounded-b-xl overflow-hidden bg-card">
        {activeTab === 'timeline' && <TimelineTab run={run} />}
        {activeTab === 'mindmap' && <MindMapTab run={run} />}
        {activeTab === 'inspection' && <InspectionTab run={run} />}
      </div>
    </div>
  );
}
