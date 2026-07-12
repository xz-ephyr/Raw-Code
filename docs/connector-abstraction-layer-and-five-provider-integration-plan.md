# Connector Abstraction Layer & Five-Provider Integration Plan

## Validated User Intent

| Dimension | Detail |
|---|---|
| **Surface intent** | Build connectors for GitHub, Telegram, YouTube, Reddit, Twitter to same completeness as Gmail |
| **Latent intent** | Avoid code duplication by creating a connector abstraction layer first |
| **Out of scope** | WhatsApp (explicitly dropped); Notion, Slack, Jira (not mentioned) |
| **Completeness bar** | Full stack: OAuth/auth → backend service → Express routes → AI tool definitions → UI connection flow |
| **Priority** | All 5 equal; abstraction layer is the prerequisite |

---

## Key Findings — Sub-Agent 1 (Reconnaissance)

### Current Gmail Architecture (sole reference implementation)

| Layer | File | Lines | Key Pattern |
|---|---|---|---|
| Backend service | `server/src/gmailService.ts` | 321 | Named functions, module-level token refresh dedup, hardcoded `'gmail'` literal |
| Express routes | `server/src/routes/gmail.ts` | 85 | 6 POST endpoints, lazy dynamic imports, try/catch → 502 |
| Client service | `core/utils/GmailService.ts` | 38 | Object literal, fetch-wraps server endpoints |
| AI tools | `core/tools/gmail/*.ts` | ~25 each | `tool()` from `ai` SDK + zod schemas, names `gmail_<action>` |
| Tool filter | `core/models/aiService.ts` | 383 | `name.startsWith('gmail_')` check; hardcoded Gmail prompt block |
| UI catalog | `src/components/plugins/PluginTabs.tsx` | 324 | `CONNECTOR_CATEGORIES` with `ConnectorItem`; hardcoded `startGmailOAuth()` |
| Brand registry | `src/components/chat/connectorMentions.ts` | 56 | 4 connectors registered (GitHub, Gmail, Notion, Slack) |
| Status checking | Multiple files | — | Every component does its own `fetch('/gmail/status')` |

### Key Problem: No Abstraction

Every new connector would need to replicate this entire stack. At 5 connectors, that's ~40 duplicated files with ~80% boilerplate shared pattern.

### Existing Abstraction Reference

`core/providers/providerRegistry.ts` — `KeyProvider` interface + `registerProvider()`/`getProvider()` Map-based registry. This is the pattern to replicate for connectors.

### Connector Auth Diversity

| Connector | Auth Model | Notes |
|---|---|---|
| GitHub | OAuth2 + PAT fallback | Standard OAuth2 |
| YouTube | Google OAuth2 | Shares infra with Gmail (different scopes) |
| Reddit | OAuth2 | Standard OAuth2 |
| Twitter/X | OAuth2 PKCE | Standard OAuth2 |
| Telegram | Bot token | **Not OAuth** — completely different UX flow |

### Database Schema Issue

Current `oauth_tokens` table has Gmail-specific `email` column. Other providers need different identity fields (GitHub: username, YouTube: channel_id, Telegram: bot_username).

---

## Professional Engineering Reasoning — Sub-Agent 2

### 1. Abstraction Layer: Abstract Base Class (not interface)

**Rejected:** A pure `IConnector` interface. Every connector would reimplement token encryption, API fetch with auth headers, refresh dedup, DB storage identically — defeating the purpose.

**Correct:** Abstract base class `ConnectorService` with:
- **Concrete shared methods**: `getAccessToken()`, `apiFetch()`, `storeToken()`, `clearToken()`, `encrypt()`, `decrypt()`
- **Abstract per-provider methods**: `getAuthUrl()`, `exchangeCode()`, `getIdentity()`, `getScopes()`, `getAuthConfig()`, `getSystemPrompt()`

The base class covers the auth lifecycle completely and provides a shared HTTP client. API operations (listMessages, createIssue, etc.) remain per-provider — they're too diverse to unify without creating a leaky abstraction.

### 2. Telegram: Special Case, Handled Correctly

Telegram uses bot tokens, not OAuth. Forcing it into an OAuth abstraction via fake auth URLs or fake callbacks would be architecturally dishonest. Instead:
- `authType: 'token'` metadata flag
- `getAuthUrl()` throws (not applicable)
- UI shows a password field for bot token input instead of OAuth button
- Token is encrypted and stored in the same `access_token` column; `refresh_token` and `expires_at` are NULL

### 3. YouTube + Gmail: Shared Google OAuth Base

Both use Google's OAuth2. Create `GoogleConnectorService extends ConnectorService` that provides:
- Google auth/token endpoints
- Shared `exchangeCode()` with per-provider profile fetch
- Each subclass provides its own scopes and identity extraction

### 4. Database Schema Evolution

| Change | Rationale |
|---|---|
| `email` → `identity` | Generic; holds email, username, channel_id, bot_username |
| Add `metadata TEXT` | JSON blob for provider-specific fields (avatar_url, channel_name, etc.) |
| Wrap in try/catch migration | Idempotent; handles old SQLite versions |

