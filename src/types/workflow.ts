export type StepType = 'tool_call' | 'sub_agent' | 'connector' | 'llm' | 'skill' | 'mcp' | 'video_edit';

export interface WorkflowStep {
  id: string;
  type: StepType;
  label: string;
  description?: string;
  config: Record<string, unknown>;
  collapsed: boolean;
  status: 'idle' | 'running' | 'success' | 'error';
  output?: unknown;
  error?: string;
}

export interface Workflow {
  id: string;
  title: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
}

export type WorkflowMode = 'gallery' | 'editor';

export type RunStatus = 'idle' | 'starting' | 'running' | 'paused' | 'complete' | 'failed';

export interface Run {
  id: string;
  name: string;
  systemPrompt: string;
  connectorIds: string[];
  connectorLabels: string[];
  scheduledAt: string;
  status: RunStatus;
  createdAt: number;
  templateId?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  connectorIcons: string[];
  connectorLabels: string[];
  steps: number;
  category: string;
}
