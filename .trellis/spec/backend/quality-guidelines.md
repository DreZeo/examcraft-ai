# Quality Guidelines

> Code quality standards for backend development.

---

## Overview

The backend is a small Rust/Tauri layer. Keep it thin: persist files, store
secrets, proxy OpenAI-compatible HTTP, and emit typed events. The frontend owns
domain schemas and validation; Rust owns OS integration, network behavior, and
the IPC error contract.

Verification commands:

```bash
npm run typecheck
npm test
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Backend changes that touch the frontend contract should usually be paired with
frontend typecheck/tests because the IPC boundary is string/event based.

---

## Forbidden Patterns

- Panics or raw string errors in Tauri commands. Commands return `AppResult<T>`
  with `AppError` so React can localize by `code`.
- Backend schema duplication for exam paper/config JSON. Storage commands pass
  raw JSON strings; Zod in `src/lib/types/` is the single source of truth.
- Logging or persisting API keys outside `keychain.rs`. Network commands receive
  the key as an argument and use it only for `bearer_auth`.
- OpenAI SDK assumptions. `openai.rs` deliberately uses `reqwest` and tolerant
  serde structs because compatible providers vary while preserving core fields.
- Unbounded event-per-token streaming. Keep batching in `openai.rs`
  (`BATCH_INTERVAL`, `BATCH_MAX_CHARS`) so the UI stays responsive.
- Adding a Tauri plugin without adding both `.plugin(...)` in `lib.rs` and the
  matching capability permission in `src-tauri/capabilities/default.json`.

---

## Required Patterns

- Add a new backend concern as `src-tauri/src/<concern>.rs`, register `mod` and
  `tauri::generate_handler!` entries in `src-tauri/src/lib.rs`.
- Use `AppResult<T>` for all command fallible paths and add `From` conversions
  in `error.rs` when introducing a new dependency error type.
- Keep command args snake_case in Rust and call them with camelCase from
  TypeScript (`invoke("stream_chat", { baseUrl, apiKey, ... })`).
- For HTTP status failures, map user-actionable cases to stable `AppError`
  variants (`Auth`, `Quota`, `Timeout`, `Network`) before falling back to
  `Http`.
- For streaming work, use Tauri events with stable names and payload shapes.
  Current contract: `chat:chunk` string, `chat:done` unit, `chat:error`
  `AppError`.
- Truncate remote error bodies before returning them. `status_error()` in
  `openai.rs` limits generic HTTP bodies to 500 characters.

---

## Testing Requirements

Unit-test load-bearing pure helpers and serialization contracts in Rust:

- `src-tauri/src/error.rs` tests camelCase error serialization. This prevents
  frontend error mapping from silently falling through to `errors.unknown`.
- `src-tauri/src/openai.rs` tests URL joining, SSE event draining, malformed
  chunk tolerance, incomplete event tails, and Unicode-safe truncation.

When adding a command:

- Add Rust unit tests for pure helpers, mappers, and serialization.
- Add frontend tests when the command changes a user-visible contract
  (`src/lib/__tests__/errorMessages.test.ts`, storage/API helpers, or store
  behavior).
- Run `cargo test` and `cargo check` for backend changes. Run `npm run
  typecheck` when command names, args, events, or payload shapes are touched.

---

## Code Review Checklist

- Does every command return `AppResult<T>` and avoid `unwrap()`/`expect()` in
  runtime paths?
- Are error codes still serialized exactly as the frontend expects?
- Are secrets kept out of logs, event payloads, persisted JSON, and generic
  error details?
- Does Rust remain a thin persistence/network layer instead of duplicating Zod
  schemas?
- Are new plugins represented in both builder registration and capabilities?
- Do streaming changes preserve single completion/error semantics for
  `assistantStore`'s turn-scoped finalization?
