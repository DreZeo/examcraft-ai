import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, ChevronDown, ChevronRight, RotateCcw, Settings } from "lucide-react";
import { errorMessageKey } from "../../lib/api/errorMessages";
import { useAssistantStore } from "../../stores/assistantStore";

interface ErrorCardProps {
  code: string;
  detail?: string;
  raw?: string;
  retryExhausted: boolean;
  retryable?: boolean;
  onCheckSettings: () => void;
}

/**
 * In-conversation error card (low-saturation red). Maps the backend error code
 * to a human i18n message and offers actionable buttons: retry the last turn,
 * or jump to settings. When JSON self-correction is exhausted, a collapsible
 * "view raw response" exposes the model's last output for debugging.
 */
export function ErrorCard({
  code,
  detail,
  raw,
  retryExhausted,
  retryable = true,
  onCheckSettings,
}: ErrorCardProps) {
  const { t } = useTranslation();
  const [showRaw, setShowRaw] = useState(false);
  const retry = useAssistantStore((s) => s.retry);
  const streaming = useAssistantStore((s) => s.status === "streaming");

  const message = retryExhausted
    ? t("errors.jsonRetryExhausted")
    : t(errorMessageKey({ code, detail }));

  return (
    <div className="animate-fade-in rounded-2xl border border-red-200/70 bg-red-50 p-4 text-sm text-red-800 shadow-sm dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
      <p className="flex items-start gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40 shrink-0">
          <AlertCircle className="h-4 w-4" />
        </span>
        <span>{message}</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {!retryExhausted && retryable && (
          <button
            type="button"
            disabled={streaming}
            onClick={() => void retry()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground shadow-sm transition-shadow hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            {t("assistant.retry")}
          </button>
        )}
        <button
          type="button"
          onClick={onCheckSettings}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/40 cursor-pointer"
        >
          <Settings className="h-4 w-4" />
          {t("assistant.checkSettings")}
        </button>
      </div>

      {retryExhausted && raw && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-red-600 transition-colors hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-red-300 dark:hover:text-red-200 cursor-pointer"
          >
            {showRaw ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {t("assistant.viewRaw")}
          </button>
          {showRaw && (
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-muted p-2 text-xs text-muted-foreground">
              {raw}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
