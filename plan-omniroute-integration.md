# OmniRoute Integration Plan

## Goal

Run OmniRoute as a **separate app** on this device and connect **this OpenCode app** to it via its API endpoint — replacing the current ZenMux provider with OmniRoute's smart routing across 237 providers.

---

## Phase 1: Install & Run OmniRoute

OmniRoute is a Next.js server that runs as a standalone process. Three ways to install:

### Option A: npm global install (recommended — ✅ verified working)

```bash
npm install -g omniroute   # takes ~9-10 min, 1176 packages
omniroute                  # starts the server
```

The binary is at `C:\Users\zephy\AppData\Roaming\npm\omniroute.cmd`.  
Dashboard at `http://localhost:20128`, API at `http://localhost:20128/v1`.

> **Note:** The npm package is large (~500MB+) and takes several minutes to install.

### Option B: npx (no global install)

```bash
npx omniroute
```

Downloads and runs on demand. Useful for testing without a permanent install.

### Verification

```bash
curl http://localhost:20128/v1/models -H "Authorization: Bearer test"
```

Should return a JSON list of models.

### Post-Install Setup

1. Open `http://localhost:20128` in browser
2. Create an admin password
3. Go to **Providers** → connect at least one provider (e.g., Kiro AI for free Claude, or your existing API keys)
4. Go to **Endpoints** → create an API key (copy this for later)

---

## Phase 2: Register OmniRoute as a Provider in OpenCode

### File: `core/providers/providerRegistry.ts`

**Goal:** Add OmniRoute as a registered provider alongside (or replacing) ZenMux.

**Changes:**

1. Add a new `KeyProvider` entry:
   - `id`: `'omniroute'`
   - `label`: `'OmniRoute'`
   - `configKey`: `'omniroute-api-key'`
   - `baseURL`: `'http://localhost:20128/v1'`
   - `defaultModel`: `'auto'`
   - `createClient`: Uses `createOpenAI` from `@ai-sdk/openai` (same as ZenMux)
   - `modelIdPrefixes`: Includes all OmniRoute prefixes like `auto/`, `cc/`, `cx/`, `openai/`, `anthropic/`, `google/`, etc.
   - `getReasoningConfig`: Returns `{ mode: 'native' }` since OmniRoute handles thinking natively

2. Keep ZenMux as a fallback or remove it once OmniRoute is stable.

**Key insight:** OmniRoute exposes an **OpenAI-compatible API** (`/v1/chat/completions`), so the same `@ai-sdk/openai` client works. No SDK changes needed.

---

## Phase 3: Update Model Definitions

### File: `core/config/models.ts`

**Goal:** Add OmniRoute's routing models and optionally fetch live model catalog.

**Changes:**

1. Add auto-routing models:
   ```typescript
   { id: 'auto', provider: 'omniroute', label: 'Auto (Smart Routing)', supportsThinking: true },
   { id: 'auto/coding', provider: 'omniroute', label: 'Auto Coding', supportsThinking: true },
   { id: 'auto/cheap', provider: 'omniroute', label: 'Auto Cheap', supportsThinking: false },
   { id: 'auto/fast', provider: 'omniroute', label: 'Auto Fast', supportsThinking: false },
   ```

2. Optionally add specific model IDs (these work when OmniRoute has the corresponding provider connected):
   ```typescript
   { id: 'cc/claude-sonnet-4-6', provider: 'omniroute', label: 'Claude Sonnet 4.6', supportsThinking: true },
   { id: 'openai/gpt-5.5', provider: 'omniroute', label: 'GPT 5.5', supportsThinking: true },
   ```

3. Replace `getAIModels()` to also fetch live models from OmniRoute's `/v1/models` endpoint (optional enhancement).

---

## Phase 4: Simplify Model Routing / Fallback Chain

### File: `core/models/aiService.ts`

**Goal:** Let OmniRoute handle routing internally instead of the app's manual fallback chain.

**Changes:**

