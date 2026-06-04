import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessageKey } from "../../lib/api/errorMessages";
import { useAssistantStore } from "../../stores/assistantStore";

interface ErrorCardProps {
  code: string;
  detail?: string;
  raw?: string;
  retryExhausted: boolean;
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
    <div className="rounded-lg border border-red-200 bg-red-50/70 p-3 text-sm text-red-800">
      <p>{message}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {!retryExhausted && (
          <button
            type="button"
            disabled={streaming}
            onClick={() => void retry()}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {t("assistant.retry")}
          </button>
        )}
        <button
          type="button"
          onClick={onCheckSettings}
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          {t("assistant.checkSettings")}
        </button>
      </div>

      {retryExhausted && raw && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-red-600 underline"
          >
            {showRaw ? "▾" : "▸"} {t("assistant.viewRaw")}
          </button>
          {showRaw && (
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-white/70 p-2 text-xs text-slate-600">
              {raw}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
