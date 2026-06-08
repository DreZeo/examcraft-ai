//! OpenAI-compatible API layer.
//!
//! All requests to the user-configured model go through this Rust backend:
//! this bypasses browser CORS, keeps the auth header server-side, and gives us
//! full control over SSE streaming + cancellation.
//!
//! Deliberately SDK-free: only two endpoints are used (`POST /chat/completions`
//! streaming and `GET /models`), and "OpenAI-compatible" third parties
//! (DeepSeek, Ollama, relays, local models) only guarantee request/response
//! *format* compatibility. Deserialization is therefore tolerant: we read only
//! the fields we need and ignore everything else, so field variations across
//! compatible implementations never break parsing.
//!
//! The API key is always passed in by the caller (the frontend fetches it from
//! the keychain via `get_api_key`, then hands it to these commands). It is never
//! read here and never logged.

use crate::error::{AppError, AppResult};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::sync::broadcast;

/// Frontend event names. The Part B (React) layer subscribes to these exact
/// strings, so they are the load-bearing contract between backend and frontend.
const EVENT_CHUNK: &str = "chat:chunk";
const EVENT_REASONING_CHUNK: &str = "chat:reasoning-chunk";
const EVENT_DONE: &str = "chat:done";
const EVENT_ERROR: &str = "chat:error";

/// Batch tuning: flush accumulated content to the frontend at most every
/// ~50ms, or once it grows past ~80 chars, whichever comes first. This keeps
/// the typewriter effect smooth while avoiding one Tauri event per token.
const BATCH_INTERVAL: Duration = Duration::from_millis(50);
const BATCH_MAX_CHARS: usize = 80;

/// Overall timeout for the small, non-streaming requests (list/test).
const SHORT_TIMEOUT: Duration = Duration::from_secs(30);
/// Connect timeout for the streaming request. We intentionally do NOT set an
/// overall timeout on the stream, since a long generation is expected.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(30);

/// A single chat message as sent by the frontend (`{ role, content }`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

// --- Tolerant response shapes -------------------------------------------------

/// One streamed SSE chunk. Only assistant text/reasoning deltas are read; every
/// other field (id, model, usage, finish_reason, role, ...) is ignored by serde.
#[derive(Debug, Deserialize)]
struct StreamChunk {
    #[serde(default)]
    choices: Vec<StreamChoice>,
}

#[derive(Debug, Deserialize)]
struct StreamChoice {
    #[serde(default)]
    delta: Delta,
}

#[derive(Debug, Default, Deserialize)]
struct Delta {
    #[serde(default)]
    content: Option<serde_json::Value>,
    #[serde(default)]
    reasoning_content: Option<serde_json::Value>,
    #[serde(default)]
    reasoning: Option<serde_json::Value>,
    #[serde(default)]
    thinking: Option<serde_json::Value>,
}

/// `GET /models` response. Only `data[].id` is read.
#[derive(Debug, Deserialize)]
struct ModelsResponse {
    #[serde(default)]
    data: Vec<ModelEntry>,
}

#[derive(Debug, Deserialize)]
struct ModelEntry {
    #[serde(default)]
    id: String,
}

// --- Cancellation -------------------------------------------------------------

/// Process-wide broadcast channel used to signal an in-flight stream to stop.
/// A single AI drawer means a single in-flight request, so one channel is
/// sufficient. `stream_chat` subscribes at the very start, so any abort sent
/// before a stream begins is naturally ignored (broadcast only delivers
/// messages sent after `subscribe`).
fn cancel_channel() -> &'static broadcast::Sender<()> {
    static CHANNEL: OnceLock<broadcast::Sender<()>> = OnceLock::new();
    CHANNEL.get_or_init(|| broadcast::channel(8).0)
}

/// Cancel the in-flight chat stream, if any. No-op when nothing is running.
#[tauri::command]
pub fn abort_chat() {
    let _ = cancel_channel().send(());
}

// --- HTTP helpers -------------------------------------------------------------

fn stream_client() -> AppResult<reqwest::Client> {
    reqwest::Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .build()
        .map_err(AppError::from)
}

fn short_client() -> AppResult<reqwest::Client> {
    reqwest::Client::builder()
        .timeout(SHORT_TIMEOUT)
        .build()
        .map_err(AppError::from)
}

/// Strip a single trailing slash so `{base}/chat/completions` is well-formed
/// whether the user entered `.../v1` or `.../v1/`.
fn join(base_url: &str, path: &str) -> String {
    format!("{}/{}", base_url.trim_end_matches('/'), path)
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        s.chars().take(max).collect::<String>() + "…"
    }
}

