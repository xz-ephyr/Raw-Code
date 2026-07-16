# Chat Idle State — Creative Launchpad Enhancement Plan

## 1. Validated User Intent

### Surface Intent
Replace the static "Hello, how can I help?" + input box idle screen with something more useful, and remove the decorative gradient background.

### Latent Intent (Triangulated)
- The idle state is the app's **first impression** — it should communicate what this tool *is* and inspire action, not sit there passively
- The app is a **content creation agentic tool** (not coding) — idle state should reflect creative use cases
- Screen real estate (~75% viewport) is wasted on decoration (gradient) and a single heading
- Users need **frictionless ways to start**: resume recent work, discover capabilities, or launch a content task
- The gradient adds visual noise without purpose — it should be removed entirely

### Corrections Made
- Removed assumption about coding use cases — app is purely content creation
- Confirmed gradient should be deleted, not replaced

---

## 2. Key Findings (Sub-Agent 1 — Reconnaissance)

### PageGradient Trace
| File | Line | Action |
|------|------|--------|
| `src/components/ui/PageGradient.tsx` | 1-18 | Delete file |
| `src/components/ui/index.ts` | 6 | Remove re-export |
| `src/pages/ChatPage.tsx` | 21, 401 | Remove import + JSX |
| `src/styles/index.css` | 262-281 | Remove `aurora-drift-*` keyframes |

Only used on ChatPage. CSS animations are exclusive to PageGradient — safe to remove.

### Idle State Rendering Flow
- `MessageList.tsx` lines 180-201: simple `!hasMessages` branch renders heading + ChatInput with `idle={true}`
- Scroll container gets `paddingTop: '25vh'` and different max-width in idle mode
- TitleBar is hidden when `uuid === 'new'` or `messages.length === 0`
- **Bug found:** `ChatInput` interface declares both `idle` and `isIdle` props; `MessageList` passes `idle={true}`, but `ChatInput` destructures `isIdle` (always `undefined`) — all sub-components checking `isIdle` get falsy

### Available Data for Enhancements
- `chatsStore.chats` — all sessions available synchronously (already loaded by sidebar)
- No suggestion/prompt/template system exists
- "Skills and templates" submenu is empty placeholder
- Mode selector, model selector, reasoning/web search toggles already in toolbar

### Component Inventory (Idle-Visible)
ChatInput, ThinkingPill, WebSearchPill, ModelList, NTabDropdown, ToolbarDropdown, SendButton, ConnectorMentionDropdown — all already present in idle state.

---

## 3. Professional Reasoning & Correct Approach (Sub-Agent 2)

### Design Principles
1. **Purpose-communicating** — idle state must signal "content creation tool"
2. **Progressive disclosure** — most valuable actions first, reference material deeper
3. **Context-adaptive** — return users see recent work; new users see guidance
4. **Action-first** — every element invites action; nothing is purely decorative
5. **Visually calm but purposeful** — remove decoration, use visual weight for function
6. **Zero-latency** — render instantly, no loading spinners or async waterfalls
7. **Keyboard-first** — tab-navigable without mouse

### Recommended Architecture: Three-Ring Layout
```
Ring 1 (Primary — always visible):
  Heading: "What would you like to create?"
  [ChatInput — full existing toolbar]

Ring 2 (Contextual — conditional):
  Recent conversations (top 3, only if exist)
  Content starter pills (6 quick-action chips)

Ring 3 (Ambient — optional):
  Current mode label/hint
```

### Specific Feature Recommendations (Ranked)

| Priority | Feature | Effort | Value |
|----------|---------|--------|-------|
| P0 | Rebrand heading to "What would you like to create?" | Low | High |
| P0 | Remove PageGradient (component + CSS) | Low | Medium |
| P0 | Extract IdleState from MessageList | Medium | High |
| P0 | Fix `idle`/`isIdle` prop bug | Low | High |
| P1 | Recent conversations (top 3) | Medium | High |
| P1 | Content starter pills (6 chips, content-focused) | Medium | High |
| P2 | Mode-aware hint (current mode description) | Low | Low |

### Rejected Approaches
- **Show ALL recent chats** — overwhelming; sidebar already does this
- **Tips/tutorial carousel** — low engagement, adds complexity
- **Duplicated mode selector** — already in toolbar
- **Decorative illustrations** — contradicts action-first principle
- **AI-suggested prompts** — introduces latency; let user drive intent
- **Widget-based architecture** — premature abstraction for one idle state

