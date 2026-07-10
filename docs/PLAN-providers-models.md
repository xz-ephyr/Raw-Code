# Plan: Multi-Provider Model System

> Add 10 free AI providers with 44+ models, redesign Settings into 3 tabs, and unify model selection UX.

---

## 1. Provider Registration

**File:** `core/providers/providerRegistry.ts`

Register each provider using `registerProvider()`. All providers use OpenAI-compatible APIs via `createOpenAI()` from the Vercel AI SDK.

### Providers to Register

| # | ID | Label | Base URL | Config Key | Notes |
|---|-----|-------|----------|------------|-------|
| 1 | `google` | Google AI Studio | `https://generativelanguage.googleapis.com/v1beta/openai` | `google-api-key` | Gemini models, 1M context |
| 2 | `groq` | Groq | `https://api.groq.com/openai/v1` | `groq-api-key` | Fastest inference (750 t/s) |
| 3 | `cerebras` | Cerebras | `https://api.cerebras.ai/v1` | `cerebras-api-key` | Ultra-fast (3000 t/s) |
| 4 | `mistral` | Mistral AI | `https://api.mistral.ai/v1` | `mistral-api-key` | Strong coding/reasoning |
| 5 | `sambanova` | SambaNova | `https://api.sambanova.ai/v1` | `sambanova-api-key` | Fast + $5 free credit |
| 6 | `cohere` | Cohere | `https://api.cohere.com/compatibility/v1` | `cohere-api-key` | RAG-focused models |
| 7 | `huggingface` | Hugging Face | `https://api-inference.huggingface.co/v1` | `huggingface-api-key` | Open model hub |
| 8 | `cloudflare` | Cloudflare AI | `https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1` | `cloudflare-api-key` | Edge inference, sub-100ms |
| 9 | `nvidia` | NVIDIA NIM | `https://integrate.api.nvidia.com/v1` | `nvidia-api-key` | 1000 free credits |
| 10 | `deepseek` | DeepSeek | `https://api.deepseek.com/v1` | `deepseek-api-key` | Cheapest API, 1M context |

### Provider Registration Pattern

```typescript
registerProvider({
  id: 'google',
  label: 'Google AI Studio',
  configKey: 'google-api-key',
  envVar: 'GOOGLE_API_KEY',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  defaultModel: 'gemini-2.5-flash',
  modelIdPrefixes: ['gemini'],
  createClient: (apiKey, baseURL) =>
    createOpenAI({ apiKey, baseURL: baseURL ?? 'https://generativelanguage.googleapis.com/v1beta/openai' }),
  getReasoningConfig: (modelId) => {
    if (modelId.includes('2.5') || modelId.includes('3.')) return { mode: 'native' };
    return null;
  },
});
```

### Cloudflare Special Handling

Cloudflare requires `accountId` in the URL. Store it as a separate config key (`cloudflare-account-id`) and interpolate it in `createClient`:

```typescript
createClient: async (apiKey) => {
  const accountId = await DatabaseService.getConfig('cloudflare-account-id');
  return createOpenAI({ apiKey, baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1` });
}
```

### Keep Existing `omniroute` Provider

Keep the current `omniroute` provider as-is for users who use OmniRoute. It stays the default.

---

## 2. Model Definitions

**File:** `core/config/models.ts`

Replace the current 4-model array with all models from `FREEProviders.md`. Each model gets:
- `id` — the actual API model ID
- `provider` — must match a registered provider's `id`
- `label` — human-readable name (what users see in dropdown)
- `supportsThinking` — whether the model supports reasoning/thinking mode

### Model List (by provider)

#### Google AI Studio
| ID | Label | Context | Thinking |
|----|-------|---------|----------|
| `gemini-2.5-flash` | Gemini 2.5 Flash | 1M | Yes |
| `gemini-3.0-flash-preview` | Gemini 3.0 Flash | 1M | Yes |
| `gemini-3.1-flash-lite-preview` | Gemini 3.1 Flash Lite | 128K | No |

#### Groq
| ID | Label | Context | Thinking |
|----|-------|---------|----------|
| `llama-4-scout-17b-16e-instruct` | Llama 4 Scout | 131K | No |
| `llama-3.3-70b-versatile` | Llama 3.3 70B | 131K | No |
| `qwen3-32b` | Qwen3 32B | 131K | No |
| `deepseek-r1-distill-llama-70b` | DeepSeek R1 70B | 131K | Yes |
| `gpt-oss-120b` | GPT-OSS 120B | 131K | No |

#### Cerebras
| ID | Label | Context | Thinking |
|----|-------|---------|----------|
| `gpt-oss-120b` | GPT-OSS 120B | 131K | No |
| `zai-glm-4.7` | Z.ai GLM 4.7 | 131K | No |
| `gemma-4-31b` | Gemma 4 31B | 262K | No |

#### Mistral AI
| ID | Label | Context | Thinking |
|----|-------|---------|----------|
| `mistral-small-3.2` | Mistral Small 3.2 | 128K | No |
| `mistral-medium-3.5` | Mistral Medium 3.5 | 128K | Yes |
| `mistral-large-3` | Mistral Large 3 | 256K | Yes |
| `codestral` | Codestral | 256K | No |
| `pixtral-12b` | Pixtral 12B | 128K | No |

#### SambaNova
| ID | Label | Context | Thinking |
|----|-------|---------|----------|
| `Meta-Llama-3.3-70B-Instruct` | Llama 3.3 70B | 128K | No |
| `DeepSeek-V3.1` | DeepSeek V3.1 | 128K | No |
| `gpt-oss-120b` | GPT-OSS 120B | 128K | No |
| `DeepSeek-V3.2` | DeepSeek V3.2 | 32K | No |
| `gemma-4-31B-it` | Gemma 4 31B | 128K | No |

#### Cohere
| ID | Label | Context | Thinking |
|----|-------|---------|----------|
| `command-a-03-2026` | Command A | 256K | Yes |
| `command-a-plus` | Command A+ | 256K | Yes |
| `command-r-plus-08-2024` | Command R+ | 128K | Yes |
| `command-r-08-2024` | Command R | 128K | No |
| `command-r7b-12-2024` | Command R7B | 128K | No |
| `c4ai-aya-expanse-32b` | Aya Expanse 32B | 128K | No |

#### Hugging Face
| ID | Label | Context | Thinking |
|----|-------|---------|----------|
| `meta-llama/Llama-3.2-11B-Vision-Instruct` | Llama 3.2 11B Vision | 128K | No |
| `meta-llama/Meta-Llama-3.1-8B-Instruct` | Llama 3.1 8B | 128K | No |
| `Qwen/Qwen2.5-72B-Instruct` | Qwen2.5 72B | 32K | No |
| `google/gemma-2-9b-it` | Gemma 2 9B | 8K | No |

#### Cloudflare Workers AI
| ID | Label | Context | Thinking |
|----|-------|---------|----------|
| `@cf/meta/llama-3.1-8b-instruct` | Llama 3.1 8B | 128K | No |
| `@cf/meta/llama-3.2-3b-instruct` | Llama 3.2 3B | 128K | No |
| `@cf/qwen/qwen1.5-7b-chat-awq` | Qwen1.5 7B | 32K | No |
| `@cf/microsoft/phi-2` | Phi-2 | 2K | No |

#### NVIDIA NIM
| ID | Label | Context | Thinking |
|----|-------|---------|----------|
| `nvidia/nemotron-3-super-49b-v1` | Nemotron 3 Super 49B | 131K | No |
| `nvidia/nemotron-3-nano-30b-a3b` | Nemotron 3 Nano 30B | 131K | No |
| `meta/llama-3.1-8b-instruct` | Llama 3.1 8B | 128K | No |
| `mistralai/mistral-large-2-instruct` | Mistral Large 2 | 128K | Yes |

#### DeepSeek
| ID | Label | Context | Thinking |
|----|-------|---------|----------|
| `deepseek-chat` | DeepSeek V4-Flash | 1M | No |
| `deepseek-reasoner` | DeepSeek R1 | 128K | Yes |
| `deepseek-coder` | DeepSeek Coder | 128K | No |

---

## 3. Model Icon System

**File:** `src/components/ui/ModelIcon.tsx` (replace stub)

### Icon Mapping

Each provider has an icon SVG in `public/`. Map model IDs to icons based on provider prefix:

```typescript
const PROVIDER_ICONS: Record<string, string> = {
  google: '/gemini-color.svg',
  groq: '/groq.svg',        // exists in public/assets/images/providers/
  cerebras: '/cerebras.svg', // exists in public/assets/images/providers/
  mistral: '/mistral-color.svg',
  sambanova: '/sambanova.svg',
  cohere: '/cohere.svg',
  huggingface: '/huggingface.svg',
  cloudflare: '/cloudflare.svg',
  nvidia: '/nvidia.svg',
  deepseek: '/deepseek-color.svg',
  omniroute: '/opencodezen.svg',
};
```

### Resolution Logic

1. Look up model by ID in `MODELS` array
2. Get provider from model definition
3. Return icon path from `PROVIDER_ICONS[provider]`
4. Render as `<img src={iconPath} />`

### Icons Available in `public/`

| File | Provider |
|------|----------|
| `gemini-color.svg` | Google |
| `mistral-color.svg` | Mistral |
| `meta-color.svg` | Meta (for Llama models) |
| `gemma-color.svg` | Gemma (Google) |
| `commanda-color.svg` | Cohere |
| `deepseek-color.svg` | DeepSeek |
| `qwen-color.svg` | Qwen |
| `openai.svg` | OpenAI |
| `zai.svg` | Z.ai |

### Icons in `public/assets/images/providers/`

| File | Provider |
|------|----------|
| `groq.svg` | Groq |
| `cerebras.svg` | Cerebras |
| `google.svg` | Google |
| `mistral.svg` | Mistral |
| `openrouter.svg` | OpenRouter |

### Missing Icons (need to add to `public/`)

- `cohere.svg` — Cohere
- `huggingface.svg` — Hugging Face
- `cloudflare.svg` — Cloudflare
- `nvidia.svg` — NVIDIA
- `sambanova.svg` — SambaNova

---

## 4. Chat Input Model List (ModelList.tsx)

### Current Behavior
- Lists all models from `MODELS` array
- Shows model label only
- No provider indicator
- No icons

### New Behavior

**Display:** Models listed by **label** (name), not by provider. Models with the same name across providers (e.g. "Llama 3.3 70B" on Groq + SambaNova) appear as a single entry.

**Grouping:** Group by label, show provider indicators:

```
Llama 3.3 70B
  groq  sambanova
