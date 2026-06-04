# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

Frontend quality is enforced by TypeScript strict mode, Vitest unit tests, Zod
runtime validation, and conventions in the component/state/type-safety specs.
There is no separate lint script today; use typecheck and tests as the baseline.

Required commands:

```bash
npm run typecheck
npm test
```

For cross-layer changes, also run the Rust checks:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

---

## Forbidden Patterns

- `any` or unchecked `as T` at trust boundaries. Use `unknown` plus Zod parse.
- Hand-written TypeScript types that duplicate Zod schemas.
- Hardcoded user-facing strings. Use `t("namespace.key")` and update both
  `src/i18n/locales/zh.json` and `en.json`.
- Hardcoded surface/text colors (`bg-white`, `text-black`, `slate-*`,
  `indigo-*`) in components. Use semantic tokens and shared classes from
  `src/lib/ui/styles.ts`.
- Emoji/Unicode symbols as UI icons. Use `lucide-react` icons.
- Component-owned persistence or backend orchestration. Call store actions.
- Whole-store subscriptions when a selector is enough.
- Animating layout properties (`width`, `height`) for interactions.
- New UI chrome without `no-print` when it should not appear in PDF export.

---

## Required Patterns

- Validate AI output, persisted JSON, and IPC boundary data with Zod schemas.
- Derive exported domain types with `z.infer<typeof Schema>`.
- Use discriminated unions and exhaustive switches for question-type behavior.
- Use Zustand selectors in components: `useStore((s) => s.value)`.
- Keep store actions as the single path for persistence and side effects.
- Use semantic Tailwind tokens and shared button/input classes.
- Add i18n keys in both supported locales.
- Add `aria-label` and `title` for icon-only controls; use semantic HTML and
  visible focus rings.
- Preserve print semantics: `paper-sheet`, `question-block`, `answer-block`,
  and `no-print` where appropriate.
- Keep files reasonably sized. Split large component files before they become
  hard to edit or review.

---

## Testing Requirements

Vitest tests live under `src/lib/__tests__/` and focus on deterministic logic:

- schema defaults and validation (`exam.test.ts`)
- question creation/type transitions (`blankQuestion.test.ts`)
- merge, reorder, student-version, summary behavior (`exam-ops.test.ts`)
- AI JSON extraction and validation (`extractJson.test.ts`,
  `validateQuestions.test.ts`)
- system prompt contract (`systemPrompt.test.ts`)
- markdown export (`exportMarkdown.test.ts`)
- backend error-code mapping (`errorMessages.test.ts`)

Add tests when changing:

- Zod schemas or version constants
- question type behavior
- AI prompt/output parsing
- export formatting
- store reducers/helpers that can be tested without Tauri
- error mapping or IPC payload interpretation

Use React Testing Library only when component behavior itself is the risk; prefer
pure tests for domain helpers.

---

## Code Review Checklist

- Did `npm run typecheck` and `npm test` pass?
- Are all new user-facing strings translated in both locales?
- Are styles token-based and compatible with dark mode and print mode?
- Do components use store selectors and delegate mutations/persistence to store
  actions?
- Are trust boundaries parsed with Zod instead of asserted?
- If a question type/schema changed, were all switch sites and tests updated?
- Are icon-only controls accessible and using lucide icons?
- Does the change preserve the streaming preview-then-apply flow and avoid
  double-finalizing assistant turns?
