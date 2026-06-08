import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Baseline,
  CaseSensitive,
  Code,
  Columns3,
  Eraser,
  FileText,
  Heading2,
  Italic,
  List,
  ListOrdered,
  PaintBucket,
  Pilcrow,
  Quote,
  ScrollText,
  RotateCwSquare,
  Type,
  Underline,
} from "lucide-react";
import { SelectControl } from "../ui/SelectControl";
import { useConfigStore } from "../../stores/configStore";
import { usePaperStore } from "../../stores/paperStore";
import type { Question } from "../../lib/types/exam";
import {
  useMarkdownFormat,
  type MarkdownFormat,
} from "./MarkdownFormatContext";
import { applyMarkdownFormat } from "./markdownFormat";
import {
  HIGHLIGHT_COLOR_PRESETS,
  HIGHLIGHT_COLOR_VALUES,
  TEXT_COLOR_PRESETS,
  TEXT_COLOR_VALUES,
  type HighlightColorPreset,
  type TextColorPreset,
} from "../../lib/exam/markdownStyle";
import { ColorPaletteButton } from "./ColorPaletteButton";
import {
  PAPER_FONT_OPTIONS,
  PAPER_FONT_SIZE_OPTIONS,
  PAPER_HEADER_ALIGN_OPTIONS,
  PAPER_HEADER_FONT_SIZE_OPTIONS,
  PAPER_LINE_HEIGHT_OPTIONS,
  PAPER_MARGIN_OPTIONS,
  PAPER_ORIENTATION_OPTIONS,
  PAPER_PAGE_NUMBER_STYLE_OPTIONS,
  PAPER_SIZE_OPTIONS,
  type AppSettings,
  type PaperFont,
  type PaperFontSize,
  type PaperHeaderAlign,
  type PaperHeaderFontSize,
  type PaperLineHeight,
  type PaperMargin,
  type PaperOrientation,
  type PaperPageNumberStyle,
  type PaperSize,
} from "../../lib/types/config";
import { inputCls } from "../../lib/ui/styles";

type SettingKey =
  | "paperFont"
  | "paperFontSize"
  | "paperLineHeight"
  | "paperMargin"
  | "paperOrientation"
  | "paperSize"
  | "paperHeader"
  | "paperHeaderFontSize"
  | "paperHeaderAlign"
  | "paperPageNumberStyle";

interface PaperTextSelection {
  questionId: string;
  text: string;
  markdownText: string;
  plainStart: number;
  plainEnd: number;
}

