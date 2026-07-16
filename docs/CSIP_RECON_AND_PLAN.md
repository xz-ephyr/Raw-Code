# CSIP-Ω Reconnaissance & Migration Plan: Hugeicons → Lucide

## Validated User Intent

| Layer | Description |
|-------|-------------|
| **Surface request** | Migrate "icn library" to Lucide (Option 3 — new feature migration) |
| **Actual target** | `@hugeicons/react` v1.1.9 + `@hugeicons/core-free-icons` v4.2.2 → `lucide-react` |
| **Migration strategy** | Phased, incremental: start with Sidebar, then one file at a time on user signal |
| **Constraint** | Keep hugeicons installed alongside Lucide until migration is complete |
| **Coverage** | ~42 component files, ~100+ icon instances across the app |

---

## Sub-Agent 1 — Key Findings

### Current Icon Library
- **Sole icon library**: `@hugeicons/react` + `@hugeicons/core-free-icons`
- **Total files importing icons**: ~42 (38 from hugeicons, 3 with custom SVGs, 1 ModelIcon)
- **Total icon usage sites**: ~100+

### Sidebar.tsx (First Target) — Specifics
- **13 Hugeicons used**, 14 usage sites across 392 lines
- **13/13 have good-to-exact Lucide equivalents** — no blockers
- **Rendering pattern**: Exclusively uses `HugeiconRenderer` wrapper (indirection via `icon` prop)
- **Pre-rendered constants**: 6 module-level JSX constants passed as `ReactNode` to `SidebarTab`
- **SidebarTab** is library-agnostic — no changes needed
- **No tests** exist for Sidebar or HugeiconRenderer

### Critical API Differences

| Property | HugeiconRenderer (current) | Lucide (target) |
|----------|---------------------------|-----------------|
| Component pattern | `<HugeiconRenderer icon={X} />` | `<X />` (direct) |
| Default `size` | 18 | 24 |
| Default `strokeWidth` | 1.5 | 2 |
| Default `color` | `currentColor` | `currentColor` |
| Memoization | Manual `React.memo` wrapper | Built-in per icon |

---

## Sub-Agent 2 — Professional Engineering Reasoning

### Correct Approach
1. **Direct substitution** — replace `<HugeiconRenderer icon={X} />` with `<X size={18} strokeWidth={1.5} />`
2. **Explicit props are mandatory** — omitting `size`/`strokeWidth` produces visibly different icons
3. **Imports** — replace hugeicons named imports block with lucide-react named imports block
4. **HugeiconRenderer untouched** — leave the file and re-export until all files are migrated
5. **No behavioral changes** — icons are purely presentational

### Trade-offs
| Factor | Assessment |
|--------|-----------|
| Visual regression risk | High if `size`/`strokeWidth` omitted — mitigation: enforce rule in every migration |
| Future drift risk | New icons in migrated files may use Lucide defaults (24/2) — consider lint rule or wrapper |
| Dual dependency bloat | Temporary, acceptable — both libraries coexist during migration |
| Bundle impact | Net improvement after full migration (lucide is smaller per-icon) |

### Testing Strategy
- No existing tests — manual visual inspection for first file
- Build + inspect: collapsed sidebar, expanded sidebar, thread context menu, dark/light toggle
- After full migration: comprehensive visual audit before removing hugeicons

---

## Sub-Agent 3 — Placement & Introduction Strategy

### Step 1: Install Dependency
```bash
npm install lucide-react
```
This adds `lucide-react` to `package.json` dependencies alongside existing hugeicons.

### Step 2: Sidebar.tsx Changes (Exact Diff)

**Imports (lines 4-18)** — Replace Hugeicons import block with Lucide import block:
```
- import { PencilEdit02Icon, ResourcesAddIcon, Settings02Icon, PanelLeftIcon, PanelRightIcon,
           FolderLibraryIcon, Download01Icon, CursorRectangleSelection02Icon, Moon01Icon, Sun01Icon,
           MoreVerticalIcon, ArchiveIcon, Delete02Icon } from '@hugeicons/core-free-icons';
+ import { SquarePen, Puzzle, Settings, PanelLeft, PanelRight, Folder, Download,
+          MousePointerSquare, Moon, Sun, MoreVertical, Archive, Trash2 } from 'lucide-react';
```

