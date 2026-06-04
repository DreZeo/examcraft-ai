/**
 * Shared Tailwind class strings for consistent component styling. Reference
 * these instead of re-typing button/input utility chains. All use semantic
 * design tokens (see src/styles/index.css) so they adapt to light/dark.
 */

/** Icon-only ghost button (top bar, drawer controls). 36px hit area. */
export const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground " +
  "transition-colors hover:bg-accent hover:text-accent-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer";

/** Primary solid button. */
export const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 " +
  "text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

/** Secondary / outline button. */
export const secondaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-md border border-border " +
  "bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors " +
  "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none " +
  "disabled:opacity-50 cursor-pointer";

/** Small ghost button (inline actions, e.g. new-paper). */
export const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium " +
  "text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer";

/** Text input / textarea base. */
export const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "text-foreground placeholder:text-muted-foreground transition-colors " +
  "focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring " +
  "disabled:cursor-not-allowed disabled:opacity-60";
