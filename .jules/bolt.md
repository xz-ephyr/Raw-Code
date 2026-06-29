## 2025-05-15 - [Sidebar & Icon Memoization]
**Learning:** List items in the sidebar (like `ProjectItem`) and high-frequency UI elements (like `HugeiconRenderer`) can cause significant rendering overhead if not memoized. Stabilizing handlers with `useCallback` in the parent is necessary but must account for navigation-driven state (e.g., `location.pathname`) to be truly effective.
**Action:** Always memoize recurring list items and centralized UI components. When using `useCallback`, ensure the dependency array is as minimal as possible but includes all necessary routing hooks if the handler depends on the current path.

## 2025-05-16 - [ReactMarkdown Optimization]
**Learning:** Passing unstable object literals to the `components` prop or unstable arrays to `remarkPlugins` in `ReactMarkdown` causes the entire markdown tree to re-render on every update. This is particularly expensive during streaming.
**Action:** Move `remarkPlugins` to a module-level constant and wrap the `components` prop in `useMemo` to ensure stable references and prevent redundant tree re-renders.

## 2025-05-17 - [Citations in ReactMarkdown v10]
**Learning:** Customizing text nodes in `react-markdown` v10 via the `text` renderer is unsupported.
**Action:** Use a custom `remark` plugin with `unist-util-visit` to transform text into custom nodes (e.g., using `hName`), then render those nodes via the `components` prop.

## 2026-06-29 - [ThinkingTimeline Markdown Optimization]
**Learning:** In `ThinkingTimeline.tsx`, passing a new array literal `[remarkGfm]` to `ReactMarkdown` on every render triggers redundant re-renders of the entire markdown tree during streaming.
**Action:** Move `remarkPlugins` to a module-level constant and wrap the component in `React.memo` to ensure stable references and skip unnecessary re-renders.
