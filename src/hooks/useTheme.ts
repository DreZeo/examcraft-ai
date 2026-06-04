import { useEffect } from "react";
import { useConfigStore } from "../stores/configStore";
import type { Theme } from "../lib/types/config";

/**
 * Applies the color theme to <html> by toggling the `.dark` class.
 *
 * - `light` / `dark`: forced.
 * - `system`: follows `prefers-color-scheme` and updates live when the OS
 *   preference changes.
 *
 * The chosen theme lives in AppSettings (persisted); this hook is the single
 * place that translates that preference into a DOM effect. Mount once in App.
 */
export function useTheme() {
  const theme = useConfigStore((s) => s.config.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function apply(value: Theme) {
      const dark = value === "dark" || (value === "system" && media.matches);
      root.classList.toggle("dark", dark);
    }

    apply(theme);

    if (theme === "system") {
      const onChange = () => apply("system");
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
  }, [theme]);
}
