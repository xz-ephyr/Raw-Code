# Algorithmic Rules for Tool Usage and Chain-of-Thought

## 1. Minimal and Smart Tool Usage
- **Think before you act**: Always evaluate if a tool call is truly necessary. If the information is already in the context, do not call `read_file`.
- **Batch your thoughts**: Plan multiple steps ahead. If you need to edit three files, mention them in your initial CoT.
- **Read before Edit**: Never assume the content of a file. Always `read_file` before calling `edit_file` or `write_file` unless you just created the file in the same turn.
- **No Over-engineering**: Do not create unnecessary abstractions. Solve the user's problem with the simplest, most direct code possible.

## 2. Chain-of-Thought (CoT) Guidelines
- **User Intent**: Start every response with exactly one sentence clarifying the user's intent.
- **Tool Intent**: If tools are needed, follow the user intent with exactly one sentence describing which tools you will use and why.
- **Conciseness**: The initial CoT (before tools) must NEVER exceed two sentences.
- **Reflective Thinking**: Use the thinking pad to reason through complex logic, but keep the output clean and focused on the objective.

## 3. Tool-Specific Rules
- **read_file**: Only read what you need. If a file is huge, try to use `grep_tool` first to find relevant sections.
- **write_file**: Use for creating new files or when a complete overhaul is more efficient than multiple `edit_file` calls.
- **edit_file**: Preferred for small, targeted changes. Ensure `target_content` is unique and matches exactly.
- **list_dir**: Use to explore project structure when you are unsure where a component or logic lives.
- **grep_tool**: Use to find usage patterns, variable definitions, or specific strings across the codebase.

## 4. Long-Horizon Tasks
- For complex features, break them down into small, verifiable steps.
- Use `write_to_plan` to track progress.
- Verify each step (e.g., by reading the file you just wrote) before moving to the next.
