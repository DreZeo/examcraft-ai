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
