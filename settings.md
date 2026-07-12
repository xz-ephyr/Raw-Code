# CSIP-Ω Reconnaissance & Intent Plan
## GeneralTab Redesign — Settings Page

---

## 1. Validated Intent

### Surface Intent
- Redesign the "general content section" of the settings page
- Add new relevant settings that a mature app would typically have in its general settings

### Latent Intent (triangulated)
- Expand the existing **GeneralTab** (`src/components/settings/tabs/GeneralTab.tsx`) — currently only 3 flat settings — into two visually organized sections: **"General"** (app-wide preferences) and **"Content"** (chat display preferences)
- Add ~10 new settings that are industry-standard for an AI-native content creation studio
- Keep the implementation consistent with existing codebase patterns: localStorage persistence, shadcn/ui styling, ToggleSwitch component
- Do NOT create a separate tab — the user confirmed "general content section" means a subsection within the existing General tab

### What This Is NOT
- NOT a new tab in SettingsTabLayout
- NOT a migration to backend persistence (DB round-trips are overkill for preferences)
- NOT an i18n/l10n implementation (though we future-proof with a `locale` key)
- NOT a Zustand migration
- NOT a change to SettingsTabLayout, SettingsModal, or SettingsPage

---

## 2. Key Findings (Sub-Agent 1)

### Current State of GeneralTab
- **File:** `src/components/settings/tabs/GeneralTab.tsx` (35 lines)
- **3 settings:** Default Page (select), Message Timestamps (ToggleSwitch), Auto-save Drafts (ToggleSwitch)
- **All use raw `localStorage`** directly in event handlers — uncontrolled React (`defaultValue`/`defaultChecked`)
- **No sections, no grouping** — flat list of controls
- **No loading/saving states** — writes are immediate, no feedback
- **All three keys are completely isolated** — `default_page`, `show_timestamps`, `auto_drafts` are never read by any other component

### Persistence Patterns in Codebase
| Pattern | Used By | Characteristics |
|---------|---------|-----------------|
| Raw localStorage | General, Behavior, Appearance, Storage tabs | Immediate writes, uncontrolled, no loading state |
| `useSettingsConfig` hook | WebSearch, Gmail tabs | Async DB via Express API, explicit Save button, loading state |
| `useZoom` hook | ZoomControl | Controlled React state + localStorage persistence via lazy init + effect |
| Zustand stores | projectStore, sessionStore | Cross-component state, persist middleware for session |

### localStorage Key Inventory
- No collisions exist between existing keys and any proposed new keys
- `default_page`, `show_timestamps`, `auto_drafts` are exclusively consumed by GeneralTab

### Component Patterns
- ToggleSwitch supports `defaultChecked` (uncontrolled) — needs `checked` prop for controlled mode
- Select dropdowns use native `<select>` with consistent Tailwind styling (`.h-10 .bg-muted .rounded-[10px] .px-3 .text-sm .outline-none .w-full .border .border-border .focus:border-ring .transition-all .appearance-none .cursor-pointer`)
- Icons use `@hugeicons/react` package
- Settings use `space-y-6` vertical rhythm, sections use `space-y-3` internally

---

## 3. Professional Engineering Reasoning (Sub-Agent 2)

### Recommended Persistence Strategy
- **Keep localStorage** — preferences don't need backend round-trips
- **Adopt the `useZoom` pattern** — create a generic `useLocalStorageSetting<T>(key, defaultValue)` hook that provides controlled React state with synchronous localStorage persistence
- **Handle legacy data** — existing keys store raw strings (`'true'`, `'chats'`). The hook must try `JSON.parse` first (handles `'true'` → `true`), fall back to raw string (handles `'chats'` → `'chats'`)

### Why Not Alternatives
| Alternative | Rejected Because |
|-------------|------------------|
| `useSettingsConfig` (DB-backed) | Over-engineered for preferences. Latency + complexity with no benefit over localStorage |
| Zustand | No cross-component sharing needed for these settings |
| Separate "Content" tab | User explicitly confirmed section-within-General, not separate tab |
| Save button | Contradicts immediate-write pattern used by all simple localStorage tabs |

### Proposed Settings — With Rationale

#### Section: General (Application-wide preferences)

| Setting | Type | Key | Default | Rationale |
|---------|------|-----|---------|-----------|
| Default Page | select | `default_page` | `'chats'` | **Existing** — kept as-is |
| Message Timestamps | ToggleSwitch | `show_timestamps` | `true` | **Existing** — kept as-is |
| Auto-save Drafts | ToggleSwitch | `auto_drafts` | `true` | **Existing** — kept as-is |
| Language | select | `locale` | `'en'` | Future-proof — setting defined now for when i18n lands |
| Telemetry | ToggleSwitch | `telemetry_enabled` | `false` | Industry standard (VS Code, JetBrains). Default opt-out for privacy-first stance |
| Session Restore | select | `session_restore` | `'always'` | Pairs with Default Page; controls session persistence behavior |

#### Section: Content (Chat and code display preferences)

| Setting | Type | Key | Default | Rationale |
|---------|------|-----|---------|-----------|
| Message Display Density | select | `message_density` | `'comfortable'` | Chat UX standard (Discord, Slack). Compact / Comfortable / Roomy |
| Code Block Line Numbers | ToggleSwitch | `code_line_numbers` | `true` | Code editor standard |
| Code Block Word Wrap | ToggleSwitch | `code_word_wrap` | `true` | Code editor standard; default to wrap for readability |
| Enter to Send | ToggleSwitch | `enter_to_send` | `true` | Critical UX preference — Enter vs Ctrl+Enter |
| Typing Indicators | ToggleSwitch | `typing_indicators` | `true` | Standard in AI chat interfaces |
| Autocomplete Suggestions | ToggleSwitch | `autocomplete_suggestions` | `true` | AI autocomplete kill switch |
| Math Rendering | ToggleSwitch | `math_rendering` | `true` | LaTeX rendering toggle (prepare for KaTeX integration) |

