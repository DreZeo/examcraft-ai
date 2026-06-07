import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, ChevronDown, FileJson, Upload, Printer } from "lucide-react";
import { usePaperStore } from "../../stores/paperStore";
import { useConfigStore } from "../../stores/configStore";
import { useExportStore, type ExamInfoFields } from "../../stores/exportStore";
import { ghostBtn } from "../../lib/ui/styles";
import {
  exportJson,
  exportMarkdown,
  importJson,
} from "../../lib/export/exportFile";

interface ExportMenuProps {
  triggerClassName?: string;
}

const FIELD_KEYS: (keyof ExamInfoFields)[] = [
  "subject",
  "className",
  "studentName",
  "duration",
  "totalScore",
  "score",
];
const NOTICE_TIMEOUT_MS = 3000;
const PRINT_LAYOUT_TIMEOUT_MS = 1000;

/**
 * Top-bar export menu: save JSON project, import JSON, export Markdown / PDF in
 * teacher or student variant, plus exam-info header field toggles. Markdown uses
 * the pure assembler; PDF reuses the live sheet via window.print(), switching
 * the on-screen view first so the printout matches the chosen variant.
 */
export function ExportMenu({ triggerClassName = ghostBtn }: ExportMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const paper = usePaperStore((s) => s.paper);
  const view = usePaperStore((s) => s.view);
  const setView = usePaperStore((s) => s.setView);
  const replacePaper = usePaperStore((s) => s.replacePaper);
  const dataDir = useConfigStore((s) => s.dataDir);

  const showHeader = useExportStore((s) => s.showHeader);
  const fields = useExportStore((s) => s.fields);
  const setShowHeader = useExportStore((s) => s.setShowHeader);
  const toggleField = useExportStore((s) => s.toggleField);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const header = showHeader ? fields : undefined;

  async function doJson() {
    await runExport(() => exportJson(paper, dataDir), t("export.json"));
  }

  async function doImport() {
    try {
      const imported = await importJson(dataDir);
      if (imported) await replacePaper(imported);
    } catch {
      window.alert(t("export.importFailed"));
    }
    setOpen(false);
  }

  async function doMarkdown(includeAnswers: boolean) {
    const label = includeAnswers
      ? t("export.markdownTeacher")
      : t("export.markdownStudent");
    await runExport(
      () => exportMarkdown(paper, dataDir, { includeAnswers, header }),
      label,
    );
  }

  async function runExport(
    action: () => Promise<boolean>,
    label: string,
  ): Promise<void> {
    try {
      const exported = await action();
      if (exported) {
        setNotice({
          kind: "success",
          text: t("export.exportSucceeded", { format: label }),
        });
      }
    } catch {
      setNotice({
        kind: "error",
        text: t("export.exportFailed", { format: label }),
      });
    }
    setOpen(false);
  }

  async function doPdf(includeAnswers: boolean) {
    const nextView = includeAnswers ? "teacher" : "student";
    if (view !== nextView) {
      document.documentElement.dataset.paperPaginationReady = "false";
    }
    setView(nextView);
    setOpen(false);
    await waitForPrintLayout();
    window.print();
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setNotice(null);
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClassName}
      >
        <Download className="h-4 w-4" />
        {t("export.title")}
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {notice && (
        <div
          role="status"
          className={`absolute right-0 z-20 mt-1 w-60 rounded-md border px-3 py-2 text-xs shadow-lg ${
            notice.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          }`}
        >
          {notice.text}
        </div>
      )}

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-60 animate-fade-in rounded-md border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg">
          <MenuItem
            label={t("export.json")}
            icon={<FileJson className="h-4 w-4" />}
            onClick={doJson}
          />
          <MenuItem
            label={t("export.importJson")}
            icon={<Upload className="h-4 w-4" />}
            onClick={doImport}
          />

          <Section
            label={t("export.pdfWysiwyg")}
            icon={<Printer className="h-4 w-4" />}
          >
            <Variant label={t("export.teacher")} onClick={() => doPdf(true)} />
            <Variant label={t("export.student")} onClick={() => doPdf(false)} />
          </Section>

          <Section label={t("export.markdownBackup")}>
            <Variant label={t("export.teacher")} onClick={() => doMarkdown(true)} />
            <Variant label={t("export.student")} onClick={() => doMarkdown(false)} />
          </Section>

          <div className="my-1 border-t border-border" />
          <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showHeader}
              onChange={(e) => setShowHeader(e.currentTarget.checked)}
              className="h-3.5 w-3.5 accent-primary cursor-pointer"
            />
            {t("export.examInfoHeader")}
          </label>
          {showHeader &&
            FIELD_KEYS.map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 px-2 py-1 pl-5 text-xs text-muted-foreground"
              >
                <input
                  type="checkbox"
                  checked={fields[key]}
                  onChange={() => toggleField(key)}
                  className="h-3.5 w-3.5 accent-primary cursor-pointer"
                />
                {t(`examInfo.${key}`)}
              </label>
            ))}
        </div>
      )}
    </div>
  );
}

function waitForPrintLayout(): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = window.performance.now();

    function check() {
      if (
        document.documentElement.dataset.paperPaginationReady === "true" ||
        window.performance.now() - startedAt >= PRINT_LAYOUT_TIMEOUT_MS
      ) {
        resolve();
        return;
      }
      window.requestAnimationFrame(check);
    }

    window.requestAnimationFrame(check);
  });
}

function MenuItem({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
    >
      {icon}
      {label}
    </button>
  );
}

function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="px-2 py-1">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </p>
      <div className="mt-0.5 flex gap-1">{children}</div>
    </div>
  );
}

function Variant({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex-1 rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
    >
      {label}
    </button>
  );
}
