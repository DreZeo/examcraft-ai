# Hook Guidelines

> How hooks are used in this project.

---

## Overview

Hooks are used for React lifecycle integration and DOM/browser side effects.
Global app state lives in Zustand stores, not in custom hooks. The only custom
hook today is `src/hooks/useTheme.ts`, which translates the persisted
`AppSettings.theme` value into a `.dark` class on `<html>`.

Components subscribe to stores with selectors. Store actions own persistence,
Tauri calls, and cross-store reads.

---

## Custom Hook Patterns

Custom hooks should be small and side-effect focused:

```ts
export function useTheme() {
  const theme = useConfigStore((s) => s.config.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    // apply DOM effect and clean up listeners
  }, [theme]);
}
```

Current rules:

- Name hooks `useSomething` and place shared hooks under `src/hooks/`.
- Subscribe to only the needed store slice with a selector.
- Clean up every event listener, media query listener, timer, and subscription
  from the effect return value.
- Mount global singleton effects once near `App` when they affect the whole
  document (`useTheme()` is called in `src/App.tsx`).
- Keep domain mutations in store actions rather than returning large command
  objects from hooks.

---

## Data Fetching

There is no React Query/SWR layer. The app is local-first and talks to Tauri
through explicit store actions:

- `configStore.init()` loads bootstrap/config and model settings.
- `paperStore.load()` loads the working paper once `dataDir` exists.
- `assistantStore` starts/cancels streaming chat and listens for Tauri events.

Components trigger store actions in effects or event handlers:

```tsx
useEffect(() => {
  void init();
}, [init]);

useEffect(() => {
  if (dataDir) void loadPaper();
}, [dataDir, loadPaper]);
```

Avoid fetching directly from presentational components unless the data is truly
local to that component and has no persistence/cross-component impact.

---

## Naming Conventions

- Custom hooks: `useTheme`, `useX`.
- Store hooks: `useConfigStore`, `usePaperStore`, `useAssistantStore`,
  `useExportStore`.
- Store actions use imperative verbs (`init`, `load`, `save`, `send`,
  `abort`, `applyAiQuestions`).
- Effect handlers inside components can be local named functions (`onKey`,
  `submit`) when they improve cleanup/readability.

---

## Common Mistakes

- Calling a Zustand hook inside a store action or plain function. Use
  `useOtherStore.getState()` inside stores instead.
- Subscribing to the entire store object in a component when a selector would
  avoid unrelated re-renders.
- Letting effects depend on unstable objects/functions and re-run repeatedly.
  Select stable actions from stores or memoize locally when needed.
- Forgetting cleanup for global listeners. `useTheme` removes its media-query
  listener when leaving `system` mode; `App` removes the `keydown` listener.
- Moving persistence into a hook/component. Persistence belongs in store actions
  so manual edits, AI apply, undo, and autosave share one path.
