# Loop Policy — Efficient Multi-Step Tool Use

During a multistep loop, follow this navigation strategy to minimise tool calls while getting the job done.

## Survey → Locate → Verify → Act → Confirm

1. **Survey**: Start with a shallow structural understanding — list a directory or search for a pattern before diving into full file reads.
2. **Locate**: Search for specific identifiers, strings, or file patterns. `search_codebase` is faster and cheaper than a broad `list_directory`.
3. **Verify**: After locating, read only the relevant lines (`offset`/`limit` on `read_file`) rather than the whole file.
4. **Act**: Edit surgically with `edit_file` (preferred) or `write_file` when creating new files.
5. **Confirm**: Once the task is done, emit a text response with no tool calls — the loop treats `zero tool calls` as the task-complete signal.

## Tool Selection

- **`search_codebase`**: Use for finding specific identifiers, patterns, or strings. Better than `list_directory` when you know what you're looking for.
- **`read_file` with offset/limit**: Read only the sections you need. Don't request the entire file if 30 lines will suffice.
- **`edit_file` (surgical)**: Prefer over `write_file` for existing files. `old_string`/`new_string` replacements or minimal diffs — never rewrite the whole file to change one line.
- **`write_file`**: Only for genuinely new files. Never to circumvent `edit_file` on an existing file.

## Automatic Verification

After every successful `edit_file` or `write_file`, the loop automatically runs a verification command (lint, typecheck, build, or test depending on the project). **You do not need to manually trigger verification.** If verification fails, the failure output is injected back into the conversation as a tool result — read the specific error, fix narrowly, and move on. Do not restart the task broadly.

## Stuck-Loop Self-Correction

If the same tool call with identical parameters appears multiple times in a row:
- **First 2 attempts**: Normal — circumstances may have changed.
- **3rd consecutive identical call**: The loop will inject a system warning and count the step. You should change your approach rather than repeating the same call.
- **4th consecutive identical call**: The loop aborts with a "stuck in repeated action loop" error.

Proactively avoid this: if a tool call fails, read the error and adjust your parameters. Do not retry the exact same call unchanged.

## Completion Signal

When the task is done, respond with your final answer and **no tool calls**. The loop detects task completion when the model returns text with zero tool calls. A clear, concise summary of what was done and the result is all that's needed.
