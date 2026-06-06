import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { v4 as uuid } from "uuid";
import { FileText, Plus } from "lucide-react";
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
import { primaryBtn, secondaryBtn } from "../../lib/ui/styles";
import { toStudentVersion } from "../../lib/exam/studentVersion";
import { createBlankQuestion } from "../../lib/exam/blankQuestion";
import { QuestionBlock } from "./QuestionBlock";
import { QuestionEditModal } from "./QuestionEditModal";
import { ExamInfoHeader } from "./ExamInfoHeader";
import { Markdown } from "./Markdown";

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
  const display = view === "student" ? toStudentVersion(paper) : paper;
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
    () => buildPaperPages(display, paperSettings, includeAnswers),
    [display, paperSettings, includeAnswers],
  );
  const [measuredPages, setMeasuredPages] = useState<PaperPage[] | null>(null);
  const pages = measuredPages ?? estimatedPages;

  const editing = editingId
    ? (paper.questions.find((q) => q.id === editingId) ?? null)
    : null;

  function addAndEdit() {
    setNewQuestionDraft(createBlankQuestion("single-choice", uuid()));
  }

  useLayoutEffect(() => {
    if (blocks.length === 0) return;
    const root = measureRef.current;
    if (!root) return;

    const heights: Record<string, number> = {};
    root.querySelectorAll<HTMLElement>("[data-layout-block-id]").forEach((node) => {
      const id = node.dataset.layoutBlockId;
      if (!id) return;
      heights[id] = pxToMm(node.getBoundingClientRect().height);
    });

    if (Object.keys(heights).length !== blocks.length) return;
    const next = paginateMeasuredBlocks(
      blocks,
      pageMetrics.contentHeightMm,
      heights,
    );
    setMeasuredPages((current) =>
      samePages(current, next) || samePages(estimatedPages, next)
        ? current
        : next,
    );
  }, [blocks, estimatedPages, pageMetrics.contentHeightMm]);

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
    <div className="flex min-w-fit justify-center px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6">
        {display.questions.length === 0 ? (
          <PaperPageShell paperSettings={paperSettings} pageMetrics={pageMetrics}>
            <EmptyPaper t={t} addAndEdit={addAndEdit} />
          </PaperPageShell>
        ) : (
          <>
            {pages.map((page) => (
              <PaperPageShell
                key={page.id}
                paperSettings={paperSettings}
                pageMetrics={pageMetrics}
              >
                <div className="space-y-5">
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
      <PaperPageShell paperSettings={paperSettings} pageMetrics={pageMetrics}>
        <div className="space-y-5">
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
  children: ReactNode;
}

function PaperPageShell({
  paperSettings,
  pageMetrics,
  children,
}: PaperPageShellProps) {
  return (
    <section
      className="paper-sheet paper-page w-full rounded-lg bg-card shadow-sm"
      style={{
        fontFamily: PAPER_FONT_STACKS[paperSettings.paperFont],
        fontSize: PAPER_FONT_SIZE_STYLES[paperSettings.paperFontSize],
        lineHeight: PAPER_LINE_HEIGHT_STYLES[paperSettings.paperLineHeight],
        padding: pageMetrics.padding,
        width: pageMetrics.width,
        maxWidth: pageMetrics.width,
        minHeight: pageMetrics.height,
      }}
    >
      {children}
    </section>
  );
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
      return (
        <div {...attrs}>
          <h2 className="paper-section-title mt-2 border-b border-border pb-1 text-base font-semibold text-foreground">
            {block.section.title}
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

function EmptyPaper({
  t,
  addAndEdit,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  addAndEdit: () => void;
}) {
  return (
    <div className="py-16 text-center">
      <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
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
