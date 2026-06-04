import type { ReactNode } from "react";

/** Shared form primitives for the question editor, matching the settings style. */

export const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
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
            <span className="w-5 shrink-0 text-sm text-slate-500">
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
            className="grid h-7 w-7 shrink-0 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        + {addLabel}
      </button>
    </div>
  );
}
