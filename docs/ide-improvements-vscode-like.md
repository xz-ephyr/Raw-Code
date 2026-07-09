# IDE Improvements — VS Code-like Features & Fixes

## Current Issues

### 1. Tabs Don't Fill Full Width

**Problem:** The tab bar uses `overflow-x-auto` with `no-wrap`, so tabs scroll horizontally instead of expanding to fill available space. When 1–2 tabs are open, there's a large empty gap on the right. Each tab name is also `max-w-[120px]`, aggressively truncating before necessary.

**Files involved:**
- `src/ide/EditorTab.tsx` (line 25: `max-w-[120px]`)
- `src/ide/Editor.tsx` (line 73: `overflow-x-auto` tab bar container)

**Root cause — `Editor.tsx:73`:**
```tsx
<div className="flex items-center overflow-x-auto no-wrap border-b border-border">
```
This uses `overflow-x-auto` which always allows horizontal scroll. Flex children shrink by default but `no-wrap` prevents wrapping. Combined, they scroll instead of filling.

**Root cause — `EditorTab.tsx:25`:**
```tsx
<span className="truncate max-w-[120px]">{tab.name}</span>
```
The `max-w-[120px]` caps every tab name at 120px regardless of available space.

### 2. Two Separate Buttons for File/Folder Creation

**Problem:** The Explorer header has two separate buttons: a `+` (Add01Icon) for new file and a folder icon button for new folder. This is unlike VS Code which uses a single dropdown that offers both options.

**File:** `src/ide/FileExplorer.tsx` (lines 63-80)

---

## Fixes

### Fix 1: Make Tabs Fill Full Width

**Goal:** Tabs should expand to fill the full tab bar width when space permits, only scrolling when truly overflowed.

**Change `Editor.tsx` line 73:**

```tsx
// Before:
<div className="flex items-center overflow-x-auto no-wrap border-b border-border">

// After:
<div className="flex items-center border-b border-border overflow-x-auto">
  <div className="flex items-center min-w-0 flex-1">
    {tabs.map((tab) => (
      <EditorTab key={tab.id} ... />
    ))}
  </div>
</div>
```

The inner `min-w-0 flex-1` wrapper allows tabs to shrink and fill proportionally. The outer container still scrolls when content actually overflows.

**Change `EditorTab.tsx` — replace fixed `max-w-[120px]` with dynamic flex sizing:**

```tsx
// Before:
<span className="truncate max-w-[120px]">{tab.name}</span>

// After:
<span className="truncate min-w-0 flex-1">{tab.name}</span>
```

Remove the `max-w-[120px]` cap. Use `min-w-0 flex-1` so each tab's text fills available space and shrinks when needed.

**Add shrink behavior to tabs:**

```tsx
// Before:
'group flex items-center gap-1 px-3 py-2 text-xs font-medium cursor-pointer rounded-t-[8px] select-none',

// After:
'group flex items-center gap-1 px-3 py-2 text-xs font-medium cursor-pointer rounded-t-[8px] select-none shrink-0 min-w-0',
```

Each tab should be `shrink-0` on the flex level but the text inside should shrink. Actually, better approach for VS Code-like behavior: make tabs `flex-1 min-w-0` so they equally distribute available space.

**Alternative — VS Code proportional tabs:**

For a true VS Code feel, each tab gets equal share of the bar:

```tsx
// EditorTab root className add:
'flex-1 min-w-0'

// Tab name span:
'flex-1 min-w-0 truncate'
```

This makes all tabs equal width and the name fills available space before truncating.

### Fix 2: Replace Two Buttons with a Single Plus Dropdown

**Goal:** A single `+` button that opens a dropdown with "New File..." and "New Folder..." options, matching VS Code.

**Implementation in `FileExplorer.tsx`:**

```tsx
import { useState, useRef, useEffect } from 'react';
import { Add01Icon, File01Icon, Folder01Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';

// Replace the two-button block (lines 63-80) with:
<div className="relative">
  <button
    type="button"
    onClick={() => setShowCreateDropdown(prev => !prev)}
    className="p-1 hover:bg-muted rounded-[8px] cursor-pointer active:scale-[0.99]"
    aria-label="Create new file or folder"
  >
    <HugeiconRenderer icon={Add01Icon} />
  </button>

  {showCreateDropdown && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setShowCreateDropdown(false)} />
      <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
        <button
          type="button"
          onClick={() => { setShowCreateDropdown(false); setCreateMode('file'); setCreateName(''); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted cursor-pointer"
        >
          <HugeiconRenderer icon={File01Icon} size={14} />
          New File...
        </button>
        <button
          type="button"
          onClick={() => { setShowCreateDropdown(false); setCreateMode('folder'); setCreateName(''); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted cursor-pointer"
        >
          <HugeiconRenderer icon={Folder01Icon} size={14} />
          New Folder...
        </button>
      </div>
    </>
  )}
</div>
```

Add state:
```tsx
const [showCreateDropdown, setShowCreateDropdown] = useState(false);
```

---

## Additional VS Code-like Features

### 3. Activity Bar (Left Sidebar Icons)

VS Code has a narrow activity bar on the far left with icons for Explorer, Search, Source Control, Extensions, etc.

**Implementation:**
- Create `src/ide/ActivityBar.tsx` with vertical icon buttons
- Each icon toggles a different sidebar panel (Files, Search, Git)
- Place it between the IDE border and the file explorer
- Wrap the left panel in a container: ActivityBar + FileExplorer

