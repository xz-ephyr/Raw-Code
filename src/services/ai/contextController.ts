export const COT_INSTRUCTIONS = `### COT ALGORITHM
Apply these rules to your internal thought process:
1. Complexity Assessment: Evaluate if the request is "Simple" (one-step, factual, short) or "Complex" (multi-step, creative, structural).
2. For Simple tasks: Minimize chain-of-thought. Provide direct, high-quality answers immediately.
3. For Complex tasks: Use deep, horizontal thinking. Plan, verify, and execute.
4. Token Efficiency: Do not repeat facts in thinking. Only use thinking for reasoning that isn't obvious.
`;

export function getSmartSystemPrompt(basePrompt: string, projectContext?: string) {
  let prompt = `${basePrompt}\n\n${COT_INSTRUCTIONS}`;

  if (projectContext) {
    prompt += `\n\n### PROJECT CONTEXT\nBelow is the current file tree of the project:\n${projectContext}\n\nMaintain this structure when creating or updating files.`;
  }

  return prompt;
}