1. In `buildFallbackChain()`: If the primary model starts with `auto`, return just that single model — OmniRoute handles fallback across its 237 providers with 17 strategies internally.

2. In `chatCompletion()`: The existing loop that tries models sequentially will still work, but with OmniRoute's `auto` model, it only needs one attempt.

---

## Phase 5: Wire Up API Key UI

**File:** `src/components/settings/tabs/ApiKeysTab.tsx`

**Check:** The existing settings UI reads `p.configKey` from each registered provider (see `getProviderApiKeys()` in providerRegistry). Since OmniRoute's `configKey` is `'omniroute-api-key'`, it should appear automatically in the API Keys settings tab.

If it doesn't, add a mapping for the OmniRoute key field.

---

## Phase 6: Test the Connection

### Test Flow

1. Start OmniRoute server (`docker run -p 20128:20128 diegosouzapw/omniroute` or `npx omniroute`)
2. Open the OmniRoute dashboard at `http://localhost:20128`
3. Connect at least one provider in the OmniRoute dashboard
4. Create an API key in OmniRoute Endpoints page
5. Open your OpenCode app → Settings → API Keys
6. Add your OmniRoute API key under the `omniroute` provider
7. Start a chat — the app should route through OmniRoute

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| OmniRoute not starting | Port 20128 in use | `omniroute --port 3000` |
| `curl /v1/models` fails | OmniRoute not running | Check `docker ps` or process list |
| "No API key configured" | Key not saved in app settings | Add key via Settings → API Keys |
| Auth errors from OmniRoute | No provider connected in OmniRoute dashboard | Open OmniRoute → Providers → add one |
| Model not found | Model ID doesn't match OmniRoute catalog | Use `auto` as model ID |

---

## File Change Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `core/providers/providerRegistry.ts` | **Modified** | Added `omniroute` provider registration |
| `core/config/models.ts` | **Modified** | Added OmniRoute auto-routing models, changed `DEFAULT_MODEL` to `'auto'` |
| `core/models/aiService.ts` | **Modified** | Simplified fallback chain — returns single model for `auto`-prefixed models |
| `agent/internal/model/router.go` | **Modified** | Added OmniRoute provider, updated fallback order, changed default model to `'auto'` |
| `src/stores/projectStore.ts` | **Modified** | Changed default `selectedModel` from `'z-ai/glm-4.7-flash-free'` to `'auto'` |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│              Your OpenCode App               │
│  (React/TypeScript — this repo)              │
│                                               │
│  core/providers/providerRegistry.ts           │
│    → uses @ai-sdk/openai client              │
│    → baseURL: http://localhost:20128/v1       │
│    → apiKey: <from settings>                  │
└─────────────────────┬───────────────────────┘
                      │ POST /v1/chat/completions
                      │ Authorization: Bearer <key>
                      ▼
┌─────────────────────────────────────────────┐
│           OmniRoute Gateway                   │
│  (separate process — Docker/npx/npm)          │
│                                               │
│  ● Auto-routing (17 strategies)               │
│  ● 4-tier fallback chain                      │
│  ● Token compression (RTK + Caveman)          │
│  ● Circuit breakers                           │
│  ● One dashboard: http://localhost:20128      │
└──────┬──────────┬──────────┬─────────────────┘
       │          │          │
       ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Claude  │ │  GPT    │ │  Free   │
│ (API)   │ │ (API)   │ │ (Kiro…) │
└─────────┘ └─────────┘ └─────────┘
```

---

## Future Enhancements

1. **Dynamic model catalog**: Fetch `/v1/models` from OmniRoute at app startup to show all available models in the model picker
2. **Multiple OmniRoute instances**: Connect to remote OmniRoute instances (VPS, cloud) by changing the `baseURL`
3. **Usage tracking**: Read OmniRoute's usage API to show token/cost stats in the app
4. **Fallback to ZenMux**: Keep ZenMux as a backup in case OmniRoute is down
