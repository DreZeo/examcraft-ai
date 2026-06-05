import { useEffect } from "react";
import { useConfigStore } from "../stores/configStore";
import { GLOBAL_FONT_STACKS } from "../lib/types/config";

/**
 * Applies the global UI font by overriding --font-sans on <html>.
 * `system` resets to the CSS default. Mount once in App.
 */
export function useGlobalFont() {
  const globalFont = useConfigStore((s) => s.config.settings.globalFont);

  useEffect(() => {
    const stack = GLOBAL_FONT_STACKS[globalFont];
    document.documentElement.style.setProperty("--font-sans", stack || null);
  }, [globalFont]);
}
