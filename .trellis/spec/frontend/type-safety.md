# Type Safety

> Type-safety and runtime-validation patterns.

---

## Overview

TypeScript `strict` mode. **Zod is the single source of truth** for every data
contract that crosses a boundary (AI output, persisted JSON, IPC payloads).
Types are *derived from* schemas with `z.infer`, never hand-written alongside
them. Validate at every trust boundary; the rest of the app works with typed,
validated data.

Key schemas: `src/lib/types/exam.ts` (ExamPaper, 7-type Question union),
`src/lib/types/config.ts` (AppConfig / ModelConfig / AppSettings).

---

## Convention: schema first, type derived

```ts
export const QuestionSchema = z.discriminatedUnion("type", [ /* 7 variants */ ]);
export type Question = z.infer<typeof QuestionSchema>;  // derived, never separate
```

**Why:** one definition. A field added to the schema flows into the type, the
validator, and AI/persistence parsing at once — no drift.

---

## Convention: discriminated unions for question types and AI paper operations

The 7 question types share a `baseFields` spread (`id`, `content`, `score`) and
discriminate on `type`. Objective types carry checkable answers; subjective
carry reference/criteria.

When adding a question type: add the variant schema, add it to the union, and
extend `OBJECTIVE_TYPES`/`formatAnswer`/`toStudentVersion`/`TypeFields` —
`tsc` + the discriminated-union exhaustiveness will flag the switch sites.

AI paper edits use `AiPaperOperationsResponseSchema = { operations: [...] }`,
where each operation is a discriminated union member:

```ts
type Operation =
  | { type: "renamePaper"; title: string }
  | { type: "appendQuestions"; questions: Question[] }
  | { type: "updateQuestion"; id: string; question: Question }
  | { type: "deleteQuestion"; id: string }
  | { type: "reorderQuestions"; questionIds: string[] };
```

`updateQuestion.id` must equal `question.id`; enforce this in the schema with a
refinement so the UI cannot preview one id while the store replaces another.
Legacy AI output shaped as `{ questions: [...] }` may be accepted only at the
validator boundary and converted to operations. Store and component code should
prefer operations so title/delete/reorder behavior stays explicit and reviewable.

---

## Convention: validate at every boundary

```ts
// AI output
const result = AiPaperOperationsResponseSchema.safeParse(parsed);
// persisted JSON (load + import)
return ExamPaperSchema.parse(JSON.parse(raw));
```

Rust hands back **raw JSON strings**; the frontend parses + validates (see
backend/directory-structure.md). Never trust a JSON string as typed without
running its schema.

---

## Gotcha: Zod v4 `.default({})` on an all-optional object fails typing

> **Warning**: In Zod v4, `Schema.default({})` requires the value to satisfy the
> schema's **output** type. An object schema whose fields all have defaults still
> types its output as fully-required, so `.default({})` raises
> "Type '{}' is missing the following properties…" even though every field has a
> default.

**Fix:** use `.prefault({})` (applies defaults to a *partial input*) for nested
all-defaulted objects:

```ts
// ❌ AppSettingsSchema.default({})   → TS2769
// ✅
settings: AppSettingsSchema.prefault({}),
```

`default()` is still correct for scalars (`z.number().default(1)`,
`z.string().default("")`). See `src/lib/types/config.ts`.

---

## Versioned persistence

`ExamPaper` and `AppConfig` carry an integer `version` (`PAPER_SCHEMA_VERSION`,
`CONFIG_SCHEMA_VERSION`) so future schema changes can detect + migrate old files.
Bump the constant and add migration when the shape changes incompatibly.

### Convention: config normalization lives in the schema

`AppConfigSchema` may use a base object schema plus `.transform()` to normalize
persisted config after parsing. Use this for compatible additions such as
default preset lists, invalid active-id cleanup, and legacy field migration.
Store actions should receive already-normalized `AppConfig` and should not
duplicate migration logic.

```ts
const AppConfigBaseSchema = z.object({ /* persisted fields */ });

export const AppConfigSchema = AppConfigBaseSchema.transform((config) => ({
  ...config,
  activeAgentId: isKnownAgent(config.activeAgentId) ? config.activeAgentId : null,
}));
```

Tests for schema normalization belong beside the type contract tests and should
cover fresh config, old config, and invalid references.

---

## Forbidden Patterns

- **`any`** — use `unknown` + a schema parse, or a proper type.
- **Hand-written type duplicating a Zod schema** — derive with `z.infer`.
- **Type assertions (`as T`) to silence boundary errors** — parse instead. The
  one accepted use is the narrowed `...rest as Question` in `toStudentVersion`
  after deleting answer keys, where the runtime shape is provably valid.
