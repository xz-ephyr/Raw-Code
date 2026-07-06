export interface ModeSkill {
  name: string;
  description: string;
  execute: (...args: any[]) => any;
}

export interface Mode {
  id: string;
  label: string;
  icon: string;
  description: string;
  systemPrompt: string;
  skills: ModeSkill[];
  color: string;
}
