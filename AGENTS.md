# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Repository Overview

This project (xz) is a local-first, multi-model AI coding environment with live artifact previews, project-aware context, and a built-in IDE.

### Tech Stack
- **Shell**: Tauri 2.0 (Rust)
- **Frontend**: React 19 + Vite + TypeScript
- **AI SDK**: Vercel AI SDK (ai v6)
- **Editor**: CodeMirror 6
- **Backend**: Express.js + better-sqlite3
- **Agent**: Go sidecar (port 3002)

## Agent Skills Integration

This project uses production-grade engineering skills from agent-skills. The skills are located in `skills/<skill-name>/SKILL.md`.

### Core Rules

- If a task matches a skill, you MUST invoke it via the `skill` tool
- Skills are located in `skills/<skill-name>/SKILL.md`
- Never implement directly if a skill applies
- Always follow the skill instructions exactly (do not partially apply them)

### Intent to Skill Mapping

The agent should automatically map user intent to skills:

- Feature / new functionality -> spec-driven-development, then incremental-implementation, test-driven-development
- Planning / breakdown -> planning-and-task-breakdown
- Bug / failure / unexpected behavior -> debugging-and-error-recovery
- Code review -> code-review-and-quality
- Refactoring / simplification -> code-simplification
- API or interface design -> api-and-interface-design
- UI work -> frontend-ui-engineering
- Testing -> test-driven-development
- Security review -> security-and-hardening
- Performance -> performance-optimization
- Documentation -> documentation-and-adrs

### Lifecycle Mapping

- DEFINE -> spec-driven-development
- PLAN -> planning-and-task-breakdown
- BUILD -> incremental-implementation + test-driven-development
- VERIFY -> debugging-and-error-recovery
- REVIEW -> code-review-and-quality
- SHIP -> shipping-and-launch

### Execution Model

For every request:
1. Determine if any skill applies
2. Invoke the appropriate skill using the `skill` tool
3. Follow the skill workflow strictly
4. Only proceed to implementation after required steps (spec, plan, etc.) are complete

### Anti-Rationalization

The following thoughts are incorrect and must be ignored:
- "This is too small for a skill"
- "I can just quickly implement this"
- "I'll gather context first"

Correct behavior: always check for and use skills first.
