import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import { MarkdownFormatProvider } from "../../components/layout/MarkdownFormatContext";
import { PaperCanvas } from "../../components/paper/PaperCanvas";
import type { ExamPaper } from "../types/exam";

let paper: ExamPaper;
let view: "teacher" | "student";
const appendQuestion = vi.fn();

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
        settings: {
          paperFont: "fangsong",
          paperFontSize: "sihao",
          paperLineHeight: "standard",
          paperMargin: "standard",
          paperSize: "b5",
        },
      },
    }),
}));

describe("PaperCanvas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    appendQuestion.mockReset();
    view = "teacher";
    paper = {
      version: 1,
      title: "测试卷",
      questions: [],
    };
  });

  it("applies Word-like paper size and font size styles", () => {
    const { container } = renderCanvas();
    const sheet = container.querySelector(".paper-page");

    expect(sheet).toHaveStyle({
      fontSize: "14pt",
      width: "176mm",
      maxWidth: "176mm",
      minHeight: "250mm",
    });
    expect(sheet).not.toHaveStyle({ textAlign: "justify" });
  });

  it("renders type sections with numbering restarted inside each section", () => {
    paper = makePaper();

    const { container } = renderCanvas();

    expect(container).toHaveTextContent("一、单选题");
    expect(container).toHaveTextContent("二、填空题");
    expect(container).toHaveTextContent("三、论述题");
    expect([
      ...visiblePages(container).flatMap((page) => [
        ...page.querySelectorAll(".question-block > div > span"),
      ]),
    ].map((node) => node.textContent)).toEqual(["1.", "1.", "1."]);
  });

  it("renders student blank lines and answer space without teacher answers", () => {
    paper = makePaper();
    view = "student";

    const { container } = renderCanvas();

    expect(container.querySelector(".answer-space")).toBeInTheDocument();
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