/** Office-like paper formatting toolbar for whole-paper typography and layout. */
export function PaperToolbar() {
  const { t } = useTranslation();
  const settings = useConfigStore((state) => state.config.settings);
  const updateSettings = useConfigStore((state) => state.updateSettings);
  const paper = usePaperStore((state) => state.paper);
  const editQuestion = usePaperStore((state) => state.editQuestion);
  const { hasTarget, applyFormat } = useMarkdownFormat();
  const [activeTab, setActiveTab] = useState<"layout" | "markdown">("layout");
  const [headerPanelOpen, setHeaderPanelOpen] = useState(false);
  const [paperSelection, setPaperSelection] =
    useState<PaperTextSelection | null>(null);
  const canFormat = hasTarget || paperSelection !== null;
  const pageCount = useVisiblePaperPageCount();

  const refreshPaperSelection = useCallback(() => {
    const nextSelection = readPaperTextSelection();
    if (nextSelection) setPaperSelection(nextSelection);
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshPaperSelection);
    window.addEventListener("mouseup", refreshPaperSelection);
    window.addEventListener("keyup", refreshPaperSelection);
    refreshPaperSelection();
    return () => {
      document.removeEventListener("selectionchange", refreshPaperSelection);
      window.removeEventListener("mouseup", refreshPaperSelection);
      window.removeEventListener("keyup", refreshPaperSelection);
    };
  }, [refreshPaperSelection]);

  function update<K extends SettingKey>(key: K, value: AppSettings[K]) {
    void updateSettings({ [key]: value });
  }

  function applyFormatToActiveSelection(format: MarkdownFormat): boolean {
    const currentPaperSelection = readPaperTextSelection();
    if (
      currentPaperSelection &&
      applyFormatToPaperSelection(currentPaperSelection, format)
    ) {
      return true;
    }
    if (applyFormat(format)) return true;
    const selection = paperSelection;
    if (selection && applyFormatToPaperSelection(selection, format)) return true;
    return false;
  }

  function applyFormatToPaperSelection(
    selection: PaperTextSelection,
    format: MarkdownFormat,
  ): boolean {
    if (!selection) return false;
    const question = paper.questions.find((q) => q.id === selection.questionId);
    if (!question) return false;
    const range = findSelectedTextRange(question.content, selection);
    if (!range) return false;

    const result = applyMarkdownFormat(
      question.content,
      range.start,
      range.end,
      format,
    );
    editQuestion({ ...question, content: result.value } as Question);
    window.getSelection()?.removeAllRanges();
    setPaperSelection(null);
    return true;
  }

  return (
    <section
      aria-label={t("paperToolbar.title")}
      className="no-print relative z-10 flex flex-wrap items-center gap-1 border-b border-border bg-card px-4 py-1.5"
    >
      <div
        className="relative grid h-8 grid-cols-2 rounded-md border border-border bg-muted/50 p-0.5 shadow-sm"
        role="tablist"
        aria-label={t("paperToolbar.modeTabs")}
      >
        <span
          aria-hidden="true"
          data-testid="paper-toolbar-tab-indicator"
          className={
            "absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-sm bg-primary shadow-sm transition-transform duration-200 ease-out " +
            (activeTab === "markdown" ? "translate-x-full" : "translate-x-0")
          }
        />
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
            <SelectControl<PaperOrientation>
              icon={<RotateCwSquare className="h-4 w-4" />}
              label={t("paperToolbar.orientation")}
              value={settings.paperOrientation}
              options={PAPER_ORIENTATION_OPTIONS}
              optionKeyPrefix="paperOrientation"
              onChange={(value) => update("paperOrientation", value)}
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

          <ToolbarGroup label={t("paperToolbar.headerFooter")}>
            <div className="relative">
              <button
                type="button"
                aria-expanded={headerPanelOpen}
                aria-haspopup="dialog"
                aria-label={t("paperToolbar.header")}
                title={t("paperToolbar.header")}
                onClick={() => setHeaderPanelOpen((open) => !open)}
                className={[
                  "relative inline-flex h-8 items-center gap-1.5 rounded border border-border bg-card px-2 text-xs text-foreground",
                  "transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                  headerPanelOpen ? "bg-accent text-accent-foreground" : "",
                ].filter(Boolean).join(" ")}
              >
                <ScrollText className="h-4 w-4 text-muted-foreground" />
                <span>{t("paperToolbar.header")}</span>
                {settings.paperHeader.trim() && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary"
                  />
                )}
              </button>
              {headerPanelOpen && (
                <div
                  role="dialog"
                  aria-label={t("paperToolbar.headerSettings")}
                  className="absolute left-0 top-9 z-50 w-72 animate-fade-in rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
                >
                  <label className="block text-xs font-medium text-muted-foreground">
                    {t("paperToolbar.headerText")}
                    <input
                      value={settings.paperHeader}
                      onChange={(event) =>
                        update("paperHeader", event.currentTarget.value)
                      }
                      placeholder={t("paperToolbar.headerPlaceholder")}
                      aria-label={t("paperToolbar.headerText")}
                      className={`${inputCls} mt-1 h-8 py-1.5 text-xs`}
                    />
                  </label>
                  <div className="mt-2 flex items-center gap-1.5">
                    <SelectControl<PaperHeaderFontSize>
                      icon={<CaseSensitive className="h-4 w-4" />}
                      label={t("paperToolbar.headerFontSize")}
                      value={settings.paperHeaderFontSize}
                      options={PAPER_HEADER_FONT_SIZE_OPTIONS}
                      optionKeyPrefix="paperHeaderFontSize"
                      onChange={(value) => update("paperHeaderFontSize", value)}
                    />
                    <div
                      role="group"
                      aria-label={t("paperToolbar.headerAlign")}
                      className="inline-flex h-8 rounded border border-border bg-card p-0.5"
                    >
                      {PAPER_HEADER_ALIGN_OPTIONS.map((align) => (
                        <HeaderAlignButton
                          key={align}
                          align={align}
                          active={settings.paperHeaderAlign === align}
                          label={t(`paperHeaderAlign.${align}`)}
                          onClick={() => update("paperHeaderAlign", align)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <SelectControl<PaperPageNumberStyle>
              icon={<FileText className="h-4 w-4" />}
              label={t("paperToolbar.pageNumber")}
              value={settings.paperPageNumberStyle}
              options={PAPER_PAGE_NUMBER_STYLE_OPTIONS}
              optionKeyPrefix="paperPageNumberStyle"
              optionLabel={(style) => formatToolbarPageNumber(style, pageCount, t)}
              onChange={(value) => update("paperPageNumberStyle", value)}
            />
          </ToolbarGroup>
        </>
      ) : (
        <>
          <ToolbarGroup label={t("paperToolbar.markdownStructure")}>
            <MarkdownButton
              format="heading"
              icon={<Heading2 className="h-4 w-4" />}
              label={t("editorToolbar.heading")}
              disabled={!canFormat}
              onFormat={applyFormatToActiveSelection}
            />
            <MarkdownButton
              format="bulletList"
              icon={<List className="h-4 w-4" />}
              label={t("editorToolbar.bulletList")}
              disabled={!canFormat}
              onFormat={applyFormatToActiveSelection}
            />
            <MarkdownButton
              format="orderedList"
              icon={<ListOrdered className="h-4 w-4" />}
              label={t("editorToolbar.orderedList")}
              disabled={!canFormat}
              onFormat={applyFormatToActiveSelection}
            />
            <MarkdownButton
              format="quote"
              icon={<Quote className="h-4 w-4" />}
              label={t("editorToolbar.quote")}
              disabled={!canFormat}
              onFormat={applyFormatToActiveSelection}
            />
          </ToolbarGroup>

          <ToolbarGroup label={t("paperToolbar.markdownText")}>
            <MarkdownButton
              format="bold"
              icon={<Bold className="h-4 w-4" />}
              label={t("editorToolbar.bold")}
              disabled={!canFormat}
              onFormat={applyFormatToActiveSelection}
            />
            <MarkdownButton
              format="italic"
              icon={<Italic className="h-4 w-4" />}
              label={t("editorToolbar.italic")}
              disabled={!canFormat}
              onFormat={applyFormatToActiveSelection}
            />
            <MarkdownButton
              format="underline"
              icon={<Underline className="h-4 w-4" />}
              label={t("editorToolbar.underline")}
              disabled={!canFormat}
              onFormat={applyFormatToActiveSelection}
            />
            <MarkdownButton
              format="code"
              icon={<Code className="h-4 w-4" />}
              label={t("editorToolbar.code")}
              disabled={!canFormat}
              onFormat={applyFormatToActiveSelection}
            />
          </ToolbarGroup>

          <ToolbarGroup label={t("paperToolbar.markdownColor")}>
            <ColorPaletteButton<TextColorPreset>
              type="textColor"
              icon={<Baseline className="h-4 w-4" />}
              label={t("editorToolbar.textColor")}
              disabled={!canFormat}
              options={TEXT_COLOR_PRESETS}
              values={TEXT_COLOR_VALUES}
              optionKeyPrefix="textColor"
              onFormat={applyFormatToActiveSelection}
            />
            <ColorPaletteButton<HighlightColorPreset>
              type="highlight"
              icon={<PaintBucket className="h-4 w-4" />}
              label={t("editorToolbar.highlightColor")}
              disabled={!canFormat}
              options={HIGHLIGHT_COLOR_PRESETS}
              values={HIGHLIGHT_COLOR_VALUES}
              optionKeyPrefix="highlightColor"
              onFormat={applyFormatToActiveSelection}
            />
          </ToolbarGroup>

          <ToolbarGroup label={t("paperToolbar.markdownClear")}>
            <MarkdownButton
              format="clear"
              icon={<Eraser className="h-4 w-4" />}
              label={t("editorToolbar.clear")}
              disabled={!canFormat}
              onFormat={applyFormatToActiveSelection}
            />
          </ToolbarGroup>
        </>
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
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={tabButton(active)}
    >
      {label}
    </button>
  );
}

function HeaderAlignButton({
  align,
  active,
  label,
  onClick,
}: {
  align: PaperHeaderAlign;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const icon =
    align === "left" ? (
      <AlignLeft className="h-4 w-4" />
    ) : align === "center" ? (
      <AlignCenter className="h-4 w-4" />
    ) : (
      <AlignRight className="h-4 w-4" />
    );
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        "inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      ].join(" ")}
    >
      {icon}
    </button>
  );
}

function formatToolbarPageNumber(
  style: PaperPageNumberStyle,
  totalPages: number,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  const pages = Math.max(1, totalPages);
  switch (style) {
    case "plain":
      return "1";
    case "fraction":
      return `1 / ${pages}`;
    case "zhPage":
      return t("paperToolbar.pageNumberPreview.zhPage");
    case "zhFraction":
      return t("paperToolbar.pageNumberPreview.zhFraction", { total: pages });
  }
}

function useVisiblePaperPageCount(): number {
  const [count, setCount] = useState(1);

  useEffect(() => {
    function updateCount() {
      const pages = [...document.querySelectorAll<HTMLElement>(".paper-page")]
        .filter((page) => !page.closest("[aria-hidden='true']"));
      setCount(Math.max(1, pages.length));
    }

    updateCount();
    const observer = new MutationObserver(updateCount);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", updateCount);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateCount);
    };
  }, []);

  return count;
}

function tabButton(active: boolean): string {
  return [
    "relative z-10 inline-flex h-7 items-center justify-center rounded-sm px-3 text-xs font-medium",
    "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
    active
      ? "text-primary-foreground"
      : "text-muted-foreground hover:text-foreground",
  ].join(" ");
}

function ToolbarGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-8 min-w-0 items-center gap-1 rounded-sm border border-border/80 bg-muted/20 px-1">
      <span className="hidden shrink-0 text-xs font-medium text-muted-foreground/70 sm:inline">{label}</span>
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
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onFormat(format)}
      className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
    >
      {icon}
    </button>
  );
}