/// Map a non-success HTTP response to a coded `AppError`. Reads the body for
/// the generic case only (auth/quota carry no useful body).
async fn status_error(resp: reqwest::Response) -> AppError {
    let status = resp.status();
    match status.as_u16() {
        401 | 403 => AppError::Auth,
        429 => AppError::Quota,
        code => {
            let body = resp.text().await.unwrap_or_default();
            AppError::Http(format!("HTTP {}: {}", code, truncate(&body, 500)))
        }
    }
}

// --- Commands -----------------------------------------------------------------

/// Stream a chat completion. Emits incremental `chat:chunk` string payloads,
/// then `chat:done`; on failure emits `chat:error` with an `AppError` payload.
///
/// `base_url` already includes the `/v1` segment (the user enters e.g.
/// `https://api.openai.com/v1`).
#[tauri::command]
pub async fn stream_chat(
    app: AppHandle,
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<ChatMessage>,
    temperature: Option<f64>,
    max_tokens: Option<u32>,
) -> AppResult<()> {
    let result = stream_chat_inner(
        &app,
        base_url,
        api_key,
        model,
        messages,
        temperature,
        max_tokens,
    )
    .await;

    match result {
        Ok(()) => Ok(()),
        Err(e) => {
            // Surface the error through the event channel too, so the
            // event-driven frontend can render an error card regardless of how
            // it observes the invoke promise.
            let _ = app.emit(EVENT_ERROR, e.clone());
            Err(e)
        }
    }
}

#[allow(clippy::too_many_arguments)]
async fn stream_chat_inner(
    app: &AppHandle,
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<ChatMessage>,
    temperature: Option<f64>,
    max_tokens: Option<u32>,
) -> AppResult<()> {
    let mut body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true,
    });
    if let Some(t) = temperature {
        body["temperature"] = serde_json::json!(t);
    }
    if let Some(m) = max_tokens {
        body["max_tokens"] = serde_json::json!(m);
    }

    let resp = stream_client()?
        .post(join(&base_url, "chat/completions"))
        .bearer_auth(&api_key)
        .json(&body)
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(status_error(resp).await);
    }

    // Subscribe AFTER the request is established so a stale abort cannot kill a
    // fresh stream.
    let mut cancel_rx = cancel_channel().subscribe();

    let stream = resp.bytes_stream();
    tokio::pin!(stream);

    let mut sse_buf = String::new();
    let mut batch = StreamBatches::default();
    let mut last_flush = Instant::now();

    loop {
        tokio::select! {
            biased;

            // Cancellation wins over pulling the next chunk.
            _ = cancel_rx.recv() => {
                flush_batch(app, &mut batch);
                let _ = app.emit(EVENT_DONE, ());
                return Ok(());
            }

            next = stream.next() => {
                match next {
                    Some(Ok(bytes)) => {
                        sse_buf.push_str(&String::from_utf8_lossy(&bytes));
                        if drain_events(&sse_buf, &mut batch).done {
                            // Recompute remaining buffer is unnecessary; [DONE]
                            // is the terminal sentinel.
                            flush_batch(app, &mut batch);
                            let _ = app.emit(EVENT_DONE, ());
                            return Ok(());
                        }
                        // drain_events consumed whole events; keep the tail.
                        retain_tail(&mut sse_buf);
                        maybe_flush(app, &mut batch, &mut last_flush);
                    }
                    Some(Err(e)) => return Err(AppError::from(e)),
                    None => {
                        // Stream closed without an explicit [DONE]; treat as
                        // normal completion.
                        flush_batch(app, &mut batch);
                        let _ = app.emit(EVENT_DONE, ());
                        return Ok(());
                    }
                }
            }
        }
    }
}

struct DrainOutcome {
    done: bool,
}

/// Parse all complete SSE events (`...\n\n`) currently in `buf`, appending any
/// decoded content/reasoning to `batch`. Returns whether the `[DONE]` sentinel was seen.
///
/// This only reads `buf`; the caller trims consumed bytes afterwards via
/// `retain_tail`. Because `retain_tail` leaves no complete event behind, the
/// next call only ever sees newly arrived events, so content is never
/// double-counted.
fn drain_events(buf: &str, batch: &mut StreamBatches) -> DrainOutcome {
    let mut done = false;
    let mut pos = 0usize;
    while let Some(rel) = buf[pos..].find("\n\n") {
        let end = pos + rel;
        let event = &buf[pos..end];
        for line in event.lines() {
            let line = line.trim();
            if let Some(data) = line.strip_prefix("data:") {
                let data = data.trim();
                if data == "[DONE]" {
                    done = true;
                } else if !data.is_empty() {
                    if let Ok(chunk) = serde_json::from_str::<StreamChunk>(data) {
                        if let Some(choice) = chunk.choices.into_iter().next() {
                            append_delta(&choice.delta, batch);
                        }
                    }
                }
            }
        }
        pos = end + 2;
        if done {
            break;
        }
    }
    DrainOutcome { done }
}

