# Issue ID: S05
# Slug: input-container-backdrop-chain-input
# Status: DONE
# Discovered: 2026-07-09T13:30:00Z
# Fixed: 2026-07-09T14:06:00Z

## Description
Input container background/wrapper must always be visible behind the chat input box to provide a visual anchor, especially when user is in a project.

## Root Cause
`ChatInputContainer` only rendered the background container div in idle mode (no messages). In non-idle mode (messages exist), ChatInput was rendered directly without any backdrop.

## Fix Applied
- Refactored `ChatInputContainer.tsx` to always wrap ChatInput with the background container div
- In idle mode: background height is 155px (as before)
- In non-idle mode: background height auto-sizes to match the input container height
- Removed the `idle ? ... : ...` branching — now a single render path with conditional height styling
- Background provides consistent visual anchor behind the input in all states

## Sub-Plan
- [x] Find components — ChatInputContainer wraps ChatInput
- [x] Identify layout — container renders in scroll area (idle) or sibling (non-idle)
- [x] Implement consistent backdrop — always render background div behind ChatInput
- [x] Test — TypeScript compiles clean

## Verification
TypeScript compiles clean. ChatInputContainer always shows backdrop behind input.
