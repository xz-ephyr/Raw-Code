<div align="center">

# DokTor
### *AI-Native Content Creation Studio*

**A local-first, multi-model AI content creation environment with live artifact previews, project-aware context, and a built-in editor.**

---

[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=for-the-badge&logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## Overview

DokTor is a desktop content creation agent that runs on your local machine. Chat with multiple AI models (Gemini, Groq, Mistral, OpenAI-compatible, Cerebras) in a context that understands your project structure — files, folders, and content.

## Features

- **AI Chat with Project Context** — The model knows what project you're in, sees your file tree, and can read/write files directly on disk
- **Multi-Model Support** — Google Gemini, Groq, Mistral, OpenAI-compatible (OpenRouter, OpenCode Zen), Cerebras with automatic fallback chains
- **Live Artifact Preview** — HTML, React, SVG, and Markdown render in a sandboxed side panel, streaming in real-time as the model generates
- **Built-in Editor** — Full file tree explorer with a CodeMirror 6 editor, syntax highlighting, and direct file save
- **Extended Thinking** — Collapsible chain-of-thought display for models that support reasoning
- **Project-Aware** — Dedicated project folders with persistent context; the AI knows which project it's working in
- **Local-First** — All data stored in local SQLite via an Express backend. No cloud dependency.
- **Tauri Desktop** — Native file system access, OS-native dialogs, runs as a standalone desktop app

## Architecture

| Layer | Technology |
| :--- | :--- |
| **Shell** | Tauri 2.0 (Rust) |
| **Frontend** | React 19 + Vite + TypeScript |
| **AI SDK** | Vercel AI SDK (ai v6) |
| **Editor** | CodeMirror 6 |
| **Backend** | Express.js + better-sqlite3 |
| **Sandboxing** | iframe + CSP + DOMPurify-style sanitization |

## Getting Started

```powershell
# Install dependencies
npm install
cd server && npm install

# Start the backend (in one terminal)
cd server && npm run dev

# Start the frontend (in another terminal)
npm run dev
```

For Tauri desktop:
```powershell
npm run tauri:dev
```

## Project Structure

```
DokTor/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── artifacts/      # Artifact preview, editor pane, renderer
│   │   ├── chat/           # Chat bubbles, input, thinking display
│   │   └── ui/             # Shared UI primitives
│   ├── hooks/              # React hooks (useArtifacts, etc.)
│   ├── pages/              # Route pages (Chat, Chats, Settings)
│   ├── services/           # AI service, DB client, file system
│   │   └── ai/             # System prompt, tool config, context
│   ├── lib/                # Utilities
│   ├── config/             # Model definitions, API keys
│   └── types/              # TypeScript interfaces
├── server/                 # Express.js backend
│   └── src/                # API endpoints, SQLite queries
└── src-tauri/              # Tauri Rust shell
```

---

<div align="center">
  <sub>Built for local-first AI-assisted content creation.</sub>
</div>
