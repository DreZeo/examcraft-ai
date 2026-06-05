import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Bold,
  CaseSensitive,
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
      className="no-print relative z-10 flex flex-wrap items-center gap-2 border-b border-border bg-card/90 px-4 py-2"
    >
      <div
        className="inline-flex h-9 overflow-hidden rounded-md border border-border bg-background/70 p-1"
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
    <div className="flex min-w-0 items-stretch gap-2 rounded-md border border-border bg-background/70 p-1.5">
      <div className="hidden items-center border-r border-border px-1.5 text-xs font-medium text-muted-foreground sm:flex">
        {label}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</div>
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

  return (
    <label
      className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded border border-border bg-card px-2 text-xs text-foreground"
      title={label}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
        className="max-w-32 cursor-pointer bg-transparent text-xs text-foreground focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {t(`${optionKeyPrefix}.${option}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
