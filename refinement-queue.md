## REFINEMENT QUEUE

### RULES:
- Work top to bottom
- When section is complete: append 2 new refinement targets below it
- Never remove completed items — mark [DONE] and move on
- When all initial items done: pick up agent-added items — ASK PERMISSION FIRST
- State WHY each addition is needed before starting it

### INITIAL REFINEMENT TARGETS:

#### [R-01] Harness Tool Dispatch Performance [DONE]
Core provider dispatch refactored to use registry-based Map lookups instead of hardcoded switch statements.

#### [R-02] Agent Context Window Management
- Audit context window usage per agent
- Implement smart context trimming
- Prioritize recent + high-signal content

#### [R-03] Explorer Agent Write-to-Plan Output Quality
- Review write-to-plan output format
- Ensure plan is always structured, not freeform
- Add schema validation on plan output

<!-- Agent adds items below when each section above is [DONE] -->