function readPaperTextSelection(): PaperTextSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;
  const text = selection.toString().trim();
  if (!text) return null;

  const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const container = range?.commonAncestorContainer ?? selection.anchorNode;
  const element =
    container instanceof Element ? container : container?.parentElement ?? null;
  const source = element?.closest<HTMLElement>("[data-markdown-source='content']");
  if (!source) return null;
  const questionBlock = source?.closest<HTMLElement>(".question-block");
  const questionId = questionBlock?.dataset.questionId;
  if (!questionId) return null;

  const markdownText = source.dataset.markdownText ?? "";
  const beforeSelection = range?.cloneRange();
  beforeSelection?.selectNodeContents(source);
  if (range) {
    beforeSelection?.setEnd(range.startContainer, range.startOffset);
  }
  const rawText = selection.toString();
  const leadingWhitespace = rawText.match(/^\s*/)?.[0].length ?? 0;
  const trailingWhitespace = rawText.match(/\s*$/)?.[0].length ?? 0;
  const plainStart = (beforeSelection?.toString().length ?? 0) + leadingWhitespace;
  const plainEnd = Math.max(plainStart, plainStart + rawText.length - leadingWhitespace - trailingWhitespace);

  return { questionId, text, markdownText, plainStart, plainEnd };
}

function findSelectedTextRange(
  content: string,
  selection: PaperTextSelection,
): { start: number; end: number } | null {
  const text = selection.text.trim();
  if (!text) return null;
  const markdownRange = findMarkdownTextRange(selection.markdownText, selection);
  if (markdownRange) {
    const renderedMarkdown = selection.markdownText;
    const markdownStart = content.indexOf(renderedMarkdown);
    if (markdownStart >= 0) {
      return {
        start: markdownStart + markdownRange.start,
        end: markdownStart + markdownRange.end,
      };
    }
  }

  const direct = content.indexOf(text);
  if (direct >= 0) return { start: direct, end: direct + text.length };

  const collapsed = text.replace(/\s+/g, " ");
  if (collapsed !== text) {
    const collapsedIndex = content.indexOf(collapsed);
    if (collapsedIndex >= 0) {
      return { start: collapsedIndex, end: collapsedIndex + collapsed.length };
    }
  }

  const normalizedNeedle = normalizeSelectionText(text);
  if (!normalizedNeedle) return null;
  const normalizedContent = normalizeSelectionText(content);
  const normalizedIndex = normalizedContent.indexOf(normalizedNeedle);
  if (normalizedIndex < 0) return null;

  let normalizedCursor = 0;
  let start = -1;
  let end = -1;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const normalizedChar = normalizeSelectionText(char);
    if (!normalizedChar) continue;
    if (normalizedCursor === normalizedIndex) start = index;
    normalizedCursor += normalizedChar.length;
    if (normalizedCursor >= normalizedIndex + normalizedNeedle.length) {
      end = index + 1;
      break;
    }
  }

  return start >= 0 && end >= 0 ? { start, end } : null;
}