#[derive(Default)]
struct StreamBatches {
    content: String,
    reasoning: String,
}

impl StreamBatches {
    fn is_empty(&self) -> bool {
        self.content.is_empty() && self.reasoning.is_empty()
    }

    fn char_count(&self) -> usize {
        self.content.chars().count() + self.reasoning.chars().count()
    }
}

fn append_delta(delta: &Delta, batch: &mut StreamBatches) {
    if let Some(reasoning) = extract_plain_text(delta.reasoning_content.as_ref())
        .or_else(|| extract_plain_text(delta.reasoning.as_ref()))
        .or_else(|| extract_plain_text(delta.thinking.as_ref()))
    {
        batch.reasoning.push_str(&reasoning);
    }

    if let Some(content) = delta.content.as_ref() {
        let reasoning_from_content = extract_thinking_text(content);
        if !reasoning_from_content.is_empty() {
            batch.reasoning.push_str(&reasoning_from_content);
        }
        let visible_content = extract_content_text(content);
        if !visible_content.is_empty() {
            batch.content.push_str(&visible_content);
        }
    }
}

fn extract_plain_text(value: Option<&serde_json::Value>) -> Option<String> {
    value.and_then(|v| {
        let text = collect_text(v);
        if text.is_empty() {
            None
        } else {
            Some(text)
        }
    })
}

fn collect_text(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(text) => text.clone(),
        serde_json::Value::Array(items) => items.iter().map(collect_text).collect(),
        serde_json::Value::Object(map) => map
            .get("text")
            .or_else(|| map.get("content"))
            .or_else(|| map.get("thinking"))
            .map(collect_text)
            .unwrap_or_default(),
        _ => String::new(),
    }
}

fn extract_content_text(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(text) => text.clone(),
        serde_json::Value::Array(items) => items.iter().map(extract_content_text).collect(),
        serde_json::Value::Object(map) => {
            if map
                .get("type")
                .and_then(|v| v.as_str())
                .is_some_and(|kind| kind.eq_ignore_ascii_case("thinking"))
            {
                String::new()
            } else {
                map.get("text")
                    .or_else(|| map.get("content"))
                    .map(collect_text)
                    .unwrap_or_default()
            }
        }
        _ => String::new(),
    }
}

fn extract_thinking_text(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Array(items) => items.iter().map(extract_thinking_text).collect(),
        serde_json::Value::Object(map) => {
            if map
                .get("type")
                .and_then(|v| v.as_str())
                .is_some_and(|kind| kind.eq_ignore_ascii_case("thinking"))
            {
                return map
                    .get("thinking")
                    .or_else(|| map.get("text"))
                    .map(collect_text)
                    .unwrap_or_default();
            }
            map.get("thinking").map(collect_text).unwrap_or_default()
        }
        _ => String::new(),
    }
}

/// Remove everything up to and including the last `\n\n`, keeping only an
/// incomplete trailing event for the next read.
fn retain_tail(buf: &mut String) {
    if let Some(pos) = buf.rfind("\n\n") {
        buf.drain(..pos + 2);
    }
}

fn maybe_flush(app: &AppHandle, batch: &mut StreamBatches, last_flush: &mut Instant) {
    if batch.is_empty() {
        return;
    }
    if batch.char_count() >= BATCH_MAX_CHARS || last_flush.elapsed() >= BATCH_INTERVAL {
        flush_batch(app, batch);
        *last_flush = Instant::now();
    }
}

fn flush_batch(app: &AppHandle, batch: &mut StreamBatches) {
    if !batch.reasoning.is_empty() {
        let _ = app.emit(EVENT_REASONING_CHUNK, batch.reasoning.clone());
        batch.reasoning.clear();
    }
    if !batch.content.is_empty() {
        let _ = app.emit(EVENT_CHUNK, batch.content.clone());
        batch.content.clear();
    }
}

/// `GET {base_url}/models` → list of model ids (`data[].id`). Backs the
/// settings "fetch models" button.
#[tauri::command]
pub async fn list_models(base_url: String, api_key: String) -> AppResult<Vec<String>> {
    let resp = short_client()?
        .get(join(&base_url, "models"))
        .bearer_auth(&api_key)
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(status_error(resp).await);
    }

    let parsed: ModelsResponse = resp.json().await?;
    Ok(parsed
        .data
        .into_iter()
        .map(|m| m.id)
        .filter(|id| !id.is_empty())
        .collect())
}

