export const COT_INSTRUCTIONS = `### THINKING GUIDELINES
1. Be decisive: For simple requests, decide and act immediately without internal deliberation.
2. Think only when necessary: Use thinking for planning, analysis, and verification only. Skip it for straightforward tasks.
3. No verbose thinking: Keep thinking brief and to the point. One or two sentences is enough for most cases.
4. No code or content in thinking: Never put code, file content, or artifact data in thinking. Put all generated content in tool calls or response text.
5. Professional output: Always produce clean, organized, and professional markdown responses.
`;

export function getSmartSystemPrompt(basePrompt: string, projectContext?: string) {
  let prompt = `${basePrompt}\n\n${COT_INSTRUCTIONS}`;

  if (projectContext) {
    prompt += `\n\n### PROJECT CONTEXT\n${projectContext}\n\nYou are working inside this project. Use the file tools to read, create, and edit files relative to the project root.`;
  } else {
    prompt += `\n\n### CHAT MODE\nYou are in a general chat conversation. You do NOT have access to a file system. You can use write_file to create shareable artifacts, but you CANNOT use list_dir or grep_tool as there is no project to search.`;
  }

  return prompt;
}
