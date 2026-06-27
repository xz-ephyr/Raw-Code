# Web Search Tool — Implementation Plan

> **Date:** 2026-06-27
> **Status:** Planned
> **Icon (Hugeicons):** `Search02Icon` / `SearchEngineIcon`

---

## Overview

Give the AI the ability to search the web for up-to-date information. The AI will call a `webSearch` tool during conversation, fetch results from a search API, and incorporate them into its response.

---

## Architecture

```
User Message
  │
  ▼
AI Model (calls webSearch tool)
  │
  ▼
webSearchTool (Vercel AI SDK tool)
  │
  ▼
WebSearchService (API client)
  │
  ▼
Search Provider (Tavily / Brave / Google Custom Search)
  │
  ▼
Results returned → AI reads them → formulates response
```

### Layers

| Layer | File | Purpose |
|-------|------|---------|
| **Tool Definition** | `src/services/ai/tools/webSearchTool.ts` | Zod schema + tool metadata for Vercel AI SDK |
| **Service** | `src/services/WebSearchService.ts` | HTTP client abstraction over search providers |
| **Registration** | `src/services/aiService.ts` | Add `webSearch` to the `tools` object in `streamText()` |
| **System Prompt** | `src/services/ai/config.ts` | Add instructions on when/how to use web search |
| **Config (UI)** | `src/config/models.ts` (or new config) | API key storage for search provider |
| **Settings UI** | `src/components/settings/SettingsModal.tsx` | Input field for search API key |

---

## Search Provider Options

| Provider | API Key Required | Free Tier | Notes |
|----------|-----------------|-----------|-------|
| **Tavily** | ✅ Yes | 1,000 credits/mo free | Built for AI agents; returns clean, parsed results. Recommended. |
| **Brave Search** | ✅ Yes | 2,000 queries/mo free | Good results, simple REST API. Good fallback. |
| **Google Custom Search** | ✅ Yes | 100 queries/day free | Requires CX (search engine ID) + API key. More complex setup. |
| **DuckDuckGo** | ❌ No | Unlimited | No official API; scraping or third-party libs. Unreliable for production. |

**Recommendation:** Support **Tavily** as the primary provider (AI-native, clean results) with **Brave Search** as an alternative. Allow user to choose.

---

## Tool Definition (Schema)

```ts
// src/services/ai/tools/webSearchTool.ts

import { tool } from 'ai';
import { z } from 'zod';

export const webSearchTool = tool({
  description: 'Search the web for current information. Use this when you need up-to-date data, recent news, documentation, or facts beyond your training cutoff.',
  parameters: z.object({
    query: z.string().describe('The search query. Be specific and concise for best results.'),
    maxResults: z.number().optional().default(5).describe('Maximum number of search results to return (1–10).'),
  }),
  execute: async ({ query, maxResults }) => {
    // Calls WebSearchService.search(query, maxResults)
    // Returns structured results
  },
});
```

## Data Flow

### 1. AI calls the tool

The AI model detects it needs current information and calls:
```
webSearch({ query: "latest TypeScript 5.8 features", maxResults: 5 })
```

### 2. Service fetches results

`WebSearchService.search()` makes an HTTP request to the configured provider and returns:

```ts
interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;       // Full page content (Tavily)
  publishedDate?: string;
}

interface WebSearchResponse {
  results: WebSearchResult[];
  totalResults: number;
}
```

### 3. AI receives results

The tool's `execute` returns the results as a string or structured object. The AI reads them and incorporates the information into its response, citing sources.

### 4. UI displays tool invocation

The existing `AssistantBubble` already shows non-writeArtifact tool invocations with a "running"/"done" badge. The web search tool will automatically get this treatment for free.

---

## Provider API Details

### Tavily (`https://api.tavily.com`)