DeepSeek V3.1
  sambanova  deepseek
Gemini 2.5 Flash
  google
```

**Rendering per model:**
```
┌─────────────────────────────────────┐
│ [icon] Gemini 2.5 Flash        [⚡] │
│        google                        │
└─────────────────────────────────────┘
```

- Left: Model icon (16x16)
- Center: Model label (bold) + provider name below (small, muted)
- Right: Thinking indicator (blue ⚡) if applicable

**Selection:** When user selects a model, it uses the first available provider for that model name. If multiple providers offer the same model, show a sub-menu or cycle through providers.

### Deduplication Logic

```typescript
// Group models by normalized label
const grouped = MODELS.reduce((acc, model) => {
  const key = model.label.toLowerCase();
  if (!acc[key]) acc[key] = [];
  acc[key].push(model);
  return acc;
}, {} as Record<string, ModelDefinition[]>);
```

---

## 5. Settings Page Redesign

**File:** `src/pages/SettingsPage.tsx` + new tab components

### Current State
- Single "Default Model" selector
- API Keys tab
- Web Search tab

### New State: 3 Tabs

#### Tab 1: Overview (Dashboard)

**Purpose:** Real-time stats about model usage, performance, and health.

**Sections:**

1. **Usage Summary Cards** (top row)
   - Total Requests (today / all-time)
   - Success Rate (%)
   - Fallbacks Triggered (count)
   - Total Tokens Used

2. **Model Performance Table**
   | Model | Requests | Avg Latency | Success Rate | Last Used |
   |-------|----------|-------------|--------------|-----------|
   | Gemini 2.5 Flash | 142 | 1.2s | 98% | 2m ago |
   | DeepSeek R1 | 89 | 3.4s | 94% | 5m ago |

3. **Token Usage Chart** (simple bar chart or sparkline)
   - Tokens used per model over time
   - Color-coded by provider

4. **Error Log** (collapsible)
   - Recent errors with model name, error message, timestamp
   - Helps debug which models are failing

**Data Sources:**
- `usageTracker.ts` — already tracks usage per model
- `sessionStore.ts` — tracks `usedModels` per session
- Extend with: request count, success/failure counts, latency, token counts

#### Tab 2: Keys (API Keys)

**Purpose:** Enter and manage API keys for each provider.

**Layout:**
- Grid of provider cards
- Each card shows: Provider icon, name, input field, status indicator (green/red)
- Save button per card or global "Save All"

**Provider Cards:**
```
┌─────────────────────────────────────────┐
│ [icon] Google AI Studio                 │
│ ┌─────────────────────────────────────┐ │
│ │ AIzaSyC2wFQO...                    │ │
│ └─────────────────────────────────────┘ │
│ ● Connected  │  [Save]                 │
└─────────────────────────────────────────┘
```

**Auto-Detection:** On key save, ping the provider's API to verify the key works. Show green/red status.

**Storage:** Each key stored under its provider's `configKey` in both DatabaseService and localStorage.

#### Tab 3: Models (Model Browser)

**Purpose:** Browse all available models, grouped by provider.

**Layout:**
- Provider sections (collapsible)
- Each model shows: icon, name, context window, thinking support, provider badge

**Rendering:**
```
┌─ Google AI Studio ─────────────────────┐
│ [icon] Gemini 2.5 Flash     1M  ⚡     │
│ [icon] Gemini 3.0 Flash     1M  ⚡     │
│ [icon] Gemini 3.1 Flash Lite 128K      │
├─ Groq ─────────────────────────────────┤
│ [icon] Llama 4 Scout       131K        │
│ [icon] Llama 3.3 70B       131K        │
│ [icon] Qwen3 32B           131K        │
│ [icon] DeepSeek R1 70B     131K  ⚡    │
│ [icon] GPT-OSS 120B        131K        │
├─ Mistral AI ───────────────────────────┤
│ ...                                     │
└─────────────────────────────────────────┘
```

**Actions per model:**
- Click to set as default
- Toggle thinking support indicator
- Show provider details on hover

---

## 6. API Key Storage

**File:** `core/providers/providerRegistry.ts` (configKey per provider)

Each provider stores its key under a unique config key:

| Provider | Config Key | localStorage Key |
|----------|------------|------------------|
| omniroute | `omniroute-api-key` | `omniroute-api-key` |
| google | `google-api-key` | `google-api-key` |
| groq | `groq-api-key` | `groq-api-key` |
| cerebras | `cerebras-api-key` | `cerebras-api-key` |
| mistral | `mistral-api-key` | `mistral-api-key` |
| sambanova | `sambanova-api-key` | `sambanova-api-key` |
| cohere | `cohere-api-key` | `cohere-api-key` |
| huggingface | `huggingface-api-key` | `huggingface-api-key` |
| cloudflare | `cloudflare-api-key` | `cloudflare-api-key` |
| cloudflare | `cloudflare-account-id` | `cloudflare-account-id` |
| nvidia | `nvidia-api-key` | `nvidia-api-key` |
| deepseek | `deepseek-api-key` | `deepseek-api-key` |

### Retrieval (already works)

```typescript
// aiService.ts getProviders() — already iterates all registered providers
const key = await DatabaseService.getConfig(p.configKey)
  .then(r => r || localStorage.getItem(p.configKey) || '');
