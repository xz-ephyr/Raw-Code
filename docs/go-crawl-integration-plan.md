# go-crawl Integration — Full Build-Out Plan

go-crawl (`crawler/`) is a self-hosted Firecrawl clone written in Go. It scrapes, crawls, searches, maps, and extracts content from the web — all without paid API keys.

---

## Current State

### go-crawl Endpoints (all wired to Raw-Code)

| Endpoint | What | TS Integration |
|----------|------|----------------|
| `POST /v1/scrape` | Scrape page → markdown, HTML, metadata, links | `searchService.fetchPage()` tier 1 |
| `GET /v1/search` | DuckDuckGo search + scrape results | `searchService.webSearch()` tier 1, `research` tool |
| `POST /v1/crawl` | Start async multi-page crawl | `crawl_website` Effect tool |
| `GET /v1/crawl/{id}` | Poll crawl results | `crawl_website` (internal) |
| `POST /v1/map` | Discover all site URLs | `map_site` Effect tool |
| `POST /v1/extract/videos` | Extract embedded videos | `extract_videos` Effect tool |

### Gaps

- **go-crawl:** No persistence (jobs lost on restart), no auth, no rate limiting, no robots.txt, no JS rendering, no structured extraction, no PDF support
- **Raw-Code:** Missing `scrape_url`, `extract_structured`, `research_compile`, `crawl_to_articles`, `monitor_page`, `import_video_sources` tools
- **Architecture:** No webhook callbacks, no crawl result persistence in Raw-Code, no RAG for crawled content

---

## Phase A — go-crawl Foundation (Reliability)

### A1 — SQLite/BoltDB Persistence

Store crawl jobs in an embedded key-value store so they survive restarts.

**What changes:**
- New `crawler/internal/store/` package
- `Store` interface: `Get(id)`, `Set(job)`, `List()`, `Delete(id)`
- `BoltStore` implementation using `go.etcd.io/bbolt`
- `JobStore` delegates to `Store` instead of in-memory `map`
- Existing `run()` goroutine writes results to store on completion

### A2 — Optional Auth Token

If `AUTH_TOKEN` env var is set, require `Authorization: Bearer <token>` on all routes.

**What changes:**
- `crawler/internal/api/router.go` — add auth middleware
- `crawler/cmd/server/main.go` — read env var, pass to `NewRouter`

### A3 — Rate Limiting

Per-host request timing + global concurrency cap.

**What changes:**
- `crawler/internal/crawler/` — add `rateLimiter` struct with per-host last-request tracking
- Minimum 500ms between requests to same host
- Maximum 10 concurrent crawls globally
- `crawler/internal/api/` — per-IP rate limit on scrape/search endpoints

### A4 — robots.txt Respect

Before crawling a domain, fetch and parse `robots.txt`. Skip disallowed paths.

**What changes:**
- `crawler/internal/crawler/` — `robotsTxt` cache per domain
- Check `Disallow` and `Crawl-Delay` before each request
- Respect `Crawl-Delay` as per-host minimum interval

### A5 — Webhook Callback

`POST /v1/crawl` accepts optional `callbackUrl`. When crawl completes, POST result summary to that URL.

**What changes:**
- `crawler/internal/api/models.go` — add `callbackUrl` field to `CrawlRequest`
- `crawler/internal/crawler/` — after crawl completes, HTTP POST to callback URL
- Raw-Code can pass webhook URL from its server (eliminates polling)

---

## Phase B — New go-crawl Endpoints

### B1 — Image Extraction (`POST /v1/extract/images`)

Extract all `<img>` elements with src, alt, width, height, natural dimensions.

```json
{
  "images": [
    {"src": "https://...", "alt": "description", "width": 800, "height": 600}
  ]
}
```

### B2 — PDF Text Extraction (`POST /v1/extract/pdf`)

Download a PDF, extract all text content.

```json
{
  "text": "...",
  "pages": 12,
  "metadata": {"title": "...", "author": "..."}
}
```

### B3 — Structured Data Extraction (`POST /v1/extract`)

Extract CSS-selector-targeted content as structured JSON.

```json
// Request
{"url": "...", "selectors": {"headings": "h2", "prices": ".product-price"}}

// Response
{"data": {"headings": ["Title 1", "Title 2"], "prices": ["$29.99", "$49.99"]}}
```

### B4 — Pagination Following

Crawler detects and follows `<link rel="next">`, `aria-label="Next"`, or numbered pagination within same domain.

### B5 — Batch Export (`GET /v1/crawl/{id}/export?format=json|markdown`)

Download crawl results as a single JSON bundle or concatenated markdown file.

### B6 — Multiple Search Backends

Add optional Brave Search API and Google scraping as fallbacks when DuckDuckGo fails.