### 5. Routing: Generic Over Per-Provider

**Rejected:** 5 route files × 85 lines = 425 lines of identical boilerplate.

**Correct:** Single generic router at `/connector/:provider/:action`:
```typescript
router.post('/connector/:provider/:action', handler)
```
Each provider registers its action handlers via `getActionHandlers()`. Adding a connector = registering it + defining its class. Zero route changes.

### 6. OAuth Callback: Generic Single Endpoint

All OAuth callbacks handled by `/auth/:provider/callback` — a single generic handler that returns postMessage HTML. Registered before auth middleware. Each provider maintains its own redirect URI in its OAuth console.

### 7. Client-Side: Single `ConnectorApi` Class

Replace per-provider services (GmailService, etc.) with one generic:
```
ConnectorApi.getStatus(provider)
ConnectorApi.callAction(provider, action, params)
```

Per-provider services become zero-code delegates or thin convenience wrappers.

### 8. AI Tool Injection: Dynamic Prefix Filtering

Replace `name.startsWith('gmail_')` with lookup from a registry of known connector prefixes. Tool naming convention `<connector>_<action>` is already established.

### 9. Status Checking: Centralized Hook

Replace 3+ scattered `fetch('/gmail/status')` calls with a single `useConnectorStatus()` hook (or `useAllConnectorsStatus()` batch hook).

### 10. Encryption Key: Single Shared Key

Rename `GMAIL_ENCRYPTION_KEY` → `CONNECTOR_ENCRYPTION_KEY` with backward-compat fallback. Per-provider keys add 5 env vars with zero security benefit.

---

## Placement & Introduction Plan — Sub-Agent 3

### Phase 0: Foundation

| # | File | Operation | Key Content |
|---|---|---|---|
| 1 | `server/src/db.ts` | MODIFY | Add migration: `email` → `identity`, add `metadata TEXT`; wrap in try/catch for idempotency |
| 2 | `server/src/crypto.ts` | MODIFY | Read `CONNECTOR_ENCRYPTION_KEY` with `GMAIL_ENCRYPTION_KEY` fallback |
| 3 | `server/.env.example` | MODIFY | Add env var entries for all 5 new connectors |

### Phase 1: Server Abstraction Layer

| # | File | Operation | Key Content |
|---|---|---|---|
| 4 | `server/src/connectors/types.ts` | CREATE | `AuthType`, `ConnectorConfig`, `ConnectorStatus`, `TokenRow`, `AuthUrlOptions` types |
| 5 | `server/src/connectors/base.ts` | CREATE | Abstract `ConnectorService` class with shared token/API logic + abstract lifecycle methods |
| 6 | `server/src/connectors/google-base.ts` | CREATE | `GoogleConnectorService extends ConnectorService` — shared Google OAuth2 base |
| 7 | `server/src/connectors/registry.ts` | CREATE | `ConnectorRegistry` singleton — `register()`, `get()`, `getAll()`, `getConnectedProviders()` |
| 8 | `server/src/connectors/index.ts` | CREATE | Barrel re-export |
| 9 | `server/src/connectors/gmail.ts` | CREATE | `GmailConnectorService extends GoogleConnectorService` — all Gmail API logic migrated from `gmailService.ts` |
| 10 | `server/src/gmailService.ts` | MODIFY | Gut and re-export through registry delegation (backward compat) |
| 11 | `server/src/routes/connector.ts` | CREATE | Generic `/connector/:provider/:action` router + `/connectors/status` batch endpoint |
| 12 | `server/src/index.ts` | MODIFY | Add generic `/auth/:provider/callback` handler; register all connectors; add connector route |

### Phase 2: Build 5 Connectors

| # | File | Operation | Key Content |
|---|---|---|---|
| 13 | `server/src/connectors/github.ts` | CREATE | OAuth2, GitHub API (repos, issues, PRs, search) |
| 14 | `server/src/connectors/youtube.ts` | CREATE | Extends `GoogleConnectorService`, YouTube API (search, playlists, comments) |
| 15 | `server/src/connectors/telegram.ts` | CREATE | Bot token auth, Telegram Bot API (sendMessage, getUpdates, getChat) |
| 16 | `server/src/connectors/reddit.ts` | CREATE | OAuth2, Reddit API (hot, search, submit, comments) |
| 17 | `server/src/connectors/twitter.ts` | CREATE | OAuth2 PKCE, Twitter/X API v2 (timeline, tweet, search, user) |

All registered in `server/src/index.ts`.

### Phase 3: Core (Frontend) Abstraction

| # | File | Operation | Key Content |
|---|---|---|---|
| 18 | `core/utils/ConnectorApi.ts` | CREATE | Generic `ConnectorApi` client class replacing per-provider services |
| 19 | `core/utils/GmailService.ts` | MODIFY | Delegate all methods to `ConnectorApi` (backward compat) |
| 20 | `core/tools/gmail/*.ts` | MODIFY | Switch imports from `GmailService` to `ConnectorApi` |
| 21 | `core/tools/allTools.ts` | MODIFY | Add imports for all new connector tools |
| 22 | `core/models/aiService.ts` | MODIFY | `isGmailConnected` → `connectedConnectors[]`; dynamic prefix filtering; dynamic prompt injection |
| 23-27 | `core/tools/<connector>/*.ts` | CREATE | Tool definitions for each new connector (following Gmail pattern) |

