# Core Architecture

The Core layer acts as the **Control Plane** of the application. It defines *how* the agent should behave and *what* it should know, but does not handle the UI or the direct execution of heavy tasks.

## Principles

1.  **UI Independence**: No React hooks or UI components in `core/`.
2.  **Execution Independence**: Core defines tools and workflows, but routes execution to the `agent/` (Go) or specialized utilities.
3.  **Language**: Written in TypeScript for easy integration with the React frontend while maintaining strict types.
4.  **Consistency**: Ensures that model routing and prompts are consistent across different parts of the app.
