import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, ChevronDown, FileJson, Upload } from "lucide-react";
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
];

/**
 * Top-bar export menu: save JSON project, import JSON, export Markdown / PDF in
 * teacher or student variant, plus exam-info header field toggles. Markdown uses
 * the pure assembler; PDF reuses the live sheet via window.print(), switching
 * the on-screen view first so the printout matches the chosen variant.
 */
export function ExportMenu({ triggerClassName = ghostBtn }: ExportMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const paper = usePaperStore((s) => s.paper);
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

  const header = showHeader ? fields : undefined;

  async function doJson() {
    await exportJson(paper, dataDir);
    setOpen(false);
  }

  async function doImport() {
    try {
      const imported = await importJson(dataDir);
      if (imported) replacePaper(imported);
    } catch {
      window.alert(t("export.importFailed"));
    }
    setOpen(false);
  }

  async function doMarkdown(includeAnswers: boolean) {
    await exportMarkdown(paper, dataDir, { includeAnswers, header });
    setOpen(false);
  }

  function doPdf(includeAnswers: boolean) {
    setView(includeAnswers ? "teacher" : "student");
    setOpen(false);
    // Let React flush the view change before opening the print dialog.
    setTimeout(() => window.print(), 50);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClassName}
      >
        <Download className="h-4 w-4" />
        {t("export.title")}
        <ChevronDown className="h-4 w-4" />
      </button>

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

          <Section label={t("export.markdown")}>
            <Variant label={t("export.teacher")} onClick={() => doMarkdown(true)} />
            <Variant label={t("export.student")} onClick={() => doMarkdown(false)} />
          </Section>

          <Section label={t("export.pdf")}>
            <Variant label={t("export.teacher")} onClick={() => doPdf(true)} />
            <Variant label={t("export.student")} onClick={() => doPdf(false)} />
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-2 py-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
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