---

## 4. Precise Placement & Introduction Plan (Sub-Agent 3)

### Dependency-Ordered Change Sequence

#### Phase 1: Clean up PageGradient
1. **`src/pages/ChatPage.tsx`** — Remove import (line 21) and `<PageGradient />` JSX (line 401)
2. **`src/components/ui/index.ts`** — Remove `export { PageGradient }` (line 6)
3. **`src/components/ui/PageGradient.tsx`** — Delete entire file
4. **`src/styles/index.css`** — Remove `@keyframes aurora-drift-1/2/3` (lines 262-281)

#### Phase 2: Fix isIdle prop interface
5. **`src/components/chat/ChatInput.tsx`** — Remove `idle?: boolean` from interface (line 22); keep only `isIdle`

#### Phase 3: Create IdleState component
6. **`src/components/chat/IdleState.tsx`** — **Create** new standalone component:
   - Props: `onSend`, `isLoading`, `onStop`, `isThinkingEnabled`, `onToggleThinking`, `isWebSearchEnabled`, `onToggleWebSearch`, `currentModel?`, `currentMode?`, `onModeChange?`
   - Uses `useChatsStore` for recent chats (filter archived → sort by updatedAt → slice 3)
   - Renders: heading ("What would you like to create?"), recent conversations section (top 3 cards), content starter chips (6 hardcoded), ChatInput with `isIdle={true}`
   - Content starters: hardcoded array of `{ label, icon, prompt }` — clicking sends via `onSend(prompt)`
   - Vertical padding reduced from `25vh` to `15vh` to accommodate new sections
7. **`src/components/chat/index.ts`** — Add `export { IdleState }` entry

#### Phase 4: Simplify MessageList
8. **`src/components/chat/MessageList.tsx`**:
   - Add `import { IdleState } from './IdleState'`
   - Remove idle branch (lines 180-201), replace with `<IdleState ... />`
   - Remove idle-specific scroll container styling (simplify className, remove conditional paddingTop)
   - Simplify inner wrapper maxWidth to always be `min(780px, 100%)`

### Content Starters (Content-Creation Focused)
```
Write a blog post    →  "Write a blog post about..."
Draft an email       →  "Draft an email about..."
Brainstorm ideas     →  "Brainstorm ideas for..."
Summarize content    →  "Summarize the following..."
Create social media  →  "Create a social media post about..."
Start a blank doc    →  (empty input, just focus the editor)
```

### No Store/Type Changes Required
- No new Zustand slices, no new API calls, no new type definitions
- `chatsStore` already provides all needed data synchronously
- No new dependencies beyond React Router's `useNavigate`

---

## 5. Risks & Trade-offs

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Content starters feel generic | Medium | Make them configurable in future; start with broadly useful set |
| Recent chats section duplicates sidebar | Medium | Only show top 3 (sidebar shows all); different visual treatment |
| Idle state becomes too busy | Low | Three-ring design with progressive disclosure; heading + input always dominant |
| CSS keyframe removal breaks something | Very low | Grep confirms `aurora-drift` is only referenced by PageGradient |
| Prop fix breaks sub-component positioning | Low | Check all `isIdle` consumers in ToolbarDropdown, NTabDropdown, ModelList, ConnectorMentionDropdown |

### Recommended Testing
- **Unit tests:** IdleState renders correct heading, starter pills, ChatInput with `isIdle`
- **Interaction tests:** Clicking starter calls `onSend`, clicking recent chat navigates
- **Regression tests:** Active chat flow unchanged, ChatInput works without `idle` prop
- **Visual tests:** No gradient renders; idle state is centered and responsive

### Rollback Strategy
1. Revert `MessageList.tsx` — restore idle branch and styling
2. Delete `IdleState.tsx` + revert `index.ts`
3. Revert `ChatInput.tsx` — add `idle` prop back
4. Restore `PageGradient.tsx` + re-export + ChatPage import + CSS keyframes

---

## 6. Recommendation

**Proceed with implementation.** The plan is low-risk, zero new dependencies, leverages existing data, and follows correct engineering principles. The changes are:

- **Removing** dead code (PageGradient, CSS animations, unused prop)
- **Extracting** existing logic into a well-factored component (IdleState)
- **Adding** two lightweight, high-value features (recent chats + content starters) that use existing data and patterns

Total estimated change: ~1 new file (150-200 lines), ~7 modified files (mostly deletions or small edits), 1 deleted file. No storage, API, or type changes needed.
