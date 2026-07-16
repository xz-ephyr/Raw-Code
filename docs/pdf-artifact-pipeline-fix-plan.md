# PDF Artifact Pipeline — Root Cause Analysis & Fix Plan

## Validated Intent

Fix PDF artifact rendering so that when the AI generates a PDF artifact, it renders correctly in the FilePanel and downloads as a proper PDF file. The scope includes the full pipeline: parsing → generation → preview → download.

### Surface Request
"Fix PDF rendering artifact issue."

### Latent Requirements
- AI cannot reliably produce valid PDF binary — the pipeline must account for this
- PDF must render in the artifact panel
- PDF downloads must produce valid `.pdf` files
- The fix must be surgical, not architectural (no new server infra, no premature Effect.ts migration)

---

## Key Findings

### Stage 1: Parsing (`src/lib/fileParser.ts:16-23`)

**Status**: ❌ Broken

`resolveType()` only checks `MIME_TO_FILE_TYPE` keys (e.g., `'application/pdf'`). When the XML tag has `type="pdf"` (short name), it falls through to `return 'markdown'`. Every PDF artifact from the XML fallback path is misclassified as markdown.

### Stage 2: AI Generation (`core/tools/writeArtifactTool.ts`, `core/prompt/systemPrompt.ts`)

**Status**: ❌ No instruction, no generation

The system prompt lists `pdf` as a valid type but gives the AI zero guidance on content format. The tool is a passthrough — no validation, no generation. LLMs cannot produce valid PDF binary. Without guidance, the AI writes plain text labeled as PDF, which `atob()` silently corrupts.

### Stage 3: Preview Rendering (`src/components/file-panel/PdfPreview.tsx`)

**Status**: ⚠️ Works only if content is valid base64 PDF

Current implementation decodes base64 → blob → iframe URL. Silent generic error on failure. No fallback or generation capability.

### Stage 4: Download (`src/components/chat/FilePreviewCard.tsx:15`)

**Status**: ❌ Hardcoded `text/plain` for all types

Every artifact downloads with `text/plain` MIME, even PDF. Most PDF readers reject files with wrong MIME type.

### Stage 5: Zoom Slider (`src/components/file-panel/FilePanel.tsx:48-59`)

**Status**: ❌ No-op for PDF

Zoom slider only changes `<pre>` font-size. Does nothing for PdfPreview iframe.

### Stage 6: Dead Code (`src/components/file-panel/FilePanel.tsx:24-29`)

**Status**: ⚠️ Low-priority cleanup

`onSelectFile` and `onRollback` are destructured with underscore prefix and void-assigned to suppress lint. Placeholder props never wired up.

### Dependencies

- `react-pdf@^10.4.1` and `pdfjs-dist` installed but **zero imports** in codebase
- No PDF generation library exists (no `jspdf`, `pdf-lib`, `pdfkit`)

---

## Professional Engineering Reasoning

### Root Cause Chain

```
Parsing (resolveType misclassifies 'pdf' as 'markdown')
  → Type never reaches PdfPreview
    → PDF viewed as raw text in <pre> tag
      → Download uses text/plain blob
        → "Could not render PDF preview" (if it somehow arrives)
```

Without fixing the **parsing bottleneck first**, fixes to downstream components are invisible.

### The AI Generation Problem

LLMs cannot reliably produce valid PDF binary. The correct architectural answer is:

**Phase 1 (NOW)**: Keep `type="pdf"` in the tool enum, but change the contract — the AI writes descriptive text, and the frontend generates a proper PDF from it using `pdf-lib`.

**Phase 2 (LATER)**: Add a `generate_pdf` Effect.ts tool in the new tool-runtime that wraps pdf-lib, providing proper base64 PDF content server-side or in the AI tool call flow.

### Why Not react-pdf?

`react-pdf` is a *viewer* (renders existing PDF files page-by-page), not a *generator*. It cannot help with the root problem (no PDF to view). `pdf-lib` is a *generator* (creates PDFs from scratch). Both are needed for a complete solution, but Phase 1 needs generation first.

