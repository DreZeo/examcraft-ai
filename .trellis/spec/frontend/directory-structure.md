# Directory Structure (React frontend)

> How `src/` is organized.

---

## Directory Layout

```
src/
├── App.tsx                  # layout shell: top bar + center canvas + drawer; first-launch gate
├── main.tsx                 # entry: mounts App, imports i18n + styles/index.css
├── components/
│   ├── layout/              # FirstLaunch, TopBar, ExportMenu
│   ├── paper/               # PaperCanvas, QuestionBlock, QuestionEditModal,
│   │                        #   TypeFields, editFields, ExamInfoHeader, Markdown
│   ├── assistant/           # AssistantDrawer, ConfirmationCard, ResultCard, ErrorCard
│   └── settings/            # SettingsModal, ModelConfigSection, ModelConfigForm,
│                            #   GeneralSection, DataDirSection
├── stores/                  # zustand: configStore, paperStore, assistantStore, exportStore
├── lib/
│   ├── types/               # exam.ts, config.ts  (Zod schemas — the data contracts)
│   ├── api/                 # extractJson, validateQuestions, systemPrompt, errorMessages
│   ├── exam/                # merge, studentVersion, summary, answer, blankQuestion (pure logic)
│   ├── export/              # markdown, exportFile
│   ├── storage/             # tauri.ts (typed invoke wrappers)
│   └── __tests__/           # Vitest unit tests for pure lib/ functions
├── i18n/                    # index.ts (i18next init) + locales/{zh,en}.json
└── styles/                  # index.css (Tailwind entry), print.css (@media print)
```

Path alias `@/` → `src/` (configured in `vite.config.ts` + `tsconfig.json`).

---

## Convention: pure logic in lib/, effects in stores, view in components

**What:**
- `lib/**` — pure, side-effect-free, unit-tested functions (parsing, validation,
  merge, markdown assembly, prompt building). No React, no `invoke`.
- `lib/storage/tauri.ts` — the ONLY place `invoke` is wrapped for storage/keychain
  (typed + Zod-validated boundary).
- `stores/**` — orchestrate effects (invoke, persistence, events) over `lib`
  primitives.
- `components/**` — render store state, dispatch actions.

**Why:** keeps the bug-prone core (validation, merge, extraction) pure and fully
testable without mocking Tauri or React. Tests target `lib/`; components stay thin.

**Related:** `frontend/state-management.md`, `frontend/type-safety.md`.

---

## Convention: single source for shared derivations

Logic used in more than one place lives in one `lib/exam/` module, imported
everywhere. Example: `formatAnswer` (`lib/exam/answer.ts`) is used by both the
on-screen `QuestionBlock` and the Markdown export, so the displayed answer and
the exported answer can never diverge. Do not re-implement answer formatting,
answer-stripping (`toStudentVersion`), or paper mutation (`merge.ts`) inline.

Preview/export paper structure must follow the same rule. If screen preview and
export both need section order, Chinese section labels, ordinals, or numbering
rules, put that derivation in `lib/exam/` (for example `paperSections.ts`) and
import it from both places. Do not keep a separate `TYPE_ORDER` / label table in
the export path and another one in components.

---

## Testing

Vitest + jsdom, setup in `src/test/setup.ts`, config in `vite.config.ts`
(`test` block). Tests live in `src/lib/__tests__/`. Per the PRD, automated tests
target pure `lib/` functions; AI/network calls are not in the automated suite
(mock responses test the parsing chain). Run `npx vitest run` + `npx tsc --noEmit`
as the frontend quality gate.