```
POST https://api.tavily.com/search
{
  "api_key": "...",
  "query": "...",
  "search_depth": "basic",     // or "advanced"
  "max_results": 5,
  "include_answer": true,      // include AI-generated summary
  "include_raw_content": false
}
```

Response:
```json
{
  "answer": "An AI-generated summary...",
  "results": [
    {
      "title": "...",
      "url": "...",
      "content": "Cleaned page content...",
      "published_date": "...",
      "score": 0.98
    }
  ]
}
```

### Brave Search (`https://api.search.brave.com`)

```
GET https://api.search.brave.com/res/v1/web/search?q=...&count=5
Headers: X-Subscription-Token: <key>
```

Response:
```json
{
  "web": {
    "results": [
      {
        "title": "...",
        "url": "...",
        "description": "...",
        "age": "...",
        "page_age": "..."
      }
    ]
  }
}
```

---

## Files to Create / Modify

### New Files

| File | Description |
|------|-------------|
| `src/services/ai/tools/webSearchTool.ts` | Vercel AI SDK tool definition |
| `src/services/WebSearchService.ts` | Search provider abstraction (Tavily, Brave) |

### Modified Files

| File | Changes |
|------|---------|
| `src/services/aiService.ts` | Import + register `webSearchTool` in the `tools` object |
| `src/services/ai/config.ts` | Add web search usage instructions to system prompt |
| `src/config/models.ts` | Add `SEARCH_API_KEY` and `SEARCH_PROVIDER` storage keys |
| `src/components/settings/SettingsModal.tsx` | Add API key field for search provider |
| `src/pages/ChatPage.tsx` | No changes needed (tool invocation display is automatic) |

---

## System Prompt Additions

Add to `src/services/ai/config.ts`:

```
### WEB SEARCH
You have access to a `webSearch` tool that can search the web for current information.

Use web search when:
- The user asks about recent events, news, or time-sensitive topics
- You need documentation for a specific library/framework version
- The user asks for data you're not confident about
- You need to verify facts or find sources

When using web search:
1. Call the `webSearch` tool with a specific, well-formed query
2. Wait for results before responding
3. Cite sources by including the URL in your response
4. Summarize the relevant information — do not just dump raw results

Do NOT use web search for:
- Simple coding questions you can answer confidently
- General knowledge within your training data
- User's own code or project files (you already have file context)
```

---

## Settings UI

Add a new section to `SettingsModal.tsx`:

```
┌─────────────────────────────────────┐
│  Web Search                         │
│                                     │
│  Provider: [Tavily ▼]              │
│  API Key:  [•••••••••••••••••]     │
│                                     │
│  Get a free API key at tavily.com   │
└─────────────────────────────────────┘
```

Stored in localStorage as:
- `search-provider` → `"tavily"` | `"brave"`
- `search-api-key` → the key

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No API key configured | Tool returns "Web search is not configured. Please add a search API key in Settings." |
| API rate limit exceeded | Tool returns "Search rate limit exceeded. Try again later." |
| Network error | Tool returns "Search request failed. Check your connection and try again." |
| Empty results | Tool returns "No results found for '{query}'. Try a different query." |

The AI will read these error messages and inform the user appropriately.

---

## Implementation Order

1. Create `WebSearchService.ts` — search provider client
2. Create `webSearchTool.ts` — Vercel AI SDK tool definition
3. Register tool in `aiService.ts`
4. Update system prompt in `config.ts`
5. Add API key storage keys in `models.ts`
6. Add settings UI in `SettingsModal.tsx`
7. Test with various queries

---

## Future Enhancements

- **Web page content extraction** — a separate `fetchPage` tool that retrieves full page content from a URL
- **Scraping mode** — for providers that return URLs but not content, use a readability extractor
- **Search within specific sites** — allow `site:example.com` queries or a `site` parameter
- **Image search** — separate tool for image search results
- **News search** — separate tool or parameter for news-specific results
- **Plugins integration** — once the Plugins tab is built, web search becomes a toggleable built-in plugin
