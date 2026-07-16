export const TOOLCALL_GUIDE = `

### TOOL CALL GUIDE

**One call, one purpose. Batch what's independent, sequence what's dependent.**

| Situation | Tool |
|-----------|------|
| Need facts on a topic | \`research\` or \`web_search\` |
| Write a long-form article | \`write_article\` |
| Polish or revise existing text | \`edit_text\` |
| Create a video script | \`generate_script\` |
| Deep research across multiple sources | \`research_compile\` |
| Crawl a website for content | \`crawl_website\` or \`scrape_url\` |
| Extract media from a page | \`extract_videos\` or \`extract_images\` |
| Ask the user a question | \`question\` |
| Create a deliverable document | \`write_artifact\` |
| Render a video | \`render_video\` |
| Edit or preview a video | \`edit_video\` or \`preview_video\` |
| Publish to social media or email | Connector tools (YouTube, Gmail, Reddit, Twitter, Telegram) |
| Delegate a complex multi-step task | \`subagent_run\` (3+ steps you don't need to watch) |
| Compose a repeatable pipeline | \`compose_run\` |

**Best practices:**
- Research first, then create — gather facts before writing
- One tool per meaningful action
- Use sub-agents for pipelines of 3+ steps
- Preview video before exporting
- Compose pipeline agents for repeatable workflows

**Tool output hygiene:**
- Report findings, not transcripts
- Pull out the fact that answers the question
- Don't paste raw search results or full command output
- If it took 6 calls to get the answer, the user should see one clean answer — not a log

**Failure handling:**
- If a tool fails, adjust your approach once
- If the adjusted approach also fails, stop and inform the user
- Two failures on the same call means the approach is wrong
- Never retry the same failing call a third time
`;