```

---

## 7. Fallback Chain (already works)

**File:** `core/models/aiService.ts`

The existing `buildFallbackChain()` function:
1. Takes the selected model name
2. Builds an ordered list of up to 5 fallback models
3. Avoids models already used in the session
4. Prioritizes models with matching `supportsThinking` level

**No changes needed.** Adding more models automatically gives more fallback options.

---

## 8. Agent Compatibility (already works)

**Files:** `core/agents/*.ts`

Agents are **model-agnostic**. They provide:
- `systemPrompt` — appended to base prompt
- `toolScope` — filters available tools

The model is selected independently by the user. No changes needed.

---

## 9. Implementation Order

| Step | Task | Files | Est. Effort |
|------|------|-------|-------------|
| 1 | Register 10 providers | `core/providers/providerRegistry.ts` | Medium |
| 2 | Add 44 models to MODELS array | `core/config/models.ts` | Small |
| 3 | Implement ModelIcon with provider icons | `src/components/ui/ModelIcon.tsx` | Small |
| 4 | Add missing icon SVGs to `public/` | `public/*.svg` | Small |
| 5 | Redesign Settings page with 3 tabs | `src/pages/SettingsPage.tsx` + new components | Large |
| 6 | Build Overview dashboard tab | New: `src/components/settings/tabs/OverviewTab.tsx` | Large |
| 7 | Build Keys tab | New: `src/components/settings/tabs/KeysTab.tsx` | Medium |
| 8 | Build Models tab | New: `src/components/settings/tabs/ModelsTab.tsx` | Medium |
| 9 | Update ModelList for dedup + provider indicators | `src/components/chat/ModelList.tsx` | Medium |
| 10 | Test fallback chain with new models | Manual testing | Small |
| 11 | Test agents with new models | Manual testing | Small |

---

## 10. Files Summary

### Files to Modify
| File | Change |
|------|--------|
| `core/providers/providerRegistry.ts` | Register 10 new providers |
| `core/config/models.ts` | Add 44 model definitions |
| `src/components/ui/ModelIcon.tsx` | Implement icon rendering |
| `src/components/chat/ModelList.tsx` | Dedup + provider indicators |
| `src/pages/SettingsPage.tsx` | Redesign with 3 tabs |
| `src/components/settings/tabs/ApiKeysTab.tsx` | Move to KeysTab or refactor |

### New Files to Create
| File | Purpose |
|------|---------|
| `src/components/settings/tabs/OverviewTab.tsx` | Dashboard with usage stats |
| `src/components/settings/tabs/KeysTab.tsx` | API key management |
| `src/components/settings/tabs/ModelsTab.tsx` | Model browser |

### Files to Add (Icons)
| File | Provider |
|------|----------|
| `public/cohere.svg` | Cohere |
| `public/huggingface.svg` | Hugging Face |
| `public/cloudflare.svg` | Cloudflare |
| `public/nvidia.svg` | NVIDIA |
| `public/sambanova.svg` | SambaNova |

### Files That Auto-Work (no changes needed)
| File | Why |
|------|-----|
| `core/models/aiService.ts` | Already generic, iterates all providers |
| `core/agents/*.ts` | Model-agnostic by design |
| `core/utils/goProxy.ts` | Tool execution independent of model |
| `src/pages/ChatPage.tsx` | Uses `chatCompletion()` which is generic |
| `src/components/onboarding/ModelSetupStep.tsx` | Iterates `getAllProviders()` |
| `src/components/schedule/ScheduleFormModal.tsx` | Uses `MODELS` array |
| `src/services/ScheduledTaskManager.ts` | Uses `MODELS` array |

---

## 11. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Some providers don't support OpenAI compat | Model calls fail | Test each provider, add custom `createClient` if needed |
| Cloudflare needs accountId in URL | Connection fails | Store accountId separately, interpolate in createClient |
| Model ID conflicts across providers | Wrong provider called | Use `modelIdPrefixes` to route correctly |
| Free tier rate limits hit | Requests fail | Fallback chain handles this automatically |
| Icon SVGs missing | No visual identifier | Add SVGs to public/ before Phase 3 |
| Existing users lose "auto" model | Breaking change | Keep `omniroute` + `auto` as default, don't remove |
