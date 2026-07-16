# go-crawl Integration — Progress & Next Steps

## ✅ Completed

### Phase A — go-crawl Foundation (Go)

| # | Feature | Details |
|---|---------|---------|
| A1 | **BoltDB persistence** | Crawl jobs survive restarts. Set `STORE_PATH` env var (default: `~/.go-crawl/data.db`) |
| A2 | **Optional auth** | Set `AUTH_TOKEN` env var to require `Authorization: Bearer <token>` on all routes |
| A3 | **Rate limiting** | Per-host 500ms min delay between requests + 10 req/s per IP with burst 20 on API endpoints |
| A4 | **robots.txt** | Fetches & caches per-domain robots.txt. Skips disallowed paths. Respects `Crawl-Delay` |
| A5 | **Webhook callback** | `POST /v1/crawl` accepts `callbackUrl`. After crawl completes, POSTs `{id, status, stats}` to the URL |

### Phase B — New go-crawl Endpoints (Go)

| # | Endpoint | What it does |
|---|----------|-------------|
| B1 | `POST /v1/extract/images` | Extract all `<img>` with `src`, `alt`, `width`, `height` |
| B3 | `POST /v1/extract` | CSS-selector driven structured data extraction: `{selectors: {name: "css"}}` → `{data: {name: [values]}}` |
| B5 | `GET /v1/crawl/{id}/export?format=json\|markdown` | Download crawl results as JSON or concatenated markdown file |
| B6 | Multiple search backends | Brave Search API via `BRAVE_API_KEY` env var, falls back to DuckDuckGo scraping |

### Phase C — New Raw-Code Effect.ts Tools

| # | Tool | Name | What it does |
|---|------|------|-------------|
| C1 | `scrape_url` | `scrapeUrlTool` | Single page scrape with format control (markdown, html) and `onlyMainContent` |
| C2 | `extract_images` | `extractImagesTool` | Extract all images from a page |
| C4 | `extract_structured` | `extractStructuredTool` | CSS-selector → structured JSON extraction |
| C5 | `research_compile` | `researchCompileTool` | Deep research: search → scrape each result → optional structured extraction |

All tools registered in `builtins.ts`, exported from `content/index.ts`, and added to researcher personality in `personalities.ts`.

### Phase D — Composite Agent Patterns

| # | Pattern | File | What it does |
|---|---------|------|-------------|
| D1 | `competitor_analysis` | `plan/templates/competitor-analysis.ts` | Search topic + competitors → crawl each competitor → extract structured data → write comparison article |
| D2 | `blog_to_video` | `plan/templates/blog-to-video.ts` | Scrape blog post → generate script → preview → export |
| D3 | `seo_audit` | `plan/templates/seo-audit.ts` | Map site → crawl up to 30 pages → extract headings/meta → research best practices → write audit report |
| D4 | `plan_templates` tool | `plan/plan-templates.ts` | New tool with `list` / `apply` actions. `list` shows all templates with params; `apply` generates a ready-to-use plan object for `create_plan` |
| D5 | Personality update | `personalities.ts` | General and researcher agents now have `plan_templates`, `create_plan`, `execute_plan` in their toolScope |

### Phase E — Knowledge Layer (Crawl Cache)

| # | Item | File | What it does |
|---|------|------|-------------|
| E1 | `crawl_cache` table | `server/src/db.ts` | `cache_key TEXT PK, content TEXT, cached_at INTEGER, ttl_seconds INTEGER` — persists crawl results |
| E2 | Cache API routes | `server/src/routes/crawl-cache.ts` | `POST /crawl-cache/lookup`, `POST /crawl-cache/store`, `POST /crawl-cache/clear` |
| E3 | `withCrawlCache` utility | `packages/tool-runtime/src/content/with-crawl-cache.ts` | Effect wrapper: check server cache → miss → fetch → store |
| E4 | Applied to `scrape_url` | `scrape-url.ts` | Now uses `withCrawlCache` with 1h TTL — same URL won't re-crawl within the hour |

### New Server-side Go-crawl Wrappers

Added to `server/src/search/providers/gocrawl.ts`:
- `gocrawlExtractStructured(url, selectors)`
- `gocrawlExtractImages(url)`
- `gocrawlExportCrawl(id, format?)`

---

## 🔜 Next Steps

### Deferred (heavy deps or low ROI right now)

| Item | Why |
|------|-----|
| PDF extraction (B2) | Requires a PDF library in Go |
| Screenshots (B7) | Requires `chromedp` + Chrome binary |
| Pagination (B4) | Complex changes to crawler run loop |
| Monitor page (C8) | Requires scheduler + diff engine |

---

## How to Run

```bash
# Terminal 1: Start go-crawl
cd crawler && go run ./cmd/server

# Terminal 2: Start Raw-Code (GO_CRAWL_URL picks up default http://localhost:8080)
npm run dev
```

To use paid fallbacks (Tavily, Firecrawl, etc.), configure their API keys as before — they only activate if go-crawl fails.
