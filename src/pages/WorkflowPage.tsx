import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useRunStore } from '@/stores/runStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { RunDashboard } from '@/components/workflow/RunDashboard';
import { ActivityLog } from '@/components/workflow/ActivityLog';
import { TemplateSection } from '@/components/workflow/TemplateSection';
import { RunSynthesisPage } from '@/components/workflow/RunSynthesisPage';
import { WorkflowEditor } from '@/components/workflow/WorkflowEditor';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const VALID_VIEWS = ['dashboard', 'synthesis'] as const;

export const WorkflowPage = () => {
  const navigate = useNavigate();
  const view = useRunStore((s) => s.activeView);
  const activeWorkflowId = useWorkflowStore((s) => s.activeWorkflowId);
  const mode = useWorkflowStore((s) => s.mode);
  const [logExpanded, setLogExpanded] = useState(() => {
    const saved = localStorage.getItem('activity-log-expanded');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('activity-log-expanded', JSON.stringify(logExpanded));
  }, [logExpanded]);

  useEffect(() => {
    if (!VALID_VIEWS.includes(view as typeof VALID_VIEWS[number])) {
      useRunStore.getState().setView('dashboard');
    }
    if (mode === 'editor') {
      useWorkflowStore.getState().setActiveWorkflow(null);
    }
  }, []);

  return (
    <div className="flex-1 bg-background overflow-hidden">
      <div className="mx-auto px-6 py-8 h-full flex flex-col" style={{ maxWidth: 'min(1200px, 100%)' }}>
        <ErrorBoundary>
          {/* Backward compat: old workflow editor */}
          {mode === 'editor' && activeWorkflowId ? (
            <WorkflowEditor workflowId={activeWorkflowId} />
          ) : view === 'dashboard' ? (
            <>
              <div className="shrink-0">
                <div className="flex items-start justify-between mb-6 mt-8">
                  <div>
                    <h1 className="text-2xl font-semibold text-foreground tracking-tight">Workflows</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Build and run multi-step workflows combining tools, agents, and models.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/workflow/create')}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity shrink-0"
                  >
                    <Plus size={15} />
                    create new
                  </button>
                </div>
                <RunDashboard />
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 pb-6">
                <div className="pt-6">
                  <button
                    onClick={() => setLogExpanded((v: boolean) => !v)}
                    className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground/60 hover:bg-muted/30 transition-colors mb-2 px-1.5 py-1 rounded"
                  >
                    <span>Activity Log</span>
                    <span className="text-muted-foreground/30">{logExpanded ? '−' : '+'}</span>
                  </button>
                  {logExpanded && <ActivityLog sessionId={activeWorkflowId ?? undefined} />}
                </div>
                <TemplateSection />
              </div>
            </>
          ) : view === 'synthesis' ? (
            <RunSynthesisPage />
          ) : (
            /* fallback to old editor view */
            <WorkflowListReplacement />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
};

function WorkflowListReplacement() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm gap-2">
      <p>Old workflow list view is no longer available.</p>
      <button
        onClick={() => useRunStore.getState().setView('dashboard')}
        className="underline hover:text-foreground transition-colors"
      >
        Go to new Dashboard
      </button>
    </div>
  );
}