### Testing Strategy
- **Unit:** `useLocalStorageSetting` — mock localStorage, test default, read, write, error handling, legacy `'true'`/`'false'` strings
- **Unit:** ToggleSwitch controlled mode — `checked` prop overrides `defaultChecked`
- **Component:** GeneralTab renders all 13 settings in correct sections; changing a setting calls hook setter
- **E2E:** Toggle → close settings → reopen → verify persistence; reload page → verify

---

## 4. Placement & Introduction Strategy (Sub-Agent 3)

### Files to Create

#### `src/hooks/useLocalStorageSetting.ts` (NEW — 28 lines)
Generic hook returning `[value, setValue]` tuple:
- Reads from localStorage on mount (with JSON.parse fallback to raw string)
- Writes to localStorage on set (with error swallowing for quota exceeded)
- Handles legacy string-booleans (`'true'` → `true`) via JSON.parse
- Handles existing raw string keys (`'chats'`) via catch-to-raw fallback

#### `src/components/ui/ToggleSwitch.tsx` (MODIFY — +2 props, ~5 lines logic)
- Add optional `checked?: boolean` prop
- When `checked` is provided: render `<input checked={checked}>` (controlled)
- When `checked` is undefined: render `<input defaultChecked={defaultChecked}>` (uncontrolled — backward compat)
- All existing callers (BehaviorTab, etc.) use `defaultChecked` → zero breakage

#### `src/components/settings/tabs/GeneralTab.tsx` (REWRITE — 35 → ~210 lines)
- Imports: `ToggleSwitch` + `useLocalStorageSetting`
- Inline `SettingsSection` helper component (12 lines) for visual grouping with title + description
- 13 `useLocalStorageSetting` calls (3 existing + 10 new)
- Two sections separated by `<div className="border-t border-border" />`
- Each control follows existing pattern: `flex flex-col gap-2` wrapper + label + select/toggle + description

### Files NOT Modified
| File | Reason |
|------|--------|
| `SettingsTabLayout.tsx` | Already renders `{activeTab === 'general' && <GeneralTab />}` — no changes needed |
| `SettingsModal.tsx` | Renders `<SettingsTabLayout />` — transparent |
| `SettingsPage.tsx` | Renders `<SettingsTabLayout />` — transparent |
| `BehaviorTab.tsx` | Uses `defaultChecked` on ToggleSwitch (backward-compat path) |
| `ChatPage.tsx` | Reads `auto_artifacts` — unrelated key |
| `StorageTab.tsx` | No references to old or new keys |
| Any CSS file | Tailwind handles everything |

### Impact Radius
- **Contains to 3 files:** 1 create (hook) + 2 modifications (ToggleSwitch, GeneralTab)
- **Zero external consumers affected:** no other component reads the existing or new localStorage keys
- **Zero routing/config changes:** SettingsTabLayout, SettingsModal, SettingsPage unchanged

### Backward Compatibility Verification

| Scenario | Behavior |
|----------|----------|
| User has `default_page='thread'` (old format) | `JSON.parse('thread')` throws → fallback to raw string → select matches `"thread"` ✓ |
| User has `show_timestamps='false'` (old string boolean) | `JSON.parse('false')` → `false` → `checked={false}` ✓ |
| User has `show_timestamps='true'` (old string boolean) | `JSON.parse('true')` → `true` → `checked={true}` ✓ |
| No localStorage for new key | `getItem` returns `null` → `defaultValue` used ✓ |
| Fresh install, empty localStorage | All defaults applied ✓ |
| Existing ToggleSwitch callers | Use `defaultChecked` → `isControlled=false` → old path ✓ |

### Rollback Strategy
- Revert `GeneralTab.tsx` to the known-working 35-line version
- Revert `ToggleSwitch.tsx` to original (remove `checked` prop) — but keeping it is harmless since no caller uses it
- Delete `useLocalStorageSetting.ts` — no other file references it
- Restore and verify no runtime errors

---

## 5. Risks, Trade-offs, and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| localStorage key collision with future code | Low | Medium | Use descriptive key names (`code_line_numbers` vs `line_numbers`). Future migration to `rc_` prefix possible via hook |
| ToggleSwitch controlled mode breaks existing usage | Very Low | High | Strict backward-compat: `checked` prop is optional; when absent, old `defaultChecked` path used. Tested manually |
| Telementry default `false` may be controversial | Medium | Low | Deliberate choice — privacy-first for an AI editor. User can toggle on |
| No cross-tab sync for localStorage | Low | Low | Acceptable for v1. Hook could add `window.addEventListener('storage')` in future |
| `SettingsSection` component stays inline but could be reused | Low | Low | Extraction is a trivial refactor when a second consumer appears |

---

## 6. Recommendation

**Proceed with implementation.** The scope is well-defined, contained to 3 files, fully backward-compatible, and follows established codebase patterns. No architectural changes are needed. The redesign transforms the GeneralTab from a sparse 3-item flat list into a professional, sectioned settings panel with 13 controls organized under two clear headings.

---

*Report generated by CSIP-Ω protocol — all analysis is read-only. No code has been written.*
