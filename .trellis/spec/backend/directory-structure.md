# Directory Structure (Rust / Tauri backend)

> How the `src-tauri/` backend is organized.

---

## Directory Layout

```
src-tauri/src/
├── main.rs        # binary entry — calls examgen_lib::run()
├── lib.rs         # tauri::Builder, plugin registration, invoke_handler
├── error.rs       # AppError enum + AppResult (see error-handling.md)
├── keychain.rs    # OS keychain commands (API key storage)
├── storage.rs     # bootstrap pointer + data-dir + config/paper JSON I/O
└── openai.rs      # OpenAI-compatible API (streaming chat, models, test)
```

Crate name is `examgen` (lib `examgen_lib`). Each concern is one module; commands
live next to their domain logic, not in a central commands.rs.

---

## Convention: one module per concern, register in lib.rs

**What:** A new backend feature gets its own `src-tauri/src/<concern>.rs` with
`#[tauri::command]` fns, then registered in `lib.rs`:

```rust
mod openai;
// ...
.invoke_handler(tauri::generate_handler![
    keychain::store_api_key, keychain::get_api_key, /* ... */
    openai::stream_chat, openai::abort_chat, openai::list_models, openai::test_connection,
])
```

**Why:** keeps the IPC surface auditable in one place; matches how PR1–PR2 grew.

---

## Command Signatures (current IPC surface)

Args are snake_case in Rust, called as camelCase from JS (`invoke('name', { camelArg })`).

**keychain.rs** — keyed by model-config `id`:
- `store_api_key(account, secret) -> AppResult<()>`
- `get_api_key(account) -> AppResult<Option<String>>`
- `delete_api_key(account) -> AppResult<()>`  (no-op if absent)
- `has_api_key(account) -> AppResult<bool>`

**storage.rs** — JSON persisted in the user-chosen data dir; only a bootstrap
pointer lives in the Tauri app-data dir:
- `get_data_dir() -> AppResult<Option<String>>`
- `set_data_dir(data_dir) -> AppResult<()>`
- `default_data_dir() -> AppResult<String>`  (Documents/AI试卷)
- `open_data_dir(data_dir) -> AppResult<()>`  (create if missing, then open in platform file manager)
- `load_config(data_dir) / save_config(data_dir, contents)`  (raw JSON string)
- `load_working_paper(data_dir) / save_working_paper(data_dir, contents)`
- `load_paper_index(data_dir) / save_paper_index(data_dir, contents)`
- `load_paper(data_dir, paper_id) / save_paper(data_dir, paper_id, contents) / delete_paper(data_dir, paper_id)`
- `load_chat_index(data_dir, paper_id) / save_chat_index(data_dir, paper_id, contents)`
- `load_chat_session(data_dir, paper_id, session_id) / save_chat_session(...) / delete_chat_session(...)`

**openai.rs** — see frontend `state-management.md` for the event contract:
- `stream_chat(base_url, api_key, model, messages, temperature?, max_tokens?) -> AppResult<()>` (streams via events)
- `abort_chat() -> AppResult<()>`
- `list_models(base_url, api_key) -> AppResult<Vec<String>>`
- `test_connection(base_url, api_key) -> AppResult<()>`

---

## Convention: Rust stores/forwards, frontend owns schema

**What:** storage commands read/write **raw JSON strings**. They do NOT
deserialize into typed structs. Zod validation happens on the frontend
(`src/lib/storage/tauri.ts`).

**Why:** the canonical data contract (exam paper, config) is the Zod schema in
TS. Duplicating it as Rust structs would create two sources of truth that drift.
Rust is a thin, schema-agnostic persistence + network layer.

**Related:** `frontend/type-safety.md` (Zod as the single contract).

Paper library and chat history commands follow the same rule. Rust owns the
directory layout (`papers/`, `chats/`) and safe file names; TypeScript owns
`PaperIndex`, `ChatIndex`, and `ChatSession` validation. `save_paper` also
updates `working-paper.json` as a compatibility mirror of the active paper.

---

## Convention: secrets never cross into domain modules

`openai.rs` receives the API key as a parameter; it never reads the keychain
itself. The frontend fetches the key via `get_api_key` then passes it to
`stream_chat`/`list_models`/`test_connection`. Keeps secret access in one module
and out of network/logging code. See `error-handling.md`.

---

## Capabilities

Plugin permissions are declared in `src-tauri/capabilities/default.json`
(`dialog:default`, `fs:default`, `opener:default` added on top of `core:default`).
A new plugin needs both `.plugin(...)` in lib.rs AND its permission here.

## Scenario: Opening the User Data Directory

### 1. Scope / Trigger

- Trigger: settings UI needs to open a user-selected local directory in the
  system file manager.
- This crosses frontend component → TS storage wrapper → Rust command → OS
  process boundary, so the command contract belongs in backend code-spec.

### 2. Signatures