function normalizeSelectionText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function findMarkdownTextRange(
  markdown: string,
  selection: PaperTextSelection,
): { start: number; end: number } | null {
  if (!markdown) return null;
  const positions = visibleMarkdownPositions(markdown);
  if (selection.plainStart < 0 || selection.plainEnd < selection.plainStart) {
    return null;
  }
  if (selection.plainStart === selection.plainEnd) return null;
  const start = positions[selection.plainStart];
  const last = positions[selection.plainEnd - 1];
  if (start === undefined || last === undefined) return null;
  return { start, end: last + 1 };
}

function visibleMarkdownPositions(markdown: string): number[] {
  const positions: number[] = [];
  let lineStart = true;

  for (let index = 0; index < markdown.length; index += 1) {
    const rest = markdown.slice(index);
    if (lineStart) {
      const blockMarker = rest.match(/^(\s*)(#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s*)/);
      if (blockMarker) {
        index += blockMarker[0].length - 1;
        lineStart = false;
        continue;
      }
    }
    if (rest.startsWith("**") || rest.startsWith("++")) {
      index += 1;
      continue;
    }
    const styleOpen = rest.match(/^\{\{(?:color|mark):[a-z]+\|/);
    if (styleOpen) {
      index += styleOpen[0].length - 1;
      continue;
    }
    if (rest.startsWith("}}")) {
      index += 1;
      continue;
    }
    const char = markdown[index];
    if (char === "*" || char === "`") continue;
    positions.push(index);
    lineStart = char === "\n";
  }

  return positions;
}
