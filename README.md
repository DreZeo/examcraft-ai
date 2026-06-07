**English** · [简体中文](./README_ZH_CN.md)

# AI Exam Generator

> A desktop app that turns a conversation with an AI model into a print-ready exam paper.

AI Exam Generator is a local-first desktop application (built with [Tauri](https://tauri.app/)) for teachers and educators. Describe the paper you want in natural language; the assistant analyzes the request, confirms its understanding, and generates structured, schema-validated questions that render live as a paginated, printable paper.

<!-- screenshot: add a screenshot or short GIF of the app here -->

## Features

- **Conversational, two-phase generation** — the assistant first analyzes your request and confirms understanding, then generates the questions. Generated questions are **never applied automatically**: you review a result card and apply it by hand, with one-click undo.
- **7 question types, strictly validated** — single-choice, multiple-choice, true/false, fill-in-the-blank, short-answer, essay, and calculation. Every AI response is validated with [Zod](https://zod.dev/) before it can touch your paper, with automatic self-correction (up to 3 retries) on malformed output.
- **Web search in the loop** — optionally let the model run web searches (Tavily, Exa, or Firecrawl) before writing questions. Results are fed back into the same turn (up to 3 searches), so questions can be grounded in current sources.
- **Live paginated preview + print / export** — the paper is laid out across physical pages (A4, etc.) in real time, with a teacher version (answers shown) and a student version (answer space, answers hidden).
- **Rich question content** — Markdown with KaTeX math, GFM tables, and code highlighting in question stems.
- **Bring your own model** — any OpenAI-compatible endpoint (OpenAI, DeepSeek, Ollama, relays, local models). Configure base URL, model, temperature, and max tokens.
- **Local-first & private** — papers and chat sessions are stored on your own disk; API keys are kept in the OS keychain, never in plaintext.
- **Bilingual UI** — English and 简体中文 (i18next).
- **Multiple papers & chat history** — manage many papers, each with its own multi-session chat history.

## Tech Stack

- **Frontend:** React 19 · TypeScript · Vite 7 · Tailwind CSS v4 · Zustand · Zod · i18next
- **Rendering:** react-markdown · rehype-katex · rehype-highlight · remark-gfm / remark-math · lucide-react
- **Backend (Rust / Tauri 2):** reqwest · tokio (SSE streaming + cancellation) · serde · OS keychain

## Getting Started

### Prerequisites

- **Node.js** 20.19+ or 22.12+ (required by Vite 7)
- **Rust** (stable) via [rustup](https://rustup.rs/)
- Platform-specific Tauri system dependencies — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)

### Install

```bash
npm install
```

### Develop

```bash
npm run tauri dev    # run the full desktop app
npm run dev          # or run the web frontend only (Vite)
```

### Build

```bash
npm run tauri build  # produce a platform installer / binary
```

### Test & type-check

```bash
npm test             # run the test suite (Vitest)
npm run typecheck    # TypeScript type-check (tsc --noEmit)
```

## Configuration

1. On first launch, choose a **data directory** where papers and chat sessions are stored.
2. Open **Settings** (`Ctrl` / `Cmd` + `,`) and configure your model: **API key**, **base URL**, and **model** name.
3. *(Optional)* Enable **web search** and provide an API key for your chosen provider (Tavily / Exa / Firecrawl).

API keys are stored in your operating system's keychain.

## Project Structure

```
src/                 React frontend
  components/          UI by domain — paper / assistant / settings / layout
  stores/              Zustand stores — paper / assistant / config / export
  lib/                 exam (domain logic) · api (AI protocol) · storage · types
  i18n/                en / zh locales
src-tauri/           Rust backend (Tauri 2)
  src/                 openai.rs (streaming) · web_search.rs · keychain.rs · storage.rs
```

## License

Not yet specified.
