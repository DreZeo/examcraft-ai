# Logging Guidelines

> How logging is done in this project.

---

## Overview

The backend currently has no logging crate and no `println!`/`eprintln!` usage.
Operational feedback is delivered through typed command errors and Tauri events,
not console output. Keep this quiet default unless there is a concrete debugging
or support need.

Examples:

- `src-tauri/src/error.rs` serializes `AppError` for command failures.
- `src-tauri/src/openai.rs` emits `chat:error` for stream failures and
  `chat:done` for normal completion/cancel.
- `src-tauri/src/keychain.rs` treats missing credentials as `Ok(None)` or
  no-op delete instead of logging expected states.

---

## Log Levels

No project-level log levels are configured today.

If logging is introduced later, use it sparingly:

- `debug`: local diagnostics only; never required for user-visible behavior.
- `info`: major lifecycle milestones only, such as app startup or selected data
  directory, and only if support needs it.
- `warn`: recoverable unexpected conditions that the app handled.
- `error`: unrecoverable internal failures that are not already represented well
  by an `AppError`.

Do not add a logging dependency just to inspect normal command flow during a
task. Prefer tests for helpers and typed errors for runtime failures.

---

## Structured Logging

There is no structured logging format yet. If a future task adds one, prefer a
single Rust logging/tracing dependency configured from `lib.rs` and keep records
machine-readable with fields such as:

- operation (`stream_chat`, `load_config`, `store_api_key`)
- result (`ok`, `error`, `cancelled`)
- stable error code (`auth`, `quota`, `timeout`, `network`, etc.)
- duration where useful

Never log raw request/response payloads by default; AI prompts and generated
exam content are user data.

---

## What to Log

Current convention: log nothing in normal operation.

When adding logs in a future support/debugging task, safe candidates are:

- command start/finish for non-sensitive operations
- HTTP status category without body content
- stream cancellation/completion counts
- selected data directory path only if the user explicitly needs diagnostics

---

## What NOT to Log

Never log:

- API keys, Authorization headers, or keychain secrets
- full OpenAI-compatible request bodies, system prompts, chat messages, or
  generated exam content
- raw persisted `config.json` or `working-paper.json`
- full remote error bodies; `openai.rs` already truncates generic HTTP details
  before returning an `AppError`
- filesystem paths unless they are needed for a user-facing diagnostic

The app is a local exam-paper tool; treat prompts, questions, answers, and
selected folders as user data.
