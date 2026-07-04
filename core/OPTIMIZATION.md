# Core Optimization Guide

This document outlines the contents of the `core/` layer and provides a roadmap for ongoing performance and behavioral optimizations.

## Core Contents

- **`prompt/`**: Authoritative system prompts.
- **`models/`**: AI provider management and fallback logic.
- **`tools/`**: TypeScript schemas for all agent tools.
- **`memory/`**: Context management and token optimization.
- **`workspace/`**: Logic for indexing and understanding the user's project.
- **`config/`**: Shared model and app configurations.
- **`utils/`**: Shared backend-interacting utilities.

## Optimization Strategy

The goal of the `core/` layer is to provide a central place to tune the agent's "brain" without touching UI code. Focus optimizations on:
1.  **Context Density**: Reducing token usage while maintaining relevant info.
2.  **Routing Speed**: Minimizing latency in model selection and fallbacks.
3.  **Tool Accuracy**: Refining tool schemas to improve model call rates.

## Files to Optimize

| File | Target Optimization | Why |
| :--- | :--- | :--- |
| `core/memory/contextContractor.ts` | Token-aware summarization | Currently uses simple contraction; smarter summarization will preserve more context in long chats. |
| `core/models/aiService.ts` | Parallel fallback checks | Currently fallbacks are sequential; probing model availability in parallel could reduce "failover" wait time. |
| `core/workspace/FileSystemService.ts` | Selective Indexing | Moving heavy scanning to the Go layer (`agent/`) and only passing metadata to Core. |
| `core/prompt/systemPrompt.ts` | Dynamic Prompting | Injecting only the tool definitions required for the current task context to save tokens. |
| `core/utils/DatabaseService.ts` | Batch Operations | Implementing bulk inserts for project file syncing to reduce IPC/Network overhead. |

## How to Optimize

- **A/B Testing**: Use the `core/eval/` directory to run benchmarks against different prompt/model versions.
- **Profiling**: Monitor the `durationMs` returned by the Go `agent/` executor to identify slow tools.
- **Telemetry**: Track which models in the fallback chain are used most frequently to reorder `models.ts` for efficiency.