### B7 — Screenshots (`POST /v1/screenshot`)

Capture full-page screenshot via headless Chrome/Chromium (`chromedp`). Return PNG base64 or file URL.

---

## Phase C — New Raw-Code Tools

### C1 — `scrape_url`

Single page scrape with format/selector control. Uses `POST /v1/scrape`.

```typescript
scrape_url({ url: string, onlyMainContent?: boolean, formats?: string[] })
→ { markdown, html, metadata, links }
```

### C2 — `extract_images`

Extract all images from a page. Uses `POST /v1/extract/images`.

```typescript
extract_images({ url: string })
→ { images: [{ src, alt, width, height }] }
```

### C3 — `extract_pdf`

Download and extract text from a PDF. Uses `POST /v1/extract/pdf`.

```typescript
extract_pdf({ url: string })
→ { text, pages, metadata }
```

### C4 — `extract_structured`

CSS-selector-driven structured extraction. Uses `POST /v1/extract`.

```typescript
extract_structured({ url: string, selectors: Record<string, string> })
→ { data: Record<string, string[]> }
```

### C5 — `research_compile`

Composite tool: search → scrape top results → LLM synthesize → structured report. Chains go-crawl search + scrape with AI summarization.

```typescript
research_compile({ query: string, depth?: 'quick' | 'deep', maxSources?: number })
→ { summary, sources: [{ title, url, markdown }], keyFindings: string[] }
```

### C6 — `crawl_to_articles`

Crawl a site, then for each page call `write_article` to rewrite content. Chains `crawl_website` → `write_article`.

### C7 — `import_video_sources`

Extract videos from a page, download to Drive, trigger `edit_video` pipeline.

### C8 — `monitor_page`

Schedule periodic re-crawl of a URL. Store previous content, report diff when changes detected.

---

## Phase D — Composite Agent Patterns

Reusable plan templates stored in `packages/tool-runtime/src/plan/`:

| Pattern | Steps | Creates |
|---------|-------|---------|
| **Competitor Analysis** | Search → crawl each result → extract features → LLM compare → write article | Comparison article |
| **Blog → Video** | Scrape blog → extract key points → generate script → edit video | Video from blog post |
| **Tutorial Generator** | Map site docs → crawl pages → rewrite as tutorials → bundle | Tutorial series |
| **SEO Audit** | Crawl site → extract headings/meta/titles → analyze → report | SEO audit report |

---

## Phase E — Knowledge Layer

| Feature | What | Why |
|---------|------|-----|
| **Crawl result DB** | Raw-Code SQLite table storing `{domain, url, markdown, metadata, crawled_at}` | Avoid re-crawling same pages |
| **TTL refresh** | Re-crawl pages older than N days | Fresh content |
| **Agent memory** | Store research results in session context across tool calls | Continuity within a conversation |
| **Content RAG** | Embed crawled pages → local vector search | Semantic query over past crawls |

---

## File Reference

| File | Phase | Purpose |
|------|-------|---------|
| `crawler/internal/store/` | A1 | Persistence layer (BoltDB) |
| `crawler/internal/crawler/crawler.go` | A1, A3, A4 | Read/write store, rate limit, robots.txt |
| `crawler/internal/api/router.go` | A2 | Auth middleware |
| `crawler/internal/api/handlers.go` | A5, B1-B7 | New handler methods |
| `crawler/internal/api/models.go` | B1-B7 | Request/response types |
| `crawler/go.mod` | — | Add bbolt, pdfcpu deps |
| `packages/tool-runtime/src/content/scrape-url.ts` | C1 | `scrape_url` tool |
| `packages/tool-runtime/src/content/extract-images.ts` | C2 | `extract_images` tool |
| `packages/tool-runtime/src/content/extract-pdf.ts` | C3 | `extract_pdf` tool |
| `packages/tool-runtime/src/content/extract-structured.ts` | C4 | `extract_structured` tool |
| `packages/tool-runtime/src/content/research-compile.ts` | C5 | `research_compile` tool |
| `packages/tool-runtime/src/content/crawl-to-articles.ts` | C6 | `crawl_to_articles` tool |
| `packages/tool-runtime/src/content/import-video-sources.ts` | C7 | `import_video_sources` tool |
| `packages/tool-runtime/src/content/monitor-page.ts` | C8 | `monitor_page` tool |
| `packages/tool-runtime/src/builtins.ts` | C1-C8 | Tool registration |
| `packages/subagent/src/personalities.ts` | — | Tool scope updates |
| `packages/tool-runtime/src/plan/templates/` | D | Composite pattern templates |
| `server/src/search/providers/gocrawl.ts` | — | Go-crawl HTTP wrappers |
| `server/src/searchService.ts` | — | Provider orchestration |