```tsx
// ActivityBar.tsx
const ACTIVITY_ITEMS = [
  { id: 'files', icon: File01Icon, label: 'Explorer' },
  { id: 'search', icon: Search01Icon, label: 'Search' },
  { id: 'git', icon: GitBranch01Icon, label: 'Source Control' },
];

export function ActivityBar({ activePanel, onPanelChange }) {
  return (
    <div className="w-[48px] shrink-0 bg-muted/30 border-r border-border flex flex-col items-center py-2 gap-1">
      {ACTIVITY_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => onPanelChange(item.id)}
          className={`w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors cursor-pointer
            ${activePanel === item.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
          title={item.label}
        >
          <HugeiconRenderer icon={item.icon} size={20} />
        </button>
      ))}
    </div>
  );
}
```

### 4. Minimap (Code Outline)

Add a minimap to the right side of the editor using CodeMirror's minimap extension or a custom canvas renderer.

```bash
npm install @codemirror/view
```

In `Editor.tsx`, add the minimap extension:

```tsx
import { EditorView, minimap } from '@codemirror/view';

// In CodeMirror extensions array:
extensions: [
  extension,
  minimap(),
].filter(Boolean)
```

### 5. Breadcrumbs (File Path Above Editor)

VS Code shows a clickable breadcrumb path above the editor (e.g. `src > components > ide > Editor.tsx`).

**Implementation in `Editor.tsx`:**

```tsx
// Above the tab bar or between tab bar and code
<div className="flex items-center gap-1 px-3 py-1 text-[11px] text-muted-foreground bg-muted/20 border-b border-border">
  {activeTab.path.split('/').map((segment, i, arr) => (
    <React.Fragment key={i}>
      {i > 0 && <ChevronRightIcon size={12} />}
      <span className={i === arr.length - 1 ? 'text-foreground font-medium' : 'hover:text-foreground cursor-pointer'}>
        {segment}
      </span>
    </React.Fragment>
  ))}
</div>
```

### 6. Tab Close Middle-Click

VS Code closes tabs on middle-click. Add to `EditorTab.tsx`:

```tsx
onMouseDown={(e) => {
  if (e.button === 1) { onClose(e as any); }
}}
```

### 7. Draggable Tab Reordering

For tab reorder via drag and drop, use HTML5 drag API:

```tsx
// EditorTab.tsx
draggable
onDragStart={() => onTabDragStart(tab.id)}
onDrop={() => onTabDrop(tab.id)}
onDragOver={(e) => e.preventDefault()}
```

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| **P0** | Tabs fill full width | 15 min | High — visible gap annoys users |
| **P0** | Single + dropdown for file/folder | 30 min | High — cleaner UX |
| **P1** | Activity bar | 2 hours | Medium — foundation for IDE nav |
| **P1** | Breadcrumbs | 1 hour | Medium — better orientation |
| **P2** | Minimap | 1 hour | Low — nice-to-have |
| **P2** | Middle-click close | 15 min | Low — muscle memory |
| **P3** | Drag reorder tabs | 2 hours | Low — advanced UX |

---

## Quick Fix — Minimal Changes

For the most impactful fix with minimal code changes, just do these two things:

### A. Editor.tsx — tab bar wrapper

```tsx
// line 73
<div className="flex items-center border-b border-border">
  <div className="flex items-center overflow-x-auto flex-1 min-w-0">
    {tabs.map((tab) => (
      <EditorTab
        key={tab.id}
        tab={tab}
        isActive={tab.id === activeTabId}
        onSelect={() => onTabSelect(tab.id)}
        onClose={(e) => { e.stopPropagation(); onTabClose(tab.id); }}
      />
    ))}
  </div>
</div>
```

### B. EditorTab.tsx — flexible tab width

```tsx
// Change root className — add flex-1 min-w-0:
'group flex items-center gap-1 px-3 py-2 text-xs font-medium cursor-pointer rounded-t-[8px] select-none flex-1 min-w-0',

// Change name span — remove max-w-[120px], add flex-1:
<span className="truncate flex-1 min-w-0">{tab.name}</span>
```

### C. FileExplorer.tsx — single + dropdown

Replace the two buttons with the dropdown implementation from Fix 2 above.

---

## CSS Variables Reference

Current IDE-related CSS variables from `src/styles/index.css`:

```css
/* Tab bar */
--tab-bg: var(--card);
--tab-active-border: var(--border);
--tab-inactive-bg: var(--muted);

/* Editor */
--editor-font: 'JetBrains Mono', 'Fira Code', monospace;
--editor-font-size: 13px;
--editor-line-height: 1.6;

/* Explorer */
--explorer-width: 260px;
--explorer-item-height: 28px;
--explorer-indent: 16px;
```

---

## Edge Cases & Gotchas

1. **Tab overflow with flex-1**: When all tabs have `flex-1` and the bar is full, each tab gets equal width. With 20+ tabs, each tab shrinks to ~40px which is too small for the filename. Solution: once tabs reach a minimum width (~80px), switch to `overflow-x-auto` scroll behavior automatically. Use a `useRef` + `ResizeObserver` on the container.

2. **Dropdown click-outside**: The dropdown overlay (`fixed inset-0 z-40`) must be rendered before the dropdown menu in DOM order so click-outside works correctly.

3. **Tab close button overlap**: With very narrow tabs, the close button overlaps the filename. Solution: hide the close button on inactive tabs when the tab is below a certain width, keeping it only visible on the active tab or on hover.

4. **Explorer inline input vs dropdown**: The inline input (currently used) is actually fine for keyboard-heavy workflows. The dropdown approach only replaces the trigger button, not the creation input itself. When "New File..." is clicked from the dropdown, the same inline input appears in the tree.
