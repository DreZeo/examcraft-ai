# State Management

> How state is managed in the React frontend.

---

## Overview

Global state uses **Zustand** (`create` stores in `src/stores/`). No Redux, no
Context for app state. Local-only UI state (modal open, draft input) stays in
component `useState`. There is no server-state cache layer — the "server" is the
Tauri backend reached via `invoke`, and persistence is explicit (see below).

Stores: `configStore` (data dir, model configs, settings), `paperStore` (working
paper, view, autosave, undo), `assistantStore` (chat, streaming), `exportStore`
(export-time header toggles).

---

## Convention: store owns persistence + side effects

**What:** A store action mutates state AND triggers its own persistence /
backend calls. Components call actions; they don't orchestrate saves.

**Example** (`paperStore`): every mutation routes through a private `mutate()`
that sets state then schedules a debounced auto-save honoring the `autoSave`
setting:

```ts
function mutate(next: ExamPaper, extra = {}) {
  set({ paper: next, ...extra });
  scheduleSave(); // debounced 500ms, no-op if autoSave off or no dataDir
}
```

**Why:** single data path. AI-apply, manual edit, reorder, delete all converge
on the same mutate→save path, so autosave/undo can't be bypassed.

---

## Convention: cross-store reads via getState(), not hooks

Stores read each other through `useOtherStore.getState()` inside actions (e.g.
`paperStore` reads `configStore.getState().dataDir`). Hooks (`useStore(sel)`)
are for components only. Avoids hook-rules violations inside plain functions.

---

## Streaming Event Contract (assistantStore ↔ Rust openai.rs)

AI chat streams over **Tauri events**, not the `invoke` return value (invoke is
request/response; events carry the token stream and bypass browser CORS).

Commands: `stream_chat({ baseUrl, apiKey, model, messages, temperature?, maxTokens? })`,
`abort_chat()`, `list_models({ baseUrl, apiKey })`, `test_connection({ baseUrl, apiKey })`.

Events (listen via `@tauri-apps/api/event`):

| Event | Payload | Meaning |
|-------|---------|---------|
| `chat:chunk` | `string` | incremental content delta (batched ~50ms/~80 chars) |
| `chat:done` | `()` | stream finished or cancelled |
| `chat:error` | `{ code, detail? }` | AppError (see backend error-handling.md) |

`messages[0]` is the system prompt, forwarded to the API verbatim — the frontend
builds it (`lib/api/systemPrompt.ts`), Rust does not synthesize one.

---

## Pattern: turn-scoped `settled` flag (single finalization)

**Problem:** a failed `stream_chat` both emits `chat:error` AND rejects the
invoke promise; a `stop()` during teardown can race a cancellation `chat:done`.
Multiple paths try to finalize one turn → double cards / mis-processed buffer.

**Solution:** a `settled` boolean reset at each stream attempt, claimed
(check-and-set) at the top of every finalizer (`handleDone`, `handleError`,
`stop`). The first observer wins; the rest no-op.

```ts
if (get().settled) return;
set({ settled: true });
// ...finalize exactly once
```

**Why:** events + promise rejection + user-cancel are concurrent; idempotent
finalization is the only reliable guard. See `assistantStore.ts`.

---

## Pattern: preview-then-apply with single-level undo

AI output is never auto-applied. The result card holds the parsed questions;
`applyAiQuestions(questions, 'append'|'replace')` snapshots the current paper
into `undoSnapshot` before mutating, enabling one-level `undoApply()`. Manual
edits don't push undo state (MVP scope).

`assistantStore` owns the AI result-card apply state. Components must call
`assistantStore.applyResult(cardId)` and `assistantStore.undoResult(cardId)`,
not `paperStore.undoApply()` directly. `paperStore` owns the paper snapshot, but
`assistantStore` must keep the chat message's `applied` flag and transient
`undoableResultId` synchronized with that snapshot. After undo, the same result
card must become applicable again.

```ts
// Correct: assistantStore coordinates message state + paper snapshot.
undoResult(cardId) {
  if (get().undoableResultId !== cardId) return;
  usePaperStore.getState().undoApply();
  set({ undoableResultId: null /* plus message applied:false */ });
}
```

## Pattern: paper-scoped persistence

The app manages a local paper library rather than a single anonymous document.
`paperStore` owns the active paper id, paper metadata list, and all paper
mutations. Paper metadata lives in `papers/index.json`; each `ExamPaper` payload
stays in `papers/{paperId}.json`, validated by Zod on the frontend. Do not add
library metadata to `ExamPaper`.

Assistant history is scoped to the active paper. `assistantStore.loadForPaper`
loads or creates `chats/{paperId}/{sessionId}.json`, including both rendered
messages and the API `apiHistory`. Switching papers must switch assistant
sessions too. Message content is read-only history; "edit" means renaming the
chat session title.

`working-paper.json` remains a compatibility mirror of the active paper. New
save paths should write the active paper file and update the mirror, not bring
back single-paper state.

---

## Common Mistakes

- **Auto-applying AI results**: breaks the preview/confirm contract. Result cards
  are preview-only (`applied:false`) until the user clicks apply.
- **Undoing AI results from a component via `paperStore.undoApply()`**: restores
  the paper but leaves the assistant message `applied:true`, so the card cannot
  be applied again. Route through `assistantStore.undoResult(cardId)`.
- **Calling a store hook inside an action**: use `getState()` instead.
- **Persisting from the component**: mutate via the store action so autosave runs.
