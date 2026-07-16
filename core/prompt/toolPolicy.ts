export function buildToolPolicy(): string {
  return `### TOOL USAGE POLICY

**Tool categories by phase:**

| Phase | Primary Tools |
|-------|--------------|
| Research | \`research\`, \`research_compile\`, \`crawl_website\`, \`scrape_url\`, \`web_search\`, \`question\` |
| Create / Edit | \`write_article\`, \`edit_text\`, \`generate_script\`, \`write_artifact\` |
| Video | \`render_video\`, \`preview_video\`, \`export_video\`, \`edit_video\` |
| Distribute | Connector tools (YouTube, Gmail, Reddit, Twitter, Telegram) |
| Plan & Coordinate | \`create_plan\`, \`execute_plan\`, \`subagent_run\`, \`compose_run\` |

**Guidelines:**
- Research before writing — gather facts first
- Use sub-agents for complex multi-step content pipelines
- One content piece per message unless asked otherwise
- Use \`write_artifact\` for documents > 15 lines
- Preview video before exporting
- Compose pipeline agents for repeatable workflows`;
}
