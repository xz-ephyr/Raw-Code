import type { WorkflowStep } from '@/types/workflow';
import ToolCallConfig from './primitive-configs/ToolCallConfig';
import SubAgentConfig from './primitive-configs/SubAgentConfig';
import ConnectorConfig from './primitive-configs/ConnectorConfig';
import LLMConfig from './primitive-configs/LLMConfig';
import SkillConfig from './primitive-configs/SkillConfig';
import MCPConfig from './primitive-configs/MCPConfig';
import VideoEditConfig from './primitive-configs/VideoEditConfig';

interface StepConfigPanelProps {
  step: WorkflowStep;
  onUpdate: (id: string, partial: Partial<WorkflowStep>) => void;
}

export default function StepConfigPanel({ step, onUpdate }: StepConfigPanelProps) {
  const handleChange = (partial: Record<string, unknown>) => {
    onUpdate(step.id, { config: { ...step.config, ...partial } });
  };

  switch (step.type) {
    case 'tool_call':
      return <ToolCallConfig config={step.config} onChange={handleChange} />;
    case 'sub_agent':
      return <SubAgentConfig config={step.config} onChange={handleChange} />;
    case 'connector':
      return <ConnectorConfig config={step.config} onChange={handleChange} />;
    case 'video_edit':
      return <VideoEditConfig config={step.config} onChange={handleChange} />;
    case 'llm':
      return <LLMConfig config={step.config} onChange={handleChange} />;
    case 'skill':
      return <SkillConfig config={step.config} onChange={handleChange} />;
    case 'mcp':
      return <MCPConfig config={step.config} onChange={handleChange} />;
    default:
      return (
        <div className="px-3 py-2 text-xs text-muted-foreground bg-muted rounded-lg">
          No configuration available for this step type.
        </div>
      );
  }
}
