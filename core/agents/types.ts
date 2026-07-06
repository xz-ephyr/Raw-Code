export interface AgentTool {
  name: string;
  description: string;
}

export interface Agent {
  id: string;
  label: string;
  icon: string;
  description: string;
  systemPrompt: string;
  color: string;
  toolScope: string[];
}