**Remove line 25** — `import { HugeiconRenderer } from '../ui/HugeiconRenderer'`

**Module-level constants (lines 28-33)** — Replace 6 icon constants with Lucide equivalents:
- `<HugeiconRenderer icon={PencilEdit02Icon} />` → `<SquarePen size={18} strokeWidth={1.5} />`
- `<HugeiconRenderer icon={FolderLibraryIcon} />` → `<Folder size={18} strokeWidth={1.5} />`
- `<HugeiconRenderer icon={ResourcesAddIcon} />` → `<Puzzle size={18} strokeWidth={1.5} />`
- `<HugeiconRenderer icon={Download01Icon} />` → `<Download size={18} strokeWidth={1.5} />`
- `<HugeiconRenderer icon={CursorRectangleSelection02Icon} />` → `<MousePointerSquare size={18} strokeWidth={1.5} />`
- `<HugeiconRenderer icon={Settings02Icon} />` → `<Settings size={18} strokeWidth={1.5} />`

**Collapse toggle (lines 126-130):**
- `<HugeiconRenderer icon={PanelRightIcon} />` → `<PanelRight size={18} strokeWidth={1.5} />`
- `<HugeiconRenderer icon={PanelLeftIcon} />` → `<PanelLeft size={18} strokeWidth={1.5} />`

**Theme toggle (line 225):**
- `<HugeiconRenderer icon={Sun01Icon} />` → `<Sun size={18} strokeWidth={1.5} />`
- `<HugeiconRenderer icon={Moon01Icon} />` → `<Moon size={18} strokeWidth={1.5} />`

**ThreadItem inline usages (lines 356-382):**
- `<HugeiconRenderer icon={MoreVerticalIcon} size={14} />` → `<MoreVertical size={14} strokeWidth={1.5} />`
- `<HugeiconRenderer icon={PencilEdit02Icon} size={13} className="text-muted-foreground" />` → `<SquarePen size={13} strokeWidth={1.5} className="text-muted-foreground" />`
- `<HugeiconRenderer icon={ArchiveIcon} size={13} className="text-muted-foreground" />` → `<Archive size={13} strokeWidth={1.5} className="text-muted-foreground" />`
- `<HugeiconRenderer icon={Delete02Icon} size={13} />` → `<Trash2 size={13} strokeWidth={1.5} />`

### Impact Radius
- **No other files affected** — Sidebar is the sole changed file
- **SidebarTab** receives `ReactNode` — no interface change
- **HugeiconRenderer** remains untouched — still used by 6+ other files

### Rollback
```bash
# Before migration:
git checkout -b migrate/lucide-sidebar

# Revert if needed:
git checkout -- src/components/sidebar/Sidebar.tsx
npm uninstall lucide-react
```

### Future File Migration Recipe
1. Audit — count icons, map equivalents, note custom props
2. Transform — replace imports + JSX, add explicit `size`/`strokeWidth`
3. Verify — type-check, lint, build, visual inspection
4. Signal — inform user, proceed on approval

### Verification Checklist (Post-Migration)
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run lint` — zero errors  
- [ ] `npm run build` — succeeds
- [ ] No `@hugeicons/` imports remain in Sidebar.tsx
- [ ] No `HugeiconRenderer` references in Sidebar.tsx
- [ ] `lucide-react` listed in `package.json` dependencies
- [ ] Visual parity confirmed: all 13 icons at correct size/stroke

---

## Risks & Recommendations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Visual regression from default differences | High | Always pass explicit `size` + `strokeWidth` |
| Future icon additions use wrong defaults | Medium | Consider a small `LucideIcon` wrapper with app defaults |
| Icon name changes across Lucide versions | Low | Pin `lucide-react` version during migration |
| Dual bundle size during migration | Low | Temporary, acceptable trade-off |

**Recommendation**: Proceed with Sidebar migration as planned. The change is self-contained, well-understood, and fully reversible. After Sidebar is verified, continue file-by-file on user signal.