/// Minimal connectivity/auth check used by the settings "test connection"
/// button. Reuses the model-list endpoint so HTTP status mapping (401→Auth,
/// 429→Quota, timeout→Timeout, connect→Network) lives in one place.
#[tauri::command]
pub async fn test_connection(base_url: String, api_key: String) -> AppResult<()> {
    list_models(base_url, api_key).await.map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn join_trims_trailing_slash() {
        assert_eq!(
            join("https://api.openai.com/v1", "chat/completions"),
            "https://api.openai.com/v1/chat/completions"
        );
        assert_eq!(
            join("https://api.openai.com/v1/", "models"),
            "https://api.openai.com/v1/models"
        );
    }

    #[test]
    fn drain_extracts_content_and_ignores_unknown_fields() {
        let buf = concat!(
            "data: {\"id\":\"x\",\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"content\":\"Hello\"}}]}\n\n",
            "data: {\"choices\":[{\"delta\":{\"content\":\" world\"},\"finish_reason\":null}]}\n\n"
        );
        let mut batch = StreamBatches::default();
        let out = drain_events(buf, &mut batch);
        assert!(!out.done);
        assert_eq!(batch.content, "Hello world");
        assert_eq!(batch.reasoning, "");
    }

    #[test]
    fn drain_detects_done_sentinel() {
        let buf = "data: {\"choices\":[{\"delta\":{\"content\":\"hi\"}}]}\n\ndata: [DONE]\n\n";
        let mut batch = StreamBatches::default();
        let out = drain_events(buf, &mut batch);
        assert!(out.done);
        assert_eq!(batch.content, "hi");
    }

    #[test]
    fn drain_skips_empty_and_keepalive_deltas() {
        // First chunk has only a role (no content); should contribute nothing.
        let buf = concat!(
            "data: {\"choices\":[{\"delta\":{\"role\":\"assistant\"}}]}\n\n",
            "data: {\"choices\":[{\"delta\":{\"content\":\"ok\"}}]}\n\n"
        );
        let mut batch = StreamBatches::default();
        drain_events(buf, &mut batch);
        assert_eq!(batch.content, "ok");
    }

    #[test]
    fn drain_extracts_reasoning_content_separately() {
        let buf = concat!(
            "data: {\"choices\":[{\"delta\":{\"reasoning_content\":\"think\"}}]}\n\n",
            "data: {\"choices\":[{\"delta\":{\"content\":\"answer\"}}]}\n\n"
        );
        let mut batch = StreamBatches::default();
        let out = drain_events(buf, &mut batch);
        assert!(!out.done);
        assert_eq!(batch.reasoning, "think");
        assert_eq!(batch.content, "answer");
    }

    #[test]
    fn drain_extracts_thinking_array_without_polluting_content() {
        let buf = concat!(
            "data: {\"choices\":[{\"delta\":{\"content\":[{\"type\":\"thinking\",\"thinking\":[{\"type\":\"text\",\"text\":\"plan\"}]},{\"type\":\"text\",\"text\":\"final\"}]}}]}\n\n",
            "data: [DONE]\n\n"
        );
        let mut batch = StreamBatches::default();
        let out = drain_events(buf, &mut batch);
        assert!(out.done);
        assert_eq!(batch.reasoning, "plan");
        assert_eq!(batch.content, "final");
    }

    #[test]
    fn retain_tail_keeps_incomplete_event() {
        // Simulates an event split across two reads.
        let mut buf =
            String::from("data: {\"choices\":[{\"delta\":{\"content\":\"a\"}}]}\n\ndata: {\"choi");
        let mut batch = StreamBatches::default();
        drain_events(&buf, &mut batch);
        retain_tail(&mut buf);
        assert_eq!(batch.content, "a");
        assert_eq!(buf, "data: {\"choi");

        // Second read completes the event.
        buf.push_str("ces\":[{\"delta\":{\"content\":\"b\"}}]}\n\n");
        let mut batch2 = StreamBatches::default();
        drain_events(&buf, &mut batch2);
        retain_tail(&mut buf);
        assert_eq!(batch2.content, "b");
        assert_eq!(buf, "");
    }

    #[test]
    fn drain_handles_malformed_json_without_panicking() {
        let buf = "data: {not valid json}\n\ndata: {\"choices\":[{\"delta\":{\"content\":\"x\"}}]}\n\n";
        let mut batch = StreamBatches::default();
        let out = drain_events(buf, &mut batch);
        assert!(!out.done);
        assert_eq!(batch.content, "x");
    }

    #[test]
    fn truncate_respects_char_boundaries() {
        assert_eq!(truncate("hello", 10), "hello");
        assert_eq!(truncate("hello", 3), "hel…");
    }
}