---

## Placement Plan

### 1. Fix Parsing — `src/lib/fileParser.ts:16-23`

Add short-name map before MIME lookup so `type="pdf"` resolves to `'pdf'`.

```
IF type is in SHORT_NAMES → return mapped value
ELSE IF type is in MIME_TO_FILE_TYPE → return mapped value
ELSE → return 'markdown' (unchanged)
```

**Impact**: Only affects XML artifact tags. Tool-call path unaffected. All existing artifacts continue working.

### 2. Install pdf-lib

`npm install pdf-lib` — pure-JS, no native deps, ~180KB.

### 3. Rewrite PdfPreview — `src/components/file-panel/PdfPreview.tsx`

Dual-mode rendering:
1. If content is valid base64 beginning with `%PDF` magic bytes → blob URL (backward compat)
2. Otherwise → generate PDF from text content using pdf-lib

Generation: `PDFDocument.create()` → embed Helvetica font → split text into lines → add pages at ~50 lines/page → `doc.save()` → blob URL → iframe.

### 4. Fix Download — `src/components/chat/FilePreviewCard.tsx:3,13-22`

- Import `FILE_MIME_TYPES` from `@/types/file-panel`
- Base64-decode content for binary types (PDF, doc, pptx, excel)
- Use correct MIME type from `FILE_MIME_TYPES`
- Fall back to `text/plain` for text types

### 5. Update System Prompt — `core/prompt/systemPrompt.ts:~21`

Add: *"For `pdf` artifacts, write descriptive text content — the system generates a proper PDF from it."*

### 6. Hide Zoom Slider for PDF — `src/components/file-panel/FilePanel.tsx:48-59`

Wrap zoom slider div in `{activeFile.type !== 'pdf' && (...)}`.

### 7. Remove Dead Props — `src/components/file-panel/FilePanel.tsx:8,10,24,26,28,29` + `src/pages/ChatPage.tsx:476,478`

Remove `onSelectFile` and `onRollback` from `FilePanelProps`, destructuring, void lines, and JSX props in ChatPage.

### 8. Unit Tests — `tests/fileParser.test.ts` (new)

8 test cases covering: short-name resolution for all binary types, MIME backward compat, unknown type fallback, `write_artifact` tag variant, `canPreviewType('pdf')`.

---

## Risks & Trade-offs

| Fix | Risk | Mitigation |
|-----|------|------------|
| resolveType rewrite | Low — pure function, backward-compatible (falls through to MIME check) | Add tests before merge |
| pdf-lib generation | Medium — async operation in useEffect, edge cases in text splitting | Error boundary + cancellation flag in effect cleanup |
| Download fix | Medium — wrong base64 detection could corrupt text artifacts | `isBase64` check + try/catch fallback to raw text |
| System prompt change | Medium — changes AI behavior, not revertible without prompt versioning | Keep change minimal and descriptive (not prescriptive) |
| Dead prop removal | Low — TS error will surface any missed callers | Remove props, compile-check ChatPage.tsx |

## Rollback Strategy

Every change is individually revertible:
1. `resolveType` — revert to original 5-line function
2. `PdfPreview` — revert to original file (or restore from git)
3. `FilePreviewCard` — revert `handleDownload` + remove helpers
4. System prompt — revert the added line
5. Zoom slider — remove the conditional wrapper
6. Dead props — re-add interface fields, destructuring, JSX props
7. Tests — delete the test file

## Testing

- `npx vitest run tests/fileParser.test.ts` — verify `resolveType` and `parseFiles` correctness
- `npx tsc --noEmit` — verify no type errors
- Manual: open an artifact with `type="pdf"` content in the chat, verify it renders in FilePanel as PDF, verify download produces a valid `.pdf`

## Recommendation

Proceed with Phase 1 (parsing fix + pdf-lib generation + download fix + prompt guidance). This is the minimal viable fix that makes PDF artifacts work end-to-end without server-side infrastructure or premature migration work. Phase 2 (react-pdf rendering + Effect.ts tool) should be deferred to the model-routes-providers migration.
