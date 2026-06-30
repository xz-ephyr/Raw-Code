# Codebase Audit Report

## Summary
The `xz` workstation codebase demonstrates a solid foundation with a modern React 19/TypeScript frontend and a dual-mode (Tauri/Web) architecture. However, as the project has scaled to ~11k LOC, significant "God Component" patterns and logic duplication have emerged. The overall health score (based on recent fallow reports) is approximately **63/100**, primarily dragged down by unused dependencies and high cognitive complexity in core UI paths.

- **Total Findings Count**: 12
- **Key Focus**: Modularization of the chat interface and deduplication of AI configuration logic.

### Top 5 High-Impact Fixes (Effort vs. Impact)
1. **Prune Dependencies**: (Effort: 5m / Impact: Med) - Immediate reduction in bundle size and security surface.
2. **Paginate Messages**: (Effort: 15m / Impact: High) - Prevents scaling issues with long-running chat sessions.
3. **Modularize Model Setup**: (Effort: 1h / Impact: High) - Critical for maintainability as new providers are added.
4. **Split Tauri Bridge**: (Effort: 20m / Impact: Med) - Reduces build-time dependencies and improves graph health.
5. **Strict Typing for AI Service**: (Effort: 30m / Impact: Med) - Eliminates runtime errors in the most critical user path.

---

## Critical Findings

### 1. Architecture: The ChatPage "God Component"
- **File Path**: `src/pages/ChatPage.tsx`
- **Line Numbers**: 100-763
- **Severity**: Critical
- **Description**: The `ChatPage` component manages session loading, streaming state, artifact coordination, layout resizing, and scrolling logic in a single file (>600 lines). This makes it extremely brittle and difficult to test.
- **Suggested Fix**: Decompose the page into specialized sub-components: `ChatHeader`, `MessageList`, `ChatInputProvider`, and `ArtifactLayoutManager`. Move the resizing logic into a custom `usePanelResize` hook.
  ```tsx
  // Proposed structure
  export const ChatPage = () => {
    const { messages, isLoading, handleSend } = useChatSession(uuid);
    const { panelWidth, startResize } = usePanelResize();
    return (
      <ChatLayout
        header={<TitleBar />}
        messages={<MessageList messages={messages} />}
        input={<ChatInputContainer onSend={handleSend} />}
        artifacts={<ArtifactPanel width={panelWidth} onResize={startResize} />}
      />
    );
  };
  ```

---

## High Priority

### 1. Architecture: Logic Duplication in Model Configuration
- **File Paths**: `src/components/onboarding/ModelSetupStep.tsx` (30-90) & `src/components/settings/SettingsModal.tsx` (130-250)
- **Severity**: High
- **Description**: The logic for rendering provider inputs, toggling key visibility, and saving API keys to `localStorage` is duplicated across these two components. Updates to supported providers must be made in two places.
- **Suggested Fix**: Extract a `useModelSettings` hook and a shared `ProviderKeyInput` component.
  ```tsx
  // src/hooks/useModelSettings.ts
  export const useModelSettings = () => {
    const [keys, setKeys] = useState(getInitialKeys());
    const saveKeys = (newKeys) => { /* logic */ };
    return { keys, setKeys, saveKeys };
  };
  ```

### 2. Architecture: Complexity in ThinkingTimeline derivation
- **File Path**: `src/components/chat/ThinkingTimeline.tsx`
- **Line Numbers**: 167-270
- **Severity**: High
- **Description**: The `useTimelineSteps` hook contains complex, imperative logic to transform raw message parts into timeline steps. With a cognitive load of 92, this is the most "at risk" logic in the UI.
- **Suggested Fix**: Refactor the transformation into a pipeline of pure functions that can be unit tested independently of the React hook.
  ```typescript
  const deriveStepsFromParts = (parts: any[], toolInvocations: any[]) => {
    return parts.reduce((steps, part) => {
      if (part.type === 'reasoning') return appendThinkingStep(steps, part);
      if (isSearchTool(part)) return appendSearchStep(steps, part);
      return steps;
    }, []);
  };
  ```

---

## Medium Priority

### 1. Performance: Missing Pagination in Message History
- **File Path**: `src/services/DatabaseService.ts`
- **Line Numbers**: 95-105
- **Severity**: Medium
- **Category**: Database/Performance
- **Description**: `getMessages` fetches all messages for a session by default. As conversations grow (e.g., 100+ messages), this will lead to increased heap usage and UI lag during session switches.
- **Suggested Fix**: Enforce a default limit (e.g., 50) and implement "Load More" logic in the UI.
  ```typescript
  async getMessages(sessionId: string, opts?: { limit?: number; offset?: number }) {
    const limit = opts?.limit ?? 50; // Default limit
    // ...
  }
  ```

