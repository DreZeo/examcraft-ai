import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import { MarkdownFormatProvider } from "../../components/layout/MarkdownFormatContext";
import { PaperCanvas } from "../../components/paper/PaperCanvas";
import { useExportStore } from "../../stores/exportStore";
import type { ExamPaper } from "../types/exam";

let paper: ExamPaper;
let view: "teacher" | "student";
const appendQuestion = vi.fn();
const updateSettings = vi.fn();
let paperSettings = defaultPaperSettings();

function defaultPaperSettings() {
  return {
    paperFont: "fangsong",
    paperFontSize: "sihao",
    paperLineHeight: "oneHalf",
    paperMargin: "normal",
    paperSize: "b5",
    paperOrientation: "portrait",
    paperHeader: "机密",
    paperHeaderFontSize: "pt8",
    paperHeaderAlign: "right",
    paperHeaderFooterLine: false,
    paperPageNumberStyle: "zhFraction",
    paperPreviewZoom: "pct100",
  };
}

vi.mock("../../stores/paperStore", () => ({
  usePaperStore: () => ({
    paper,
    view,
    appendQuestion,
  }),
}));

vi.mock("../../stores/configStore", () => ({
  useConfigStore: (selector: (state: unknown) => unknown) =>
    selector({
      config: {
        settings: paperSettings,
      },
      updateSettings,
    }),
}));