### Phase 4: Frontend UI

| # | File | Operation | Key Content |
|---|---|---|---|
| 28 | `src/hooks/useConnectorStatus.ts` | CREATE | Centralized polling hook for single/batch connector status |
| 29 | `src/components/plugins/PluginTabs.tsx` | MODIFY | Generic OAuth flow; Telegram token input; dynamic status from registry |
| 30 | `src/components/plugins/ConnectorDetailModal.tsx` | MODIFY | Support `authType: 'token'` with bot token input field |
| 31 | `src/components/chat/connectorMentions.ts` | MODIFY | Add brand entries for Telegram, Reddit, Twitter, YouTube |
| 32 | `src/components/chat/ChatInput.tsx` | MODIFY | Replace hardcoded Gmail status check with generic provider polling |
| 33 | `src/pages/ChatPage.tsx` | MODIFY | Replace `isGmailConnected` with `connectedProviders[]` array |
| 34 | `src/components/settings/tabs/GmailTab.tsx` | MODIFY | Update API paths from `/gmail/` to `/connector/gmail/` |
| 35 | `src/components/settings/SettingsTabLayout.tsx` | MODIFY (optional) | Add settings tabs for new connectors |

### Phase 5: Cleanup (Deferred)

| # | File | Operation |
|---|---|---|
| 36 | `server/src/routes/gmail.ts` | DELETE after migration verified |
| 37 | `core/utils/GmailService.ts` | DELETE after all callers migrated |

---

## Dependency Order

```
Phase 0 (DB + crypto)
  → Phase 1a (types, base class, google-base)
    → Phase 1b (gmail connector, registry)
      → Phase 1c (connector routes, index.ts update)
        → Phase 2 (5 connectors — parallel)
          → Phase 3a (ConnectorApi client)
            → Phase 3b (GmailService delegate, Gmail tool updates, allTools update)
              → Phase 3c (aiService.ts)
                → Phase 4 (UI: hook → PluginTabs → connectorMentions → ChatInput → ChatPage → GmailTab)
                  → Phase 5 (cleanup, deferred)
```

---

## Risks & Trade-offs

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Migration of existing Gmail data** | Low | `email` → `identity` column rename preserves data; try/catch fallback path |
| **Backward compat breakage** | Low | Old env vars (`GMAIL_ENCRYPTION_KEY`) still work; old routes (`/gmail/*`) coexist with new (`/connector/gmail/*`); old client (`GmailService`) delegates to new |
| **Telegram token-in-URL exposure** | Medium | Token never in URLs (stored via POST body); encrypted at rest |
| **YouTube scope conflict with Gmail** | Low | Separate scopes per subclass; re-auth may be needed if scopes change |
| **Twitter/X API instability** | Medium | API v2 is stable but rate limits are tight; rate-limit retry in base class |
| **Abstraction not needed for 5 connectors** | Low | Analysis shows ~40 duplicated files without it; abstraction is ~10 files — positive RoI |

## Testing Strategy

- **Base class isolation**: Create `MockConnector extends ConnectorService` to test token lifecycle, API fetch with auth, refresh dedup, rate-limit retry
- **Per-connector unit tests**: Mock DB + crypto; test OAuth exchange, token refresh expiry, disconnect
- **Edge cases**: Concurrent refresh calls (dedup), expired token with failed refresh, revoked token (401 → auto-refresh → fail), rate limit (429 → retry with backoff)
- **Integration**: Register a connector, hit generic routes, verify end-to-end OAuth flow

## Rollback Strategy

| Phase | Rollback |
|---|---|
| Phase 0 | Revert `db.ts` and `crypto.ts` |
| Phase 1 (abstraction) | Delete `server/src/connectors/`; revert `index.ts`; delete `routes/connector.ts` |
| Phase 2 (5 connectors) | Delete individual connector files; unregister from `index.ts` |
| Phase 3 (core) | Revert `aiService.ts`; delete `ConnectorApi.ts`; revert GmailService.ts; remove new tool dirs |
| Phase 4 (UI) | Revert all UI files to originals |

Each phase is independently revertible. The registration in `server/src/index.ts` is the central toggle — removing a registration deactivates the connector without deleting its code.

## Recommendation

Proceed with implementation in the order specified. The abstraction layer is justified (not premature) — it eliminates ~3000 lines of boilerplate across 5 connectors and follows an existing pattern (`providerRegistry.ts`) that the codebase already uses. Each phase is independently testable and revertible.

Total estimated impact:
- **~15 new files created**
- **~10 existing files modified**
- **0 deleted until cleanup phase**
- **~2500-3500 total lines** (abstraction ~500, 5 connectors ~400 each, UI changes ~500)
