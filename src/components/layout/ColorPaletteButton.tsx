import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { MarkdownFormat } from "./MarkdownFormatContext";
import type {
  HighlightColorPreset,
  TextColorPreset,
} from "../../lib/exam/markdownStyle";

interface ColorPaletteButtonProps<
  T extends TextColorPreset | HighlightColorPreset,
> {
  type: "textColor" | "highlight";
  icon: ReactNode;
  label: string;
  disabled: boolean;
  options: readonly T[];
  values: Record<T, string | null>;
  optionKeyPrefix: string;
  onFormat: (format: MarkdownFormat) => boolean;
}

/** Compact Word-like color palette for Markdown text styling. */
export function ColorPaletteButton<
  T extends TextColorPreset | HighlightColorPreset,
>({
  type,
  icon,
  label,
  disabled,
  options,
  values,
  optionKeyPrefix,
  onFormat,
}: ColorPaletteButtonProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
      >
        <span className="relative">
          {icon}
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-primary"
          />
        </span>
      </button>
      {open && !disabled && (
        <div
          role="menu"
          aria-label={label}
          className="absolute left-0 top-9 z-50 grid w-44 grid-cols-4 gap-1 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg"
        >
          {options.map((option) => {
            const value = values[option];
            return (
              <button
                key={option}
                type="button"
                role="menuitem"
                aria-label={t(`${optionKeyPrefix}.${option}`)}
                title={t(`${optionKeyPrefix}.${option}`)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onFormat(
                    type === "textColor"
                      ? { type, color: option as TextColorPreset }
                      : { type, color: option as HighlightColorPreset },
                  );
                  setOpen(false);
                }}
                className="grid h-8 place-items-center rounded border border-border bg-card transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <span
                  className="h-4 w-4 rounded-sm border border-border"
                  style={{
                    backgroundColor: value ?? "transparent",
                    backgroundImage: value
                      ? undefined
                      : "linear-gradient(135deg, transparent 45%, currentColor 46%, currentColor 54%, transparent 55%)",
                  }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
