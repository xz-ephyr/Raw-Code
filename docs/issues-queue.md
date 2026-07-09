## ISSUES QUEUE

### RULES:
- Same as refinement-queue.md rules
- After fixing each issue: add 2 more discovered issues below
- Create `issues.d/` folder — each fixed issue gets its own file: `issues.d/{id}-{slug}.md`
- Each `issues.d` file contains: issue description, root cause, fix applied, sub-plan, verification step

### INITIAL ISSUES:

#### [I-01] Settings Modal Z-Index Conflict [DONE]
Settings converted from modal to full page — no more z-index overlay conflicts.

#### [I-02] Chat List Re-renders on Every Keystroke
- Input in chat causes full chat list re-render
- Fix: memoize chat list, decouple input state

#### [I-03] Memory Leak on Project Switch
- Agent context not fully cleared on project switch
- Fix: call cleanup hooks, reset stores on project unmount

<!-- Agent adds discovered issues below -->
