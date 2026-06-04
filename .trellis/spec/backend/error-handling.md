# Error Handling

> How errors are handled in this project (Tauri Rust backend ↔ React frontend).

---

## Overview

Every Tauri command returns `Result<T, AppError>`. `AppError` is a `thiserror` enum
serialized to the frontend as a tagged JSON object. The React layer maps the
`code` to a localized message via i18n. Errors are never surfaced as raw strings
or panics across the IPC boundary.

Source of truth: `src-tauri/src/error.rs`, consumed by
`src/lib/api/errorMessages.ts`.

---

## Error Types

`AppError` (in `src-tauri/src/error.rs`):

```rust
#[derive(Debug, Clone, thiserror::Error, Serialize)]
#[serde(tag = "code", content = "detail", rename_all = "camelCase")]
pub enum AppError {
    Keychain(String),  // OS keychain failure
    Io(String),        // filesystem
    Serde(String),     // (de)serialization
    Http(String),      // generic HTTP / API
    Auth,              // 401/403 — invalid or expired key
    Quota,             // 429 — quota exceeded / rate limited
    Timeout,           // request timed out
    Network(String),   // connection failed
}
pub type AppResult<T> = Result<T, AppError>;
```

Conversions via `From`: `keyring::Error`, `std::io::Error`, `serde_json::Error`,
`reqwest::Error` (timeout → `Timeout`, connect → `Network`, else → `Http`).
HTTP status mapping lives in the openai module: 401/403 → `Auth`, 429 → `Quota`.

---

## API Error Response Contract

Serialized shape sent to the frontend:

```jsonc
{ "code": "auth" }                          // no detail
{ "code": "network", "detail": "dns error" } // with detail
```

`code` values (camelCase): `keychain | io | serde | http | auth | quota | timeout | network`.

Frontend mapping (`src/lib/api/errorMessages.ts`) →
i18n keys `errors.authFailed | errors.quotaExceeded | errors.timeout | errors.network | errors.unknown`.

---

## Gotcha: serde `rename_all = "camelCase"` is REQUIRED

> **Warning**: Without `rename_all = "camelCase"` on the `#[serde(tag = "code")]`
> enum, serde emits PascalCase codes (`Auth`, `Quota`, …). The frontend matches
> lowercase (`auth`, `quota`, …), so **every** backend error silently falls
> through to the generic "unknown" message — the user never sees the real cause.

**Why it's easy to miss:** it compiles, types check, and the happy path works.
Only error paths break, and only at runtime. Lock the contract with a Rust test:

```rust
#[test]
fn error_codes_serialize_camel_case() {
    let json = serde_json::to_string(&AppError::Auth).unwrap();
    assert_eq!(json, r#"{"code":"auth"}"#);
}
```

---

## Validation & Error Matrix (API layer)

| Condition | AppError | Frontend key |
|-----------|----------|--------------|
| HTTP 401/403 | `Auth` | errors.authFailed |
| HTTP 429 | `Quota` | errors.quotaExceeded |
| reqwest timeout | `Timeout` | errors.timeout |
| reqwest connect fail | `Network` | errors.network |
| other HTTP / parse | `Http` / `Serde` | errors.unknown |

---

## Common Mistakes

### Double-render on streaming errors

**Symptom:** two error cards for one failure.

**Cause:** a streaming command may both `emit("chat:error", ...)` AND reject the
`invoke` promise. The frontend listens on the event AND catches the rejection,
so both fire.

**Fix:** the frontend uses a turn-scoped `settled` flag (claimed
check-and-set in both the done and error handlers) so only the first observed
outcome finalizes the turn. See `src/stores/assistantStore.ts`. When a command
streams via events, pick ONE error path on the frontend.

### Logging secrets

Never log API keys or full request headers. Truncate error bodies; the key is
passed as a parameter and used only for `bearer_auth`.

### keyring v3 feature flags (CRITICAL)

**Symptom:** API keys saved in settings "disappear" after app restart; chat
produces false "auth failed" errors even though the key was just saved successfully.

**Root cause:** `Cargo.toml` declares `keyring = "3"` with NO features enabled.
In keyring v3, OS-native credential stores (Windows Credential Manager, macOS
Keychain, Linux secret-service) moved behind feature flags. **With no features
enabled, keyring silently falls back to an in-memory mock store:**

- `set_password` succeeds and returns `Ok(())` — looks like it saved.
- Nothing persists; the "store" is process RAM.
- On app restart, `get_password` returns `NoEntry`.
- Frontend sees `null`, treats it as missing key, pushes `code: "auth"`.

**Why it's insidious:** Save appears to work at dev time; the bug only manifests
on process restart. If you test save + immediate use in one session, it passes.

**Fix (mandatory):** enable platform features in `Cargo.toml`:

```toml
keyring = { version = "3", features = [
  "apple-native",           # macOS Keychain
  "windows-native",         # Windows Credential Manager
  "sync-secret-service",    # Linux secret-service
  "crypto-rust"             # pure-Rust crypto backend for secret-service
] }
```

Verify with `cargo check` that the native backends compile. Full validation
requires runtime: save a key, fully restart the app process, confirm the key
persists and authenticates.

**Contract test (proactive):** keyring's mock fallback is silent — no compile
or runtime warning. There's no direct test for "am I using the real native store",
but you can guard the dependency declaration with a CI step that greps `Cargo.toml`
for the required features and fails if they're missing.
