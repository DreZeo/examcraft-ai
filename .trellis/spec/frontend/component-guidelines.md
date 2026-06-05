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

### Semantic Design Tokens (mandatory, never hardcode colors)

**What:** All surface/text colors go through semantic token utilities
(`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`,
`bg-primary`, `text-primary-foreground`, `border-border`, `ring-ring`,
`bg-destructive`, etc.). **Never hardcode** `slate-*`, `indigo-*`, `bg-white`,
`text-black` in components. Tokens live in `src/styles/index.css` as CSS custom
properties mapped to Tailwind via `@theme inline`.

**Why:** enables light/dark theme switching (`.dark` class on `<html>` toggled by
`useTheme` hook), semantic color evolution (change one token value → all surfaces
adapt), and print integrity (tokens don't leak into `@media print`, which stays
light).

**Architecture:**

- `:root` — light mode HSL channel values (e.g. `--background: 0 0% 100%`)
- `.dark` — dark mode overrides (e.g. `--background: 222 47% 7%`)
- `@theme inline` — maps to Tailwind classes (`--color-background: hsl(var(--background))` → `bg-background`)
- `AppSettings.theme` (`system` | `light` | `dark`) stored in config
- `useTheme()` hook reads setting, toggles `.dark`, watches `prefers-color-scheme` in `system` mode

**Allowed exceptions:**

1. **Status hint cards** (amber warning, emerald success, red error) — semantic hue is kept but MUST have a `dark:` variant for contrast:
   ```tsx
   <div className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
   ```
2. **Modal scrims** — `bg-black/50` is fine (it's a scrim, not a semantic surface).

**Shared button/input classes** live in `src/lib/ui/styles.ts` (`iconBtn`, `primaryBtn`, `secondaryBtn`, `ghostBtn`, `inputCls`) — import and reuse them. They bake in semantic tokens + focus rings + cursor-pointer.

**Gotcha:** print must stay readable on white paper. The `.paper-sheet` and question/answer blocks use `bg-card` (white in light mode), and `src/styles/print.css` forces `@media print { .paper-sheet { background: #ffffff !important; } }` so dark tokens never leak into PDF output.

### Icons (lucide-react only, no emoji)

All UI control icons use `lucide-react` SVG components. **Never** use emoji or Unicode characters (◀ ▶ ⚙ ✕ ↑ ↓ ✦ ✓) as icons — they render inconsistently across platforms, don't align properly, and can't be styled.

Sizing convention: inline icons `h-4 w-4`, standalone icon buttons `h-5 w-5`. Default `strokeWidth={2}` (lucide default).

```tsx
import { Settings, PanelRightClose, Trash2 } from "lucide-react";
<button className={iconBtn} aria-label="Settings" title="Settings">
  <Settings className="h-5 w-5" />
</button>
```

### Micro-interactions & reduced-motion

Hover/focus transitions use `transition-colors` (150–250ms). **Only** animate `transform`/`opacity`, never `width`/`height` (causes layout shift and reflow). Drawer slide, card fade-in can use `animate-fade-in` (defined in index.css).

Exception: persistent workbench rails that already reserve layout space (paper
outline, assistant drawer) may use the shared `.motion-panel-shell` width
transition for open/close only. Keep content mounted and clipped inside the
shell, fade text with `.motion-panel-content`, and disable width transition
during pointer resizing with `data-resizing="true"`.

**Mandatory:** `src/styles/index.css` includes a global `@media (prefers-reduced-motion: reduce)` rule that kills all transitions/animations. Don't override it.

### Scrollbars

Scrollbar styling is global in `src/styles/index.css`: thin, low-contrast,
white-gray/light-neutral tracks and thumbs, using semantic HSL tokens. Do not
add one-off scrollbar styles inside components unless a specific embedded
surface has a documented exception.

### Print

- **Print:** add `no-print` to any UI chrome that must not appear in PDF export
  (top bar, drawer, hover actions, add-question buttons). Print rules live in
  `src/styles/print.css` (`@media print`). Semantic hooks `paper-sheet`,
  `question-block`, `answer-block` drive print layout — keep them on the right
  elements. See export flow in `frontend/directory-structure.md`.

### Markdown Preview

- Render user/AI-authored Markdown through the shared `Markdown` component,
  never by injecting raw HTML or duplicating a `ReactMarkdown` setup. Use the
  compact variant for dense surfaces such as answer blocks, options, assistant
  cards, and inline previews.
- The shared `Markdown` component owns project-specific Markdown extensions.
  Underline uses the safe custom syntax `++text++`, rendered as `<u>` after
  ReactMarkdown has parsed escaped text. Do not enable raw HTML for underline;
  literal `<u>raw</u>` must remain escaped user text.
- When a small UI surface needs a one-line summary (for example the paper
  outline), derive readable plain text with `markdownToPlainText` /
  `summarizeMarkdown` instead of hand-writing local Markdown-stripping regexes.
  The outline stays scannable while stems, answers, and explanations keep full
  safe Markdown rendering in the paper preview.

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
