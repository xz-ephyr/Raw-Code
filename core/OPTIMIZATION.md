# Core Optimization & Tuning Guide

The `core/` layer serves as the "brain" of the assistant. Optimizing these components directly translates to higher intelligence, better tool use, and more accurate responses.

## Key Sections for Optimization

### 1. `core/prompt/` (System Prompts)
- **Few-Shot Examples**: Add a library of high-quality examples to `systemPrompt.ts` to guide the model on complex multi-step tasks.
- **Dynamic Prompting**: Implement logic to inject only relevant tool documentation into the prompt based on the current user intent, reducing token noise.
- **Persona Tuning**: Refine the instructions for specific coding styles or architectural principles.

### 2. `core/memory/` (Context & Token Management)
- **Smarter Summarization**: In `contextContractor.ts`, move from simple truncation to AI-powered summarization of older conversation turns.
- **RAG Integration**: Implement a "Long-Term Memory" using vector embeddings to retrieve relevant snippets from previous chats without filling the context window.
- **Semantic Chunking**: Improve how files are split and contraction is handled to ensure logic boundaries aren't broken during token saving.

### 3. `core/models/` (Routing & Fallbacks)
- **Latency-Aware Routing**: In `aiService.ts`, track the response time of different providers and automatically prefer faster ones during high-traffic periods.
- **Task-to-Model Mapping**: Route simple questions to small/fast models (like Gemini Flash) and complex architectural changes to high-reasoning models (like O1 or Claude Opus).
- **Cost Optimization**: Implement logic to prioritize providers with better pricing or available free-tier credits first.

### 4. `core/tools/` (Tool Accuracy)
- **Schema Refinement**: Improve descriptions and parameter names in TS tool definitions to minimize "hallucinated" parameters.
- **Tool Selection**: Implement a pre-check step where the core selects a subset of tools for the task, helping models with limited tool-calling capabilities.
- **Strict Validation**: Use Zod to provide immediate feedback to the model if it misses a parameter, allowing for faster self-correction.

### 5. `core/workspace/` (Project Intelligence)
- **Selective Indexing**: Optimize `FileSystemService.ts` to prioritize `.ts`, `.go`, and config files over assets, ensuring the model sees the "skeleton" of the project first.
- **Dependency Mapping**: Build a graph of how files import each other so the model can understand the impact of a change across the whole project.
- **Semantic Search**: Integrate embeddings to allow "Search by Meaning" rather than just keyword grep.

### 6. `core/tasks/` (Planning & Orchestration)
- **Hierarchical Planning**: Implement logic to break down a user request into a JSON plan before execution.
- **Self-Reflection**: Add a "Review" step in the core loop where the model evaluates its own proposed changes before they are sent to the execution layer.
- **Multi-Agent Flow**: Define specialized internal "roles" (e.g., Coder, Reviewer, Tester) that communicate within the Core layer.

### 7. `core/eval/` (Continuous Improvement)
- **Regression Testing**: Create a set of "Gold Standard" prompts and verify that updates to the core don't break previous capabilities.
- **Tool Benchmarking**: Measure how often each tool is successfully called vs. how often it fails or returns poor data.
