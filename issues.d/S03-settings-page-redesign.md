# Issue ID: S03
# Slug: settings-page-and-ide-redesign
# Status: DONE
# Discovered: 2026-07-09T13:30:00Z
# Fixed: 2026-07-09T14:00:00Z

## Description
Convert settings from modal overlay to full page. Refresh IDE layout.

## Root Cause
Settings was a fixed-position modal overlay (`SettingsModal.tsx`), not a route-based page. No `← Back to Home` navigation.

## Fix Applied
- Created `src/pages/SettingsPage.tsx` — full page with same tab structure as modal
- Added `← Back to Home` button top-left that routes to `/thread/new`
- Added `/settings` route in `App.tsx` (lazy-loaded)
- Updated `Sidebar.tsx`:
  - Settings button now navigates to `/settings` instead of opening modal
  - Removed `isSettingsOpen` state and `<SettingsModal>` rendering
  - Removed `SettingsModal` import

## Sub-Plan
- [x] Convert settings modal → full SettingsPage route
- [x] Add top-left `← Back to Home` arrow → routes to new thread page
- [ ] Audit IDE layout — spacing, alignment, contrast (deferred)
- [ ] Apply IDE redesign (deferred)

## Verification
TypeScript compiles clean. Settings page accessible at `/settings` route. Sidebar links to `/settings`.

## Agent Notes
IDE layout audit and redesign deferred — the IDEShell uses ActivityBar + FileExplorer + CodeMirror + StatusBar layout. Apply changes in future pass.