describe("PaperCanvas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    appendQuestion.mockReset();
    updateSettings.mockReset();
    view = "teacher";
    paper = {
      version: 1,
      title: "测试卷",
      questions: [],
    };
    paperSettings = defaultPaperSettings();
    useExportStore.setState({
      showHeader: true,
      fields: {
        subject: true,
        className: true,
        studentName: true,
        duration: false,
        totalScore: false,
        score: false,
      },
    });
  });

  it("applies Word-like paper size and font size styles", () => {
    const { container } = renderCanvas();
    const sheet = container.querySelector(".paper-page");

    expect(sheet).toHaveStyle({
      fontSize: "14pt",
      width: "176mm",
      maxWidth: "176mm",
      minHeight: "250mm",
      padding: "25.4mm 31.8mm 25.4mm 31.8mm",
    });
    expect(sheet).toHaveStyle("--paper-page-size: 176mm 250mm");
    expect(sheet).not.toHaveStyle({ textAlign: "justify" });
    expect(document.documentElement.style.getPropertyValue("--paper-page-size"))
      .toBe("176mm 250mm");
  });

  it("scales only the screen preview while keeping paper dimensions unchanged", () => {
    paperSettings.paperPreviewZoom = "pct75";

    const { container } = renderCanvas();
    const stack = container.querySelector(".paper-page-stack");
    const previewFrame = container.querySelector(".paper-preview-page-frame");
    const previewPage = container.querySelector(".paper-preview-page");
    const sheet = container.querySelector(".paper-page");

    expect(stack?.className).toContain("flex-wrap");
    expect(previewFrame).toHaveStyle({
      width: `${176 * (96 / 25.4) * 0.75}px`,
      height: `${250 * (96 / 25.4) * 0.75}px`,
    });
    expect(previewPage).toHaveStyle({ transform: "scale(0.75)" });
    expect(sheet).toHaveStyle({
      width: "176mm",
      minHeight: "250mm",
    });
  });

  it("renders type sections with numbering restarted inside each section", () => {
    paper = makePaper();

    const { container } = renderCanvas();
    const sectionTitle = container.querySelector(".paper-section-title");

    expect(container).toHaveTextContent("一、单选题共1题 每小题5分 共5分");
    expect(container).toHaveTextContent("二、填空题共1题 每小题4分 共4分");
    expect(container).toHaveTextContent("三、论述题共1题 每小题20分 共20分");
    expect([
      ...visiblePages(container).flatMap((page) => [
        ...page.querySelectorAll(".question-block > div > span"),
      ]),
    ].map((node) => node.textContent)).toEqual(["1.", "1.", "1."]);
    expect(container).not.toHaveTextContent("(5)");
    expect(sectionTitle?.className).not.toContain("border-b");
  });

  it("renders configured Word-like header and page number footer without separator lines by default", () => {
    paper = makePaper();

    const { container } = renderCanvas();
    const header = container.querySelector(".paper-header");
    const footer = container.querySelector(".paper-footer");

    expect(header).toHaveTextContent("机密");
    expect(footer).toHaveTextContent("第 1 页 / 共 2 页");
    expect(header).toHaveStyle({ fontSize: "8pt", textAlign: "right" });
    expect(header?.className).not.toContain("border-b");
    expect(footer?.className).not.toContain("border-t");
  });

  it("renders header and footer separator lines when enabled", () => {
    paper = makePaper();
    paperSettings.paperHeaderFooterLine = true;

    const { container } = renderCanvas();
    const header = container.querySelector(".paper-header");
    const footer = container.querySelector(".paper-footer");

    expect(header?.className).toContain("border-b");
    expect(footer?.className).toContain("border-t");
  });

  it("renders score as a fill-in field without adding an underline after total score", () => {
    paper = makePaper();
    useExportStore.setState((state) => ({
      fields: {
        ...state.fields,
        totalScore: true,
        score: true,
      },
    }));

    const { container } = renderCanvas();

    const totalScore = [...container.querySelectorAll("span")].find((node) =>
      node.textContent?.startsWith("总分："),
    );
    const score = [...container.querySelectorAll("span")].find((node) =>
      node.textContent?.startsWith("得分："),
    );

    expect(totalScore).toHaveTextContent("总分：29");
    expect(totalScore?.querySelector(".border-b")).toBeNull();
    expect(score).toHaveTextContent("得分：");
    expect(score?.querySelector(".border-b")).toBeInTheDocument();
  });

  it("renders student blank lines and answer space without teacher answers", () => {
    paper = makePaper();
    view = "student";

    const { container } = renderCanvas();
    const answerSpace = container.querySelector(".answer-space");

    expect(answerSpace).toBeInTheDocument();
    expect(answerSpace?.className).not.toContain("border");
    expect(answerSpace?.className).not.toContain("dashed");
    expect(container).toHaveTextContent("__________");
    expect(container.querySelector(".answer-block")).not.toBeInTheDocument();
  });

  it("does not crash when switching back to teacher view with missing answer fields", () => {
    paper = makePaperWithMissingTeacherAnswer();
    view = "student";

    const { container, rerender } = renderCanvas();

    expect(container.querySelector(".answer-block")).not.toBeInTheDocument();

    view = "teacher";
    expect(() =>
      rerender(
        <MarkdownFormatProvider>
          <PaperCanvas />
        </MarkdownFormatProvider>,
      ),
    ).not.toThrow();
    expect(container).toHaveTextContent("缺答案字段的作文题");
    expect(container).not.toHaveTextContent("undefined");
  });

  it("updates estimated pages with measured block heights", async () => {
    paper = makeMeasuredPaper();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getRect(this: HTMLElement) {
        const id = this.dataset.layoutBlockId;
        const height = id === "question-choice-2" ? 24 : 12;
        return {
          width: 100,
          height,
          top: 0,
          right: 0,
          bottom: height,
          left: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      },
    );

    const { container } = renderCanvas();

    await waitFor(() => {
      const pages = visiblePages(container);
      expect(pages).toHaveLength(1);
      expect(pages[0]).toHaveTextContent("第二题");
    });
  });

  it("invalidates measured pages when question Markdown content changes", async () => {
    paper = makeRealtimeMarkdownPaper("choose one");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getRect(this: HTMLElement) {
        const id = this.dataset.layoutBlockId;
        const height = id === "question-choice-1" ? 880 : 12;
        return {
          width: 100,
          height,
          top: 0,
          right: 0,
          bottom: height,
          left: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      },
    );

    const { container, rerender } = renderCanvas();

    await waitFor(() => {
      expect(visiblePages(container).length).toBeGreaterThan(1);
    });

    paper = makeRealtimeMarkdownPaper("**choose** one");
    rerender(
      <MarkdownFormatProvider>
        <PaperCanvas />
      </MarkdownFormatProvider>,
    );

    const formatted = visiblePages(container)
      .map((page) => page.querySelector("strong"))
      .find((node): node is HTMLElement => node instanceof HTMLElement);
    expect(formatted).toHaveTextContent("choose");
    expect(visiblePages(container).map((page) => page.textContent).join(""))
      .not.toContain("**choose**");
  });

  it("renders italic Markdown immediately after content changes", async () => {
    paper = makeRealtimeMarkdownPaper("choose one");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getRect(this: HTMLElement) {
        const id = this.dataset.layoutBlockId;
        const height = id === "question-choice-1" ? 880 : 12;
        return {
          width: 100,
          height,
          top: 0,
          right: 0,
          bottom: height,
          left: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      },
    );

    const { container, rerender } = renderCanvas();

    await waitFor(() => {
      expect(visiblePages(container).length).toBeGreaterThan(1);
    });

    paper = makeRealtimeMarkdownPaper("*choose* one");
    rerender(
      <MarkdownFormatProvider>
        <PaperCanvas />
      </MarkdownFormatProvider>,
    );

    const formatted = visiblePages(container)
      .map((page) => page.querySelector("em"))
      .find((node): node is HTMLElement => node instanceof HTMLElement);
    expect(formatted).toHaveTextContent("choose");
    expect(visiblePages(container).map((page) => page.textContent).join(""))
      .not.toContain("*choose*");
  });

  it("renders bold italic Markdown immediately after content changes", async () => {
    paper = makeRealtimeMarkdownPaper("**choose** one");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getRect(this: HTMLElement) {
        const id = this.dataset.layoutBlockId;
        const height = id === "question-choice-1" ? 880 : 12;
        return {
          width: 100,
          height,
          top: 0,
          right: 0,
          bottom: height,
          left: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        };
      },
    );

    const { container, rerender } = renderCanvas();

    await waitFor(() => {
      expect(visiblePages(container).length).toBeGreaterThan(1);
    });

    paper = makeRealtimeMarkdownPaper("***choose*** one");
    rerender(
      <MarkdownFormatProvider>
        <PaperCanvas />
      </MarkdownFormatProvider>,
    );

    const formatted = visiblePages(container)
      .map((page) => page.querySelector("em strong"))
      .find((node): node is HTMLElement => node instanceof HTMLElement);
    expect(formatted).toHaveTextContent("choose");
  });

  it("does not append a blank question when the new-question modal is canceled", async () => {
    renderCanvas();

    await userEvent.click(screen.getByRole("button", { name: "添加题目" }));
    await userEvent.click(screen.getAllByRole("button", { name: "取消" })[1]);

    expect(appendQuestion).not.toHaveBeenCalled();
  });

  it("appends a new question only after saving the modal draft", async () => {
    renderCanvas();

    await userEvent.click(screen.getByRole("button", { name: "添加题目" }));
    await userEvent.type(
      screen.getByPlaceholderText("输入题干，支持 Markdown 与 $公式$"),
      "新题干",
    );
    await userEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(appendQuestion).toHaveBeenCalledTimes(1);
    expect(appendQuestion.mock.calls[0][0]).toMatchObject({
      type: "single-choice",
      content: "新题干",
      score: 5,
    });
  });
});

