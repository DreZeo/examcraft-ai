import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { inputCls } from "../../lib/ui/styles";

/** Shared form primitives for the question editor, matching the settings style. */

export { inputCls };

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.currentTarget.value)}
      className={inputCls + " resize-y font-mono"}
    />
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.currentTarget.value)}
      className={inputCls}
    />
  );
}

/** Editable string list with per-row add/remove (options, blanks, points). */
export function ListEditor({
  items,
  onChange,
  addLabel,
  removeLabel,
  prefix,
  minItems = 1,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  removeLabel: string;
  /** Optional per-row prefix renderer (e.g. option letter A/B/C). */
  prefix?: (index: number) => ReactNode;
  minItems?: number;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {prefix && (
            <span className="w-5 shrink-0 text-sm text-muted-foreground">
              {prefix(i)}
            </span>
          )}
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.currentTarget.value;
              onChange(next);
            }}
            className={inputCls}
          />
          <button
            type="button"
            aria-label={removeLabel}
            title={removeLabel}
            disabled={items.length <= minItems}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  );
}
