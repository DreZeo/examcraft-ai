import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

interface SelectControlProps<T extends string> {
  icon: ReactNode;
  label: string;
  value: T;
  options: readonly T[];
  optionKeyPrefix: string;
  onChange: (value: T) => void;
}

export function SelectControl<T extends string>({
  icon,
  label,
  value,
  options,
  optionKeyPrefix,
  onChange,
}: SelectControlProps<T>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 rounded border border-border bg-card px-2 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="max-w-20 truncate">{t(`${optionKeyPrefix}.${value}`)}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 z-20 mt-1 min-w-[8rem] animate-fade-in rounded-md border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
        >
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => { onChange(option); setOpen(false); }}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer ${option === value ? "text-primary font-medium" : ""}`}
            >
              {t(`${optionKeyPrefix}.${option}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