function renderCanvas() {
  return render(
    <MarkdownFormatProvider>
      <PaperCanvas />
    </MarkdownFormatProvider>,
  );
}

function makePaper(): ExamPaper {
  return {
    version: 1,
    title: "测试卷",
    questions: [
      {
        id: "choice-1",
        type: "single-choice",
        content: "选择正确答案。",
        options: ["A", "B", "C", "D"],
        correctAnswer: 1,
        score: 5,
      },
      {
        id: "fill-1",
        type: "fill-in-blank",
        content: "水的化学式是 ___。",
        blanks: ["H2O"],
        score: 4,
      },
      {
        id: "essay-1",
        type: "essay",
        content: "请论述水循环的意义。",
        scoringCriteria: "观点明确，论证充分。",
        score: 20,
      },
    ],
  };
}

function makeMeasuredPaper(): ExamPaper {
  return {
    version: 1,
    title: "测试卷",
    questions: [
      {
        id: "choice-1",
        type: "single-choice",
        content: "第一题 ".repeat(220),
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
        score: 4,
      },
      {
        id: "choice-2",
        type: "single-choice",
        content: "第二题",
        options: ["A", "B", "C", "D"],
        correctAnswer: 1,
        score: 4,
      },
    ],
  };
}

function makeRealtimeMarkdownPaper(content: string): ExamPaper {
  return {
    version: 1,
    title: "测试卷",
    questions: [
      {
        id: "choice-1",
        type: "single-choice",
        content,
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
        score: 4,
      },
      {
        id: "choice-2",
        type: "single-choice",
        content: "第二题",
        options: ["A", "B", "C", "D"],
        correctAnswer: 1,
        score: 4,
      },
    ],
  };
}

function makePaperWithMissingTeacherAnswer(): ExamPaper {
  return {
    version: 1,
    title: "测试卷",
    questions: [
      {
        id: "legacy-essay",
        type: "essay",
        content: "缺答案字段的作文题",
        score: 20,
      } as ExamPaper["questions"][number],
    ],
  };
}

function visiblePages(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(".paper-page")].filter(
    (page) => !page.closest("[aria-hidden='true']"),
  );
}
