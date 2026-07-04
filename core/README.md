# Core Layer

The `core/` layer contains the shared agent architecture, prompts, model routing, memory, and configuration. It is designed to be independent of the frontend (`src/`) and the execution layer (`agent/`).

## Structure

- `prompt/`: System prompts and prompt policies.
- `models/`: AI model routing, fallbacks, and provider management.
- `tools/`: Tool definitions and schemas (TypeScript).
- `memory/`: Context management, contraction, and memory policies.
- `workspace/`: Project and workspace indexing logic.
- `config/`: Shared configuration and model metadata.
- `utils/`: Common utilities (DB client, search service, etc.).

## Usage

Import from `@core` to access the core logic.

```typescript
import { chatCompletion } from '@core/models/aiService';
```
