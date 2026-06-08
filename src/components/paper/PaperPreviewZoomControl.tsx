import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { useConfigStore } from "../../stores/configStore";
import {
  PAPER_PREVIEW_ZOOM_OPTIONS,
  stepPaperPreviewZoom,
  type PaperPreviewZoom,
} from "../../lib/types/config";

/** Floating document-view zoom control for the paper preview only. */
export function PaperPreviewZoomControl() {
  const { t } = useTranslation();
  const value = useConfigStore((state) => state.config.settings.paperPreviewZoom);
  const updateSettings = useConfigStore((state) => state.updateSettings);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  function setZoom(next: PaperPreviewZoom) {
    setOpen(false);
    void updateSettings({ paperPreviewZoom: next });
  }

  function step(direction: -1 | 1) {
    void updateSettings({
      paperPreviewZoom: stepPaperPreviewZoom(
        value,
        direction,
        readCurrentPreviewScale(),
      ),
    });
  }

  return (
    <div className="no-print pointer-events-none absolute bottom-4 right-4 z-30">
      <div ref={containerRef} className="pointer-events-auto relative">
        {open && (
          <div
            role="listbox"
            aria-label={t("paperToolbar.previewZoom")}
            className="absolute bottom-9 right-0 w-[7.5rem] animate-fade-in rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {PAPER_PREVIEW_ZOOM_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                onClick={() => setZoom(option)}
                className={[
                  "flex h-7 w-full items-center justify-between rounded px-2 text-left text-xs transition-colors cursor-pointer",
                  "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  option === value ? "font-medium text-primary" : "text-foreground",
                ].join(" ")}
              >
                {t(`paperPreviewZoom.${option}`)}
              </button>
            ))}
          </div>
        )}

        <div className="inline-flex h-7 items-center overflow-hidden rounded-full border border-border/80 bg-card/95 text-xs text-foreground shadow-sm">
          <button
            type="button"
            aria-label={t("paperToolbar.zoomOut")}
            title={t("paperToolbar.zoomOut")}
            onClick={() => step(-1)}
            className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={t("paperToolbar.previewZoom")}
            title={t("paperToolbar.previewZoom")}
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-7 min-w-[3.75rem] items-center justify-center gap-1 border-x border-border/70 px-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <span>{t(`paperPreviewZoom.${value}`)}</span>
            <ChevronDown
              className={[
                "h-3 w-3 text-muted-foreground transition-transform duration-150",
                open ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
          <button
            type="button"
            aria-label={t("paperToolbar.zoomIn")}
            title={t("paperToolbar.zoomIn")}
            onClick={() => step(1)}
            className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function readCurrentPreviewScale(): number | undefined {
  const raw = document.documentElement.dataset.paperPreviewScale;
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