### 2. Performance: Redundant JSON transformations in DB layers
- **File Path**: `src/services/DatabaseService.ts`
- **Line Numbers**: 110-120
- **Severity**: Medium
- **Category**: Optimization
- **Description**: Every message save/load involves `JSON.stringify` or `JSON.parse` on `toolInvocations`. This happens synchronously on the main thread during render-affecting state updates.
- **Suggested Fix**: Move parsing logic into a background worker or use a specialized SQLite extension if using Tauri/Rust, or at least memoize the mapping at the service level.

### 3. Architecture: Tight coupling to Tauri bridge
- **File Path**: `src/lib/tauri/index.ts`
- **Line Numbers**: 1-3
- **Severity**: Medium
- **Category**: Architecture
- **Description**: The project has 16+ dependents on this single file. While small, it creates a "Fan-In" bottleneck.
- **Suggested Fix**: Split `tauri.ts` into functional domains like `tauri-fs.ts`, `tauri-dialog.ts`, etc., to reduce the impact of changes.

---

## Low Priority / Polish

### 1. Code Polish: Pervasive use of `any` in Core Logic
- **File Path**: `src/services/aiService.ts`
- **Line Numbers**: 135-180
- **Severity**: Low
- **Description**: Many interfaces in the AI streaming logic use `any` for `messages` and `options`. This bypasses TypeScript's safety, leading to potential runtime errors during model fallback.
- **Suggested Fix**: Define a shared `CoreMessage` type (or import from `ai` package) and strictly type the `chatCompletion` inputs.

### 2. Code Polish: Dead Code & Unused Dependencies
- **File Path**: `package.json`
- **Severity**: Low
- **Category**: Bundle Size
- **Description**: 10 unused packages identified (e.g., `@babel/standalone` if not using live previews everywhere).
- **Suggested Fix**: Run `pnpm prune` and remove unreachable packages to reduce bundle size.

### 3. Architecture: Swallowed Errors in Session Loading
- **File Path**: `src/services/ChatSessionManager.ts`
- **Line Numbers**: 40-50
- **Severity**: Low
- **Category**: Error Handling
- **Description**: Several methods use `.catch(() => null)`, which silences potential database or network errors during session retrieval.
- **Suggested Fix**: Implement proper error logging or bubble up errors to the UI for better observability.

### 4. Performance: Missing Database Indexes
- **File Path**: `server/src/db.ts`
- **Line Numbers**: 100-110
- **Severity**: Low
- **Category**: Database
- **Description**: Missing index on `project_files(updated_at)`, which will slow down cleanup operations as the number of files grows.
- **Suggested Fix**: Add `CREATE INDEX idx_project_files_updated_at ON project_files(updated_at);`.

### 5. Architecture: Lack of Rate Limiting
- **File Path**: `server/src/index.ts`
- **Severity**: Low
- **Category**: Security
- **Description**: The server lacks any form of rate limiting for the `/websearch` or `/save_messages` endpoints.
- **Suggested Fix**: Integrate `express-rate-limit` for public-facing or resource-intensive endpoints.

### 6. Code Polish: Redundant VFS Logic in Tauri Mode
- **File Path**: `src/services/FileSystemService.ts`
- **Severity**: Low
- **Category**: Clean Code
- **Description**: Extensive `webVirtualFS` logic is initialized and maintained even when running in native Tauri mode where it is unused.
- **Suggested Fix**: Use dynamic imports or conditional initialization to only load the VFS layer in browser environments.

---

## Top 5 Quick Wins

1. **Prune Dependencies**: Remove the 10 unused packages from `package.json` (Effort: 5m, Impact: Med).
2. **Modularize Model Setup**: Extract the model provider list into a constant and use a shared component (Effort: 1h, Impact: High).
3. **Paginate Messages**: Add a simple `LIMIT 50` to `getMessages` (Effort: 15m, Impact: High for long-term perf).
4. **Strict Typing for AI Service**: Replace `any` with `CoreMessage` in `aiService.ts` (Effort: 30m, Impact: Low-Med for stability).
5. **Split Tauri Bridge**: Distribute `isTauri` into more specific utility files (Effort: 20m, Impact: Med for build-time/graph health).
