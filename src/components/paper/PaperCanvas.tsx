import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { v4 as uuid } from "uuid";
import { NotebookPen, Plus } from "lucide-react";
import { usePaperStore } from "../../stores/paperStore";
import { useConfigStore } from "../../stores/configStore";
import {
  PAPER_FONT_SIZE_STYLES,
  PAPER_FONT_STACKS,
  PAPER_LINE_HEIGHT_STYLES,
} from "../../lib/types/config";
import type { AppSettings } from "../../lib/types/config";
import type { ExamPaper, Question } from "../../lib/types/exam";
import {
  buildPaperPages,
  buildPaperBlocks,
  getPageMetrics,
  paginateMeasuredBlocks,
  type PageMetrics,
  type PaperLayoutBlock,
  type PaperPage,
} from "../../lib/exam/pagination";
import { sectionScoreSummary } from "../../lib/exam/paperSections";
import { primaryBtn, secondaryBtn } from "../../lib/ui/styles";
import { toStudentVersion } from "../../lib/exam/studentVersion";
import { createBlankQuestion } from "../../lib/exam/blankQuestion";
import { QuestionBlock } from "./QuestionBlock";
import { QuestionEditModal } from "./QuestionEditModal";
import { ExamInfoHeader } from "./ExamInfoHeader";
import { Markdown } from "./Markdown";

const PAPER_BLOCK_SPACING_CLASS = "space-y-5";
const PAPER_BLOCK_GAP_MM = pxToMm(20);

interface PaperCanvasProps {
  scrollRootRef?: RefObject<HTMLElement | null>;
  onActiveQuestionChange?: (id: string | null) => void;
}

/**
 * Center "sheet": a centered white page that renders the assembled paper. Shows
 * a guided empty state when there are no questions. Honors the teacher/student
 * view toggle by filtering answers for the student preview. Hosts the
 * block-level edit modal and the "add question manually" affordances.
 */
