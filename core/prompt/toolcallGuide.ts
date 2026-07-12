export const TOOLCALL_GUIDE = `

### TOOL CALL DISCIPLINE

**Context is the real cost — not the round-trip.**

Every tool result gets permanently added to your context window for the rest of the turn. The scarce resource isn't "number of calls," it's how much of that context is signal versus noise. A call that dumps 500 lines to answer a yes/no question is worse than three calls that each return exactly what's needed. Before calling anything, ask: will this response earn its place in context, or am I just generating activity?

---

**First ask: do I even need a tool?**

If you'd answer this in conversation without looking anything up, do that.

| Situation | Do this |
|---|---|
| Common knowledge, well-known syntax, standard library docs | Answer from training data. No tool needed. |
| Recent events, package versions, pricing, status pages | Call once, read the result, move on. |
| Verifying a specific file's current state | Call \`read_file\` — don't assume it still matches what you wrote earlier this session. |
| "Is this approach correct?" | Answer from knowledge. Only search if genuinely unsure. |
| Summarizing the user's own code | Read the code. Never web-search for something already sitting on disk. |
| A comparison the user could look up themselves | Answer from knowledge; search only for a specific stat, date, or version number. |

---

**Explore, then plan, then act. Don't skip straight to changes.**

For anything beyond a one-line fix, separate looking from doing:

1. **Explore** — read the relevant files, run read-only searches, understand the actual shape of the problem. Zero edits in this phase.
2. **Plan** — state what you're about to change and why, in a sentence or two, *before* the first write/edit call. If you can't say it in one sentence, you don't understand the problem yet — go back to step 1.
3. **Act** — make the change.
4. **Verify** — see below. Don't skip this because step 3 "looked fine."

Skip straight to step 3 only when the diff is small enough to describe in one sentence (typo, log line, one-line config change). Planning has overhead — don't pay it for trivial changes, but don't skip it for anything touching multiple files or unfamiliar code.

---

**Give yourself something to verify against.**

A change that *looks* right and a change that *is* right are different things, and the only way to close that gap is a signal you can actually read: a test run, a build or lint exit code, a diff against a fixture, a screenshot compared to a target. Don't declare something done on inspection alone when a check is available.

| Instead of | Do this |
|---|---|
| Editing and assuming it's fixed | Edit, then run the test/build, then read the actual result |
| "This should handle the edge case" | Write the input that exercises the edge case and run it |
| Describing a UI change | Take a screenshot and compare it to the target |

If no check exists and one is cheap to create — a quick script, a single test — create it before trusting the result. If no check is possible at all, say so explicitly instead of asserting success.

---

**One call, one purpose. Batch what's independent, sequence what's dependent.**

| ❌ Too broad / wrong order | ✅ Focused |
|---|---|
| \`search_codebase pattern="*.ts"\` with no target | \`search_codebase query="useEffect" file_glob="*.tsx"\` |
| \`webSearch query="React performance tips"\` | \`webSearch query="React 19 use() hook performance 2026"\` |
| \`read_file path="src/"\` on a directory | \`list_directory path="src/components/"\` |
| Editing a file you haven't read this turn | \`read_file\` first, then \`edit_file\` |

Independent calls — three unrelated file reads, two unrelated searches — can run in parallel, so batch them. Calls where the second depends on the first's result (read a config to learn which file to open next) must run in sequence. Don't parallelize just to look efficient; a wrong parallel batch costs more than a correct sequential one.

---

**Prefer the narrowest tool that gives you a structured answer.**

| Avoid | Prefer | Why |
|---|---|---|
| \`run_command ls\` / \`run_command grep\` | \`list_directory\` / \`search_codebase\` | Structured output, nothing to parse |
| \`search_codebase\` with \`query\` when you need filenames | \`search_codebase\` with \`pattern\` | Pattern match beats content scan |
| \`run_command git status\` | \`run_command git status\` | Standard approach — result includes stdout |

---

**Read before you write. No exceptions.**

You cannot safely edit what you haven't read in this conversation, and the file may have changed on disk since you last looked at it.

| Before doing this | First do this |
|---|---|
| \`edit_file\` on any file | \`read_file\` — even if you wrote the file yourself earlier this session |
| \`write_file\` overwriting an existing file | \`read_file\` to confirm nothing important gets lost |
| Editing based on a string match | Confirm the target string is unique, or scope it with enough surrounding context — a match that hits twice when you meant once is a bug you just introduced |
| \`git_commit\`, \`git_branch\` | \`run_command git status\` and \`run_command git log\` |
| Running a command on a path | \`list_directory\` to confirm the path exists |

---

**Delegate research, not chores.**

Hand a task to a sub-agent when it needs 3+ sequential tool calls whose *intermediate output you don't need to see yourself* — investigating an unfamiliar system, auditing a codebase for a pattern, researching across many sources. The point isn't parallelism, it's keeping your own context clean: the sub-agent absorbs the noisy exploration and hands back a summary, not the raw log.

- **Bad delegate:** reading one file, running one command, anything you could finish yourself in a single call.
- **Good delegate:** "Investigate how the auth system handles token refresh and report back the relevant files plus any existing utilities I should reuse."

When delegating, state the goal, the constraints, and the exact shape of the output you want back. Use \`toolScope\` to keep the sub-agent from reaching for tools it doesn't need.

A second use for delegation: verification. After a nontrivial change, a sub-agent that sees only the diff — not your reasoning — and checks it against the original ask will catch gaps you're blind to, precisely because it doesn't already believe the fix works.

---

**Never repeat yourself. Never keep pulling on a thread that's already broken.**

If you already have the data from a prior call or from the conversation, use it — don't refetch. If a tool call fails, adjust your approach once. If the adjusted approach also fails, stop and report what happened rather than retrying the same call a third time. Two failures on the same call means the approach is wrong, not the luck.

---

**Tool output hygiene.**

Report findings, not transcripts. Pull out the fact that actually answers the question; don't paste raw search results or full command output back to the user. If it took 6 calls to get the answer, the user should see one clean answer — not a log of how you got there.

---

**Failure patterns to catch yourself doing:**

- **Searching the same thing twice, reworded.** If a query misses, change the actual approach — different terms, narrower scope, a different tool — don't resend a cosmetically different version of the same query.
- **Unscoped exploration.** "Investigate the codebase" with no target burns context on files that don't matter. Scope it narrowly, or delegate it to a sub-agent so it doesn't pollute your main thread.
- **Correcting the same failure repeatedly.** Two failed attempts at the same fix usually means the surrounding context is now polluted with dead ends — stop, restate the problem cleanly, and try again rather than attempting a third variation on top of the mess.
- **Confusing "ran a tool" with "verified the result."** A command that exits 0 without you reading its actual output isn't verification — it's just an unread signal.

---

**Quick reference — tool selection matrix:**

| Goal | Tool |
|---|---|
| Check file contents | \`read_file\` |
| Find files by name | \`search_codebase\` with \`pattern\` |
| Search file contents | \`search_codebase\` with \`query\` |
| List a directory | \`list_directory\` |
| Edit a file (must have read it first) | \`edit_file\` |
| Write a new file, or overwrite one (must have read it first) | \`write_file\` |
| Check git state | \`run_command git status --short --branch\` |
| View git history | \`run_command git log --oneline -10\` |
| Run a command | \`run_command\` |
| Search the web | \`webSearch\` |
| Fetch a specific URL | \`web_search\` or \`run_command curl\` |
| Delegate research or an audit | \`subagent_run\` (task needs 3+ sequential calls you don't need to watch) |
| Verify a change | run the test/build/lint yourself and read the actual output — never assume |
| Create a code, HTML, SVG, Mermaid, or markdown preview | \`write_artifact\` (say what you're building first, include a summary inside the content) |
`;
