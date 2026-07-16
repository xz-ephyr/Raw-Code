import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type RunStatus = 'idle' | 'starting' | 'running' | 'paused' | 'complete';

export interface Run {
  id: string;
  name: string;
  systemPrompt: string;
  connectors: string[];
  scheduledAt: number | null;
  status: RunStatus;
  templateId?: string;
  templateTitle?: string;
  createdAt: number;
  updatedAt: number;
}

export type WorkflowView = 'dashboard' | 'create' | 'synthesis' | 'editor';

function createMockRuns(): Run[] {
  const now = Date.now();
  const day = 86400000;
  return [
    { id: 'mock-1', name: 'Morning Briefing', systemPrompt: 'Summarize team updates from Slack and email.', connectors: ['Slack', 'Gmail'], scheduledAt: null, status: 'running', createdAt: now - 3600000, updatedAt: now - 600000 },
    { id: 'mock-2', name: 'Competitor Analysis', systemPrompt: 'Research top 3 competitors and generate a report.', connectors: [], scheduledAt: null, status: 'running', createdAt: now - 7200000, updatedAt: now - 1200000 },
    { id: 'mock-3', name: 'Social Posts', systemPrompt: 'Create and schedule posts for Twitter and Reddit.', connectors: ['Twitter', 'Reddit'], scheduledAt: null, status: 'idle', createdAt: now - 86400000, updatedAt: now - 86400000 },
    { id: 'mock-4', name: 'Video Digest', systemPrompt: 'Check YouTube channels and summarize new uploads.', connectors: ['YouTube'], scheduledAt: null, status: 'paused', createdAt: now - 172800000, updatedAt: now - 86400000 },
    { id: 'mock-5', name: 'Weekly Report', systemPrompt: 'Compile weekly analytics into a PDF report.', connectors: [], scheduledAt: null, status: 'complete', createdAt: now - 3 * day, updatedAt: now - 2 * day },
    { id: 'mock-6', name: 'Email Campaign', systemPrompt: 'Draft and send promotional email campaign.', connectors: ['Gmail'], scheduledAt: null, status: 'complete', createdAt: now - 4 * day, updatedAt: now - 3 * day },
    { id: 'mock-7', name: 'Repo Monitor', systemPrompt: 'Watch github.com/org/repo for new issues and PRs.', connectors: ['GitHub'], scheduledAt: null, status: 'complete', createdAt: now - 5 * day, updatedAt: now - 4 * day },
    { id: 'mock-8', name: 'Research Report', systemPrompt: 'Research latest AI trends and compile findings.', connectors: [], scheduledAt: null, status: 'starting', createdAt: now - 1800000, updatedAt: now - 300000 },
    { id: 'mock-9', name: 'Slack Digest', systemPrompt: 'Summarize Slack channels and deliver briefing.', connectors: ['Slack'], scheduledAt: null, status: 'complete', createdAt: now - 6 * day, updatedAt: now - 5 * day },
    { id: 'mock-10', name: 'Blog Post', systemPrompt: 'Write a blog post about the new features.', connectors: [], scheduledAt: null, status: 'idle', createdAt: now - 300000, updatedAt: now - 300000 },
    { id: 'mock-11', name: 'Data Pipeline', systemPrompt: 'Extract, transform, and load sales data.', connectors: [], scheduledAt: null, status: 'running', createdAt: now - 5400000, updatedAt: now - 120000 },
    { id: 'mock-12', name: 'News Briefing', systemPrompt: 'Scrape top news sites and summarize headlines.', connectors: [], scheduledAt: null, status: 'complete', createdAt: now - 2 * day, updatedAt: now - day },
  ];
}

interface RunState {
  runs: Run[];
  activeView: WorkflowView;
  activeRunId: string | null;

  setView: (view: WorkflowView) => void;
  createRun: (run: Omit<Run, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => string;
  updateRun: (id: string, patch: Partial<Run>) => void;
  deleteRun: (id: string) => void;
  setActiveRun: (id: string | null) => void;
}

export const useRunStore = create<RunState>()(
  persist(
    (set) => ({
      runs: createMockRuns(),
      activeView: 'dashboard',
      activeRunId: null,

      setView: (view) => set({ activeView: view }),

      createRun: (data) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const run: Run = {
          ...data,
          id,
          status: 'idle',
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          runs: [...state.runs, run],
          activeRunId: id,
          activeView: 'synthesis',
        }));
        return id;
      },

      updateRun: (id, patch) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r
          ),
        })),

      deleteRun: (id) =>
        set((state) => ({
          runs: state.runs.filter((r) => r.id !== id),
          activeRunId: state.activeRunId === id ? null : state.activeRunId,
        })),

      setActiveRun: (id) => set({ activeRunId: id }),
    }),
    {
      name: 'doktor-run-store',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted: any, current: RunState) => ({
        ...current,
        ...persisted,
        runs: persisted?.runs?.length > 0 ? persisted.runs : current.runs,
      }),
    }
  )
);