export function PaperCanvas({
  scrollRootRef,
  onActiveQuestionChange,
}: PaperCanvasProps) {
  const { t } = useTranslation();
  const { paper, view, appendQuestion } = usePaperStore();
  const paperSettings = useConfigStore((s) => s.config.settings);
  const display = useMemo(
    () => (view === "student" ? toStudentVersion(paper) : paper),
    [paper, view],
  );
  const questionIds = display.questions.map((question) => question.id).join("|");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQuestionDraft, setNewQuestionDraft] = useState<Question | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const pageMetrics = getPageMetrics(paperSettings);
  const includeAnswers = view !== "student";
  const blocks = useMemo(
    () => buildPaperBlocks(display, paperSettings, includeAnswers),
    [display, paperSettings, includeAnswers],
  );
  const estimatedPages = useMemo(
    () =>
      buildPaperPages(
        display,
        paperSettings,
        includeAnswers,
        PAPER_BLOCK_GAP_MM,
      ),
    [display, paperSettings, includeAnswers],
  );
  const blockSignature = useMemo(
    () =>
      [
        view,
        includeAnswers ? "answers" : "student",
        pageMetrics.contentHeightMm,
        blocks.map(blockContentSignature).join("|"),
      ].join("::"),
    [blocks, includeAnswers, pageMetrics.contentHeightMm, view],
  );
  const [measured, setMeasured] = useState<{
    signature: string;
    pages: PaperPage[];
  } | null>(null);
  const [readySignature, setReadySignature] = useState<string | null>(null);
  const pages =
    measured?.signature === blockSignature ? measured.pages : estimatedPages;
  const printLayoutReady =
    display.questions.length === 0 || readySignature === blockSignature;

  const editing = editingId
    ? (paper.questions.find((q) => q.id === editingId) ?? null)
    : null;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--paper-page-size", pageMetrics.pageSize);
    root.style.setProperty("--paper-page-width", pageMetrics.width);
    root.style.setProperty("--paper-page-height", pageMetrics.height);
  }, [pageMetrics.height, pageMetrics.pageSize, pageMetrics.width]);

  useEffect(() => {
    document.documentElement.dataset.paperPaginationReady = printLayoutReady
      ? "true"
      : "false";
    return () => {
      delete document.documentElement.dataset.paperPaginationReady;
    };
  }, [printLayoutReady]);

  function addAndEdit() {
    setNewQuestionDraft(createBlankQuestion("single-choice", uuid()));
  }

  useEffect(() => {
    if (blocks.length === 0) {
      setReadySignature(blockSignature);
      return;
    }
    const root = measureRef.current;
    if (!root) return;

    let canceled = false;
    const frame = window.requestAnimationFrame(() => {
      if (canceled) return;
      const heights: Record<string, number> = {};
      root
        .querySelectorAll<HTMLElement>("[data-layout-block-id]")
        .forEach((node) => {
          const id = node.dataset.layoutBlockId;
          if (!id) return;
          heights[id] = pxToMm(node.getBoundingClientRect().height);
        });

      if (Object.keys(heights).length !== blocks.length) return;
      const next = paginateMeasuredBlocks(
        blocks,
        pageMetrics.contentHeightMm,
        heights,
        PAPER_BLOCK_GAP_MM,
      );
      setMeasured((current) => {
        if (
          current?.signature === blockSignature &&
          samePages(current.pages, next)
        ) {
          return current;
        }
        if (samePages(estimatedPages, next)) return null;
        return { signature: blockSignature, pages: next };
      });
      setReadySignature(blockSignature);
    });

    return () => {
      canceled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [blocks, blockSignature, estimatedPages, pageMetrics.contentHeightMm]);

  useEffect(() => {
    if (!onActiveQuestionChange) return;
    if (display.questions.length === 0) {
      onActiveQuestionChange(null);
      return;
    }
    const root = scrollRootRef?.current ?? null;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.questionId;
          if (!id) continue;
          if (entry.isIntersecting) visible.set(id, entry.intersectionRatio);
          else visible.delete(id);
        }

        const next =
          Array.from(visible.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
          null;
        onActiveQuestionChange(next);
      },
      {
        root,
        threshold: [0.15, 0.35, 0.6, 0.85],
        rootMargin: "-12% 0px -62% 0px",
      },
    );

    for (const question of display.questions) {
      const node = document.getElementById(`question-${question.id}`);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, [questionIds, onActiveQuestionChange, scrollRootRef]);

  return (
    <div className="paper-canvas flex min-w-fit justify-center px-4 py-8 sm:px-6">
      <div className="paper-page-stack flex flex-col gap-6">
        {display.questions.length === 0 ? (
          <PaperPageShell
            paperSettings={paperSettings}
            pageMetrics={pageMetrics}
            pageNumber={1}
            totalPages={1}
          >
            <EmptyPaper t={t} addAndEdit={addAndEdit} />
          </PaperPageShell>
        ) : (
          <>
            {pages.map((page, pageIndex) => (
              <PaperPageShell
                key={page.id}
                paperSettings={paperSettings}
                pageMetrics={pageMetrics}
                pageNumber={pageIndex + 1}
                totalPages={pages.length}
              >
                <div className={PAPER_BLOCK_SPACING_CLASS}>
                  {page.blocks.map((block) => (
                    <PaperBlock
                      key={block.id}
                      block={block}
                      display={display}
                      studentView={view === "student"}
                      onEdit={setEditingId}
                    />
                  ))}
                </div>
              </PaperPageShell>
            ))}
            <MeasurementLayer
              refNode={measureRef}
              blocks={blocks}
              display={display}
              studentView={view === "student"}
              paperSettings={paperSettings}
              pageMetrics={pageMetrics}
            />
            {view !== "student" && (
              <div className="no-print mt-6 border-t border-dashed border-border pt-4 text-center">
                <button
                  type="button"
                  onClick={addAndEdit}
                  className={secondaryBtn}
                >
                  <Plus className="h-4 w-4" />
                  {t("paper.addQuestion")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <QuestionEditModal
          question={editing}
          onClose={() => setEditingId(null)}
        />
      )}
      {newQuestionDraft && (
        <QuestionEditModal
          question={newQuestionDraft}
          onClose={() => setNewQuestionDraft(null)}
          onSave={appendQuestion}
        />
      )}
    </div>
  );
}

function MeasurementLayer({
  refNode,
  blocks,
  display,
  studentView,
  paperSettings,
  pageMetrics,
}: {
  refNode: RefObject<HTMLDivElement | null>;
  blocks: PaperLayoutBlock[];
  display: ExamPaper;
  studentView: boolean;
  paperSettings: AppSettings;
  pageMetrics: PageMetrics;
}) {
  return (
    <div
      ref={refNode}
      aria-hidden="true"
      className="no-print pointer-events-none fixed left-0 top-0 -z-10 opacity-0"
      style={{ width: pageMetrics.width }}
    >
      <PaperPageShell
        paperSettings={paperSettings}
        pageMetrics={pageMetrics}
        pageNumber={1}
        totalPages={1}
      >
        <div className={PAPER_BLOCK_SPACING_CLASS}>
          {blocks.map((block) => (
            <PaperBlock
              key={block.id}
              block={block}
              display={display}
              studentView={studentView}
              onEdit={() => undefined}
              measuring
            />
          ))}
        </div>
      </PaperPageShell>
    </div>
  );
}

interface PaperPageShellProps {
  paperSettings: AppSettings;
  pageMetrics: PageMetrics;
  pageNumber: number;
  totalPages: number;
  children: ReactNode;
}

function PaperPageShell({
  paperSettings,
  pageMetrics,
  pageNumber,
  totalPages,
  children,
}: PaperPageShellProps) {
  const header = paperSettings.paperHeader.trim();
  const pageNumberText = formatPageNumber(
    paperSettings.paperPageNumberStyle,
    pageNumber,
    totalPages,
  );
  return (
    <section
      className="paper-sheet paper-page flex w-full flex-col rounded-lg bg-card shadow-sm"
      style={{
        fontFamily: PAPER_FONT_STACKS[paperSettings.paperFont],
        fontSize: PAPER_FONT_SIZE_STYLES[paperSettings.paperFontSize],
        lineHeight: PAPER_LINE_HEIGHT_STYLES[paperSettings.paperLineHeight],
        padding: pageMetrics.padding,
        "--paper-page-size": pageMetrics.pageSize,
        "--paper-page-width": pageMetrics.width,
        "--paper-page-height": pageMetrics.height,
        width: pageMetrics.width,
        maxWidth: pageMetrics.width,
        minHeight: pageMetrics.height,
      } as CSSProperties}
    >
      {header && (
        <div className="paper-header mb-4 border-b border-border pb-2 text-center text-sm text-muted-foreground">
          {header}
        </div>
      )}
      <div className="paper-page-content min-h-0 flex-1">{children}</div>
      <div className="paper-footer mt-4 border-t border-border pt-2 text-center text-xs text-muted-foreground">
        {pageNumberText}
      </div>
    </section>
  );
}

function formatPageNumber(
  style: AppSettings["paperPageNumberStyle"],
  pageNumber: number,
  totalPages: number,
): string {
  switch (style) {
    case "plain":
      return `${pageNumber}`;
    case "fraction":
      return `${pageNumber} / ${totalPages}`;
    case "zhFraction":
      return `第 ${pageNumber} 页 / 共 ${totalPages} 页`;
    case "zhPage":
      return `第 ${pageNumber} 页`;
  }
}

function PaperBlock({
  block,
  display,
  studentView,
  onEdit,
  measuring = false,
}: {
  block: PaperLayoutBlock;
  display: ExamPaper;
  studentView: boolean;
  onEdit: (id: string) => void;
  measuring?: boolean;
}) {
  const attrs = { "data-layout-block-id": block.id };
  switch (block.kind) {
    case "title":
      return (
        <h1
          {...attrs}
          className="mb-6 text-center text-2xl font-semibold text-foreground"
        >
          {block.title}
        </h1>
      );
    case "exam-info":
      return (
        <div {...attrs}>
          <ExamInfoHeader paper={display} />
        </div>
      );
    case "section":
      const summary = sectionScoreSummary(block.section.questions);
      return (
        <div {...attrs}>
          <h2 className="paper-section-title mt-2 border-b border-border pb-1 text-base font-semibold text-foreground">
            {block.section.title}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {formatSectionScoreSummary(summary)}
            </span>
          </h2>
          {block.section.passage && (
            <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
              <Markdown>{block.section.passage}</Markdown>
            </div>
          )}
        </div>
      );
    case "question":
      return (
        <ol {...attrs} className="space-y-6">
          <QuestionBlock
            question={block.question}
            index={block.number - 1}
            studentView={studentView}
            onEdit={measuring ? () => undefined : onEdit}
          />
        </ol>
      );
  }
}

function formatSectionScoreSummary(
  summary: ReturnType<typeof sectionScoreSummary>,
): string {
  if (summary.perQuestionScore == null) {
    return `共${summary.count}题 共${summary.totalScore}分`;
  }
  return `共${summary.count}题 每小题${summary.perQuestionScore}分 共${summary.totalScore}分`;
}

function EmptyPaper({
  t,
  addAndEdit,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  addAndEdit: () => void;
}) {
  return (
    <div className="py-16 text-center">
      <NotebookPen className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
      <p className="text-base font-medium text-foreground">
        {t("paper.emptyTitle")}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {t("paper.emptySubtitle")}
      </p>
      <button
        type="button"
        onClick={addAndEdit}
        className={`no-print mt-4 ${primaryBtn}`}
      >
        <Plus className="h-4 w-4" />
        {t("paper.addQuestion")}
      </button>
    </div>
  );
}

function pxToMm(px: number): number {
  return px * 0.264583;
}

function samePages(a: PaperPage[] | null, b: PaperPage[]): boolean {
  if (!a || a.length !== b.length) return false;
  return a.every(
    (page, index) =>
      page.blocks.map((block) => block.id).join("|") ===
      b[index].blocks.map((block) => block.id).join("|"),
  );
}

function blockContentSignature(block: PaperLayoutBlock): string {
  switch (block.kind) {
    case "title":
      return stableSignature([block.id, block.title]);
    case "exam-info":
      return block.id;
    case "section":
      return stableSignature([
        block.id,
        block.section.title,
        block.section.passage ?? "",
        block.section.questions.map((question) => question.id),
      ]);
    case "question":
      return stableSignature([
        block.id,
        block.number,
        block.question,
        block.estimatedHeightMm,
      ]);
  }
}

function stableSignature(value: unknown): string {
  return JSON.stringify(value);
}
