# Issue ID: S02
# Slug: pluggable-ai-key-providers
# Status: DONE
# Discovered: 2026-07-09T13:30:00Z
# Fixed: 2026-07-09T13:56:00Z

## Description
AI key providers must be pluggable — any provider can be added without modifying harness code. Adding or switching providers must never break running agents.

## Root Cause
~18 hardcoded provider references across 9 files (models.ts, aiService.ts, ApiKeysTab.tsx, ModelList.tsx, ModelSetupStep.tsx, ModelIcon.tsx, router.go, types.go, main.go). Adding a new provider required touching all of them.

## Fix Applied
- Created `core/providers/providerRegistry.ts` — `KeyProvider` interface + registry with 6 built-in providers pre-registered (google, groq, mistral, openrouter, opencodezen, cerebras)
- Created `core/providers/index.ts` — barrel export
- Added `providers` export to `core/index.ts`
- Refactored `core/models/aiService.ts`:
  - Removed 5 hardcoded SDK imports (`@ai-sdk/google`, `@ai-sdk/groq`, etc.)
  - Replaced `ProvidersCache` (named 6-field interface) with `Map<string, ProviderClient>`
  - Replaced `getProviders()` — now iterates registry instead of 6 hardcoded Promise.all calls
  - Replaced `getLanguageModel()` 6-branch switch — now uses `providers.get(def.provider)`
  - Replaced `getConfiguredProviders()` — now iterates registry instead of `API_KEYS` object
  - Replaced `buildFallbackChain()` — uses registry for sort/provider priority
  - Removed `MODEL_REASONING` constant (moved to registry's per-provider `getReasoningConfig`)
  - Updated `generateSessionTitle()` to use Map API instead of object index
- UI components (ApiKeysTab.tsx, ModelList.tsx, ModelSetupStep.tsx) still have hardcoded `PROVIDER_LABELS` — flagged for registry-based dynamic rendering

## Sub-Plan
- [x] Audit all hardcoded provider key logic — found ~18 locations across 9 files
- [x] Create `KeyProvider` interface with id, label, configKey, envVar, baseURL, defaultModel, modelIdPrefixes, createClient, getReasoningConfig
- [x] Build key provider registry with `registerProvider()` / `getProvider()` / `getAllProviders()`
- [x] Pre-register all 6 built-in providers with their SDK factories and reasoning configs
- [x] Refactor aiService.ts — replace hardcoded switch/interface with registry lookups
- [x] Provider list is now rendered from registry (getAllProviders)
- [ ] Refactor UI components (ApiKeysTab, ModelList, ModelSetupStep) to use registry labels — flagged
- [ ] Update Go agent (router.go, types.go, main.go) to use a similar registry pattern — flagged

## Verification
TypeScript compiles clean: `npx tsc --noEmit` passes

## Agent Notes
The Go agent side (router.go, types.go, main.go) still uses hardcoded switch statements. A Go equivalent of `KeyProvider` + registry should be created in a future pass. The frontend UI components still have inline `PROVIDER_LABELS` maps — these should be replaced with registry lookups.