- Rust command: `open_data_dir(data_dir: String) -> AppResult<()>`
- Frontend wrapper: `openDataDir(dataDir: string): Promise<void>`
- Component call site: `DataDirSection` calls the wrapper; it must not call
  `@tauri-apps/plugin-opener.openPath` directly for arbitrary data dirs.

### 3. Contracts

- Request field `data_dir`: absolute or user-selected directory path.
- Behavior: Rust calls `fs::create_dir_all(data_dir)` first, then spawns the
  platform file manager:
  - Windows: `explorer <path>`
  - macOS: `open <path>`
  - Linux/Unix: `xdg-open <path>`
- Response: `Ok(())` means the OS process was spawned. It does not guarantee
  the file manager window stayed open or came to the front.

### 4. Validation & Error Matrix

| Condition | Result |
|-----------|--------|
| Directory missing but creatable | create it, then open |
| Directory creation denied | `AppError::Io` |
| File manager command cannot spawn | `AppError::Io` |
| Frontend receives rejection | show localized settings error feedback |

### 5. Good/Base/Bad Cases

- Good: configured path exists and opens in Explorer/Finder/file manager.
- Base: configured path was deleted; command recreates it and opens it.
- Bad: frontend calls `openPath(dataDir)` directly and Tauri opener path scope
  rejects the arbitrary user directory, making the button appear inert.

### 6. Tests Required

- Component regression test asserts the button calls `openDataDir(dataDir)`.
- Component rejection test asserts localized error feedback appears.
- `cargo check --manifest-path src-tauri/Cargo.toml` must pass after command
  registration changes in `lib.rs`.

### 7. Wrong vs Correct

#### Wrong

```tsx
await openPath(dataDir);
```

#### Correct

```tsx
await openDataDir(dataDir);
```

## Scenario: Web Search Provider Proxy

### 1. Scope / Trigger

- Trigger: assistant web search calls third-party search APIs before a model
  turn, then returns normalized sources to the frontend.
- This crosses frontend settings/chat state → Tauri command → provider HTTP API
  → frontend Zod validation → assistant prompt injection.

### 2. Signatures

- Rust command:
  `web_search(provider, api_key, query, result_count, content_mode) -> AppResult<Vec<WebSearchResult>>`
- Rust command:
  `test_web_search(provider, api_key, content_mode) -> AppResult<()>`
- Frontend wrappers:
  `webSearch(args): Promise<WebSearchResult[]>`
  and `testWebSearch(args): Promise<void>`

### 3. Contracts

- `provider`: `"tavily" | "exa"`.
- `api_key`: secret from OS keychain; never persisted in `config.json`.
- `query`: user message text used for the search.
- `result_count`: bounded to 3-10 before provider calls.
- `content_mode`: `"summary" | "deep"`.
- Response result:
  `{ title, url, snippet, content?, publishedAt?, provider }`.
- Rust owns provider-specific HTTP request/response mapping.
- TypeScript owns persisted config and chat-history validation with Zod.

### 4. Validation & Error Matrix

| Condition | Result |
|-----------|--------|
| Missing key | Frontend blocks before command or returns non-retryable auth error |
| Provider 401/403 | `AppError::Auth` |
| Provider 429 | `AppError::Quota` |
| Timeout/connect failure | `AppError::Timeout` / `AppError::Network` |
| Other provider status/body parse issue | `AppError::Http` / `AppError::Serde` |
| Too-low/too-high result count | Clamp to 3-10 in Rust and validate in TS settings |

### 5. Good/Base/Bad Cases

- Good: configured provider returns normalized sources; frontend injects them
  into the model prompt and renders a persisted source card.
- Base: provider returns some sparse fields; normalization keeps URL and empty
  strings rather than panicking.
- Bad: search fails and assistant silently falls back to ordinary chat. The
  required behavior is to block the model call so the user is not misled.

### 6. Tests Required

- Rust unit tests for result-count bounds and Unicode-safe truncation.
- Frontend schema tests for web-search settings defaults/bounds and persisted
  `webSearch` chat messages.
- `cargo check`, `cargo test`, `npm run typecheck`, and `npm test` after command
  or payload changes.

### 7. Wrong vs Correct

#### Wrong

```tsx
// Search failed, but this still invokes the model with no web context.
await runChat();
```

#### Correct

```tsx
const results = await performWebSearch(trimmed);
if (results == null) return;
await runChat(results);
```

### Gotcha: `fs:default` does not grant file writes

`fs:default` only covers app-specific directory reads and directory creation. If
frontend code uses `@tauri-apps/plugin-fs` to read or write user-selected files,
grant the exact command permission in `src-tauri/capabilities/default.json`.

Good:

```json
{
  "permissions": [
    "dialog:default",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file"
  ]
}
```

Bad:

```json
{
  "permissions": ["dialog:default", "fs:default"]
}
```

Why: `dialog.open()` / `dialog.save()` add the selected path to the runtime fs
scope, but the `read_text_file` / `write_text_file` commands still need to be
enabled. Without the command permission, export/import flows can look like
no-ops unless the UI surfaces the rejected promise.
