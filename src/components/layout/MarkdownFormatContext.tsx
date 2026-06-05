import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MarkdownFormat =
  | "bold"
  | "italic"
  | "underline"
  | "heading"
  | "bulletList"
  | "orderedList"
  | "quote"
  | "code";

export interface MarkdownFormatTarget {
  apply: (format: MarkdownFormat) => void;
}

interface MarkdownFormatContextValue {
  hasTarget: boolean;
  applyFormat: (format: MarkdownFormat) => boolean;
  registerTarget: (target: MarkdownFormatTarget) => () => void;
  clearTarget: (target: MarkdownFormatTarget) => void;
}

const MarkdownFormatContext = createContext<MarkdownFormatContextValue | null>(
  null,
);

/** Shares the currently focused Markdown editor with the top paper toolbar. */
export function MarkdownFormatProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<MarkdownFormatTarget | null>(null);

  const registerTarget = useCallback((nextTarget: MarkdownFormatTarget) => {
    setTarget(nextTarget);
    return () => {
      setTarget((current) => (current === nextTarget ? null : current));
    };
  }, []);

  const clearTarget = useCallback((targetToClear: MarkdownFormatTarget) => {
    setTarget((current) => (current === targetToClear ? null : current));
  }, []);

  const applyFormat = useCallback(
    (format: MarkdownFormat) => {
      if (!target) return false;
      target.apply(format);
      return true;
    },
    [target],
  );

  const value = useMemo(
    () => ({
      hasTarget: target !== null,
      applyFormat,
      registerTarget,
      clearTarget,
    }),
    [applyFormat, clearTarget, registerTarget, target],
  );

  return (
    <MarkdownFormatContext.Provider value={value}>
      {children}
    </MarkdownFormatContext.Provider>
  );
}

export function useMarkdownFormat() {
  const context = useContext(MarkdownFormatContext);
  if (!context) {
    throw new Error("useMarkdownFormat must be used within MarkdownFormatProvider");
  }
  return context;
}
