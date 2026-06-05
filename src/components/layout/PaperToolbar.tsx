import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Bold,
  CaseSensitive,
  ChevronDown,
  Code,
  Columns3,
  Eraser,
  FileText,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Type,
  Underline,
} from "lucide-react";
import { useConfigStore } from "../../stores/configStore";
import {
  useMarkdownFormat,
  type MarkdownFormat,
} from "./MarkdownFormatContext";
import {
  PAPER_FONT_OPTIONS,
  PAPER_FONT_SIZE_OPTIONS,
  PAPER_LINE_HEIGHT_OPTIONS,
  PAPER_MARGIN_OPTIONS,
  PAPER_SIZE_OPTIONS,
  type AppSettings,
  type PaperFont,
  type PaperFontSize,
  type PaperLineHeight,
  type PaperMargin,
  type PaperSize,
} from "../../lib/types/config";

type SettingKey =
  | "paperFont"
  | "paperFontSize"
  | "paperLineHeight"
  | "paperMargin"
  | "paperSize";

interface SelectControlProps<T extends string> {
  icon: ReactNode;
  label: string;
  value: T;
  options: readonly T[];
  optionKeyPrefix: string;
  onChange: (value: T) => void;
}

/** Office-like paper formatting toolbar for whole-paper typography and layout. */
export function PaperToolbar() {
  const { t } = useTranslation();
  const settings = useConfigStore((state) => state.config.settings);
  const updateSettings = useConfigStore((state) => state.updateSettings);
  const { hasTarget, applyFormat } = useMarkdownFormat();
  const [activeTab, setActiveTab] = useState<"layout" | "markdown">("layout");

  function update<K extends SettingKey>(key: K, value: AppSettings[K]) {
    void updateSettings({ [key]: value });
  }

  return (
    <section
      aria-label={t("paperToolbar.title")}
      className="no-print relative z-10 flex flex-wrap items-center gap-1 border-b border-border bg-card px-4 py-1.5"
    >
      <div
        className="inline-flex h-8 overflow-hidden rounded-md border border-border p-0.5"
        role="tablist"
        aria-label={t("paperToolbar.modeTabs")}
      >
        <TabButton
          active={activeTab === "layout"}
          label={t("paperToolbar.layoutTab")}
          onClick={() => setActiveTab("layout")}
        />
        <TabButton
          active={activeTab === "markdown"}
          label={t("paperToolbar.markdownTab")}
          onClick={() => setActiveTab("markdown")}
        />
      </div>

      {activeTab === "layout" ? (
        <>
          <ToolbarGroup label={t("paperToolbar.typography")}>
            <SelectControl<PaperFont>
              icon={<Type className="h-4 w-4" />}
              label={t("paperToolbar.font")}
              value={settings.paperFont}
              options={PAPER_FONT_OPTIONS}
              optionKeyPrefix="paperFont"
              onChange={(value) => update("paperFont", value)}
            />
            <SelectControl<PaperFontSize>
              icon={<CaseSensitive className="h-4 w-4" />}
              label={t("paperToolbar.fontSize")}
              value={settings.paperFontSize}
              options={PAPER_FONT_SIZE_OPTIONS}
              optionKeyPrefix="paperFontSize"
              onChange={(value) => update("paperFontSize", value)}
            />
          </ToolbarGroup>

          <div className="h-5 w-px bg-border" />

          <ToolbarGroup label={t("paperToolbar.paragraph")}>
            <SelectControl<PaperLineHeight>
              icon={<Pilcrow className="h-4 w-4" />}
              label={t("paperToolbar.lineHeight")}
              value={settings.paperLineHeight}
              options={PAPER_LINE_HEIGHT_OPTIONS}
              optionKeyPrefix="paperLineHeight"
              onChange={(value) => update("paperLineHeight", value)}
            />
          </ToolbarGroup>

          <div className="h-5 w-px bg-border" />

          <ToolbarGroup label={t("paperToolbar.page")}>
            <SelectControl<PaperSize>
              icon={<FileText className="h-4 w-4" />}
              label={t("paperToolbar.paperSize")}
              value={settings.paperSize}
              options={PAPER_SIZE_OPTIONS}
              optionKeyPrefix="paperSize"
              onChange={(value) => update("paperSize", value)}
            />
            <SelectControl<PaperMargin>
              icon={<Columns3 className="h-4 w-4" />}
              label={t("paperToolbar.margin")}
              value={settings.paperMargin}
              options={PAPER_MARGIN_OPTIONS}
              optionKeyPrefix="paperMargin"
              onChange={(value) => update("paperMargin", value)}
            />
          </ToolbarGroup>
        </>
      ) : (
        <ToolbarGroup label={t("paperToolbar.markdown")}>
          <MarkdownButton
            format="bold"
            icon={<Bold className="h-4 w-4" />}
            label={t("editorToolbar.bold")}
            disabled={!hasTarget}
            onFormat={applyFormat}
          />
          <MarkdownButton
            format="italic"
            icon={<Italic className="h-4 w-4" />}
            label={t("editorToolbar.italic")}
            disabled={!hasTarget}
            onFormat={applyFormat}
          />
          <MarkdownButton
            format="underline"
            icon={<Underline className="h-4 w-4" />}
            label={t("editorToolbar.underline")}
            disabled={!hasTarget}
            onFormat={applyFormat}
          />
          <MarkdownButton
            format="heading"
            icon={<Heading2 className="h-4 w-4" />}
            label={t("editorToolbar.heading")}
            disabled={!hasTarget}
            onFormat={applyFormat}
          />
          <MarkdownButton
            format="bulletList"
            icon={<List className="h-4 w-4" />}
            label={t("editorToolbar.bulletList")}
            disabled={!hasTarget}
            onFormat={applyFormat}
          />
          <MarkdownButton
            format="orderedList"
            icon={<ListOrdered className="h-4 w-4" />}
            label={t("editorToolbar.orderedList")}
            disabled={!hasTarget}
            onFormat={applyFormat}
          />
          <MarkdownButton
            format="quote"
            icon={<Quote className="h-4 w-4" />}
            label={t("editorToolbar.quote")}
            disabled={!hasTarget}
            onFormat={applyFormat}
          />
          <MarkdownButton
            format="code"
            icon={<Code className="h-4 w-4" />}
            label={t("editorToolbar.code")}
            disabled={!hasTarget}
            onFormat={applyFormat}
          />
          <MarkdownButton
            format="clear"
            icon={<Eraser className="h-4 w-4" />}
            label={t("editorToolbar.clear")}
            disabled={!hasTarget}
            onFormat={applyFormat}
          />
        </ToolbarGroup>
      )}
    </section>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? "rounded px-3 text-xs font-medium bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          : "rounded px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      }
    >
      {label}
    </button>
  );
}

function ToolbarGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 px-1">
      <span className="hidden text-xs font-medium text-muted-foreground/60 sm:inline">{label}</span>
      <div className="hidden h-4 w-px bg-border sm:block" />
      <div className="flex min-w-0 flex-wrap items-center gap-0.5">{children}</div>
    </div>
  );
}

function MarkdownButton({
  format,
  icon,
  label,
  disabled,
  onFormat,
}: {
  format: MarkdownFormat;
  icon: ReactNode;
  label: string;
  disabled: boolean;
  onFormat: (format: MarkdownFormat) => boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onFormat(format)}
      className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
    >
      {icon}
    </button>
  );
}

function SelectControl<T extends string>({
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
