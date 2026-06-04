# Component Guidelines

> How React components are built in this project.

---

## Overview

Function components, TypeScript, Tailwind v4 for styling, i18next for all
user-facing text. Style is professional-understated (Notion/Linear-like): neutral
slate grays + indigo accent, moderate radius, subtle shadows. Components are
presentational; data + side effects live in Zustand stores.

---

## Component Structure

```tsx
interface FooProps { /* explicit props interface */ }

/** One-line doc comment: what this renders + key behavior. */
export function Foo({ a, b }: FooProps) {
  const { t } = useTranslation();
  const value = useSomeStore((s) => s.value); // selector, not whole store
  // ...
}
```

- Named exports (not default) for components, except the top-level `App`.
- Co-locate small helper components in the same file; split when a file
  approaches large size (the edit harness rejects writes >13000 chars — split
  big components proactively, e.g. `editFields.tsx` / `TypeFields.tsx`).

---

## Props Conventions

- Explicit `interface FooProps`; no inline anonymous prop types for exported
  components.
- Pass store actions/data via props only when it aids reuse; otherwise read the
  store directly inside the component with a selector.
- Use selectors (`useStore((s) => s.x)`) to avoid re-rendering on unrelated state.

---

## Styling Patterns

- **Tailwind utility classes inline.** No CSS modules / styled-components.
- Shared class strings extracted to a module const (e.g. `inputCls`) when reused
  across fields.
- **Print:** add `no-print` to any UI chrome that must not appear in PDF export
  (top bar, drawer, hover actions, add-question buttons). Print rules live in
  `src/styles/print.css` (`@media print`). Semantic hooks `paper-sheet`,
  `question-block`, `answer-block` drive print layout — keep them on the right
  elements. See export flow in `frontend/directory-structure.md`.

---

## i18n (mandatory from line one)

**What:** every user-facing string goes through `t('namespace.key')`; never
hardcode display text. Keys must exist in BOTH `src/i18n/locales/zh.json` and
`en.json`. Chinese is the default language.

**Why:** retrofitting i18n is expensive; the app ships zh+en. A key present in
one locale but missing in the other is a bug — verify parity when adding keys.

```tsx
const { t } = useTranslation();
<button aria-label={t("paper.delete")}>✕</button>
```

---

## Accessibility (basic, from day one)

- Semantic HTML; `aria-label` + `title` on icon-only buttons.
- Visible focus rings on focusable elements; WCAG AA color contrast.
- Modals: `role="dialog"` + `aria-modal="true"` + `aria-label`.
- Keyboard: Esc closes the topmost layer; Enter/Shift+Enter in the composer.

> Full WCAG compliance needs assistive-tech testing + expert review — out of
> scope. This is code-level basic a11y only.

---

## Gotcha: nested Esc handlers must stop propagation

**Symptom:** pressing Esc in a modal both closes the modal AND triggers the
App-level Esc handler (e.g. collapsing the AI drawer).

**Fix:** the modal's keydown listener uses the **capture phase** and calls
`stopPropagation()` so Esc resolves at the innermost open layer only. See
`QuestionEditModal.tsx`.

---

## Common Mistakes

- Hardcoding a string instead of a `t()` key, or adding a key to only one locale.
- Forgetting `no-print` on new chrome → it leaks into PDF export.
- Subscribing to the whole store instead of a selector → needless re-renders.
