import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import { PaperCanvas } from "../../components/paper/PaperCanvas";
import type { ExamPaper } from "../types/exam";

let paper: ExamPaper;
let view: "teacher" | "student";

vi.mock("../../stores/paperStore", () => ({
  usePaperStore: () => ({
    paper,
    view,
    addBlankQuestion: vi.fn(),
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
    view = "teacher";
    paper = {
      version: 1,
      title: "测试卷",
      questions: [],
    };
  });

  it("applies Word-like paper size and font size styles", () => {
    const { container } = render(<PaperCanvas />);
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

    const { container } = render(<PaperCanvas />);

    expect(container).toHaveTextContent("一、单选题");
    expect(container).toHaveTextContent("二、填空题");
    expect(container).toHaveTextContent("三、论述题");
    expect([...visiblePages(container)[0].querySelectorAll(".question-block > div > span")]
      .map((node) => node.textContent)).toEqual(["1.", "1.", "1."]);
  });

  it("renders student blank lines and answer space without teacher answers", () => {
    paper = makePaper();
    view = "student";

    const { container } = render(<PaperCanvas />);

    expect(container.querySelector(".answer-space")).toBeInTheDocument();
    expect(container).toHaveTextContent("__________");
    expect(container.querySelector(".answer-block")).not.toBeInTheDocument();
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

    const { container } = render(<PaperCanvas />);

    await waitFor(() => {
      const pages = visiblePages(container);
      expect(pages).toHaveLength(1);
      expect(pages[0]).toHaveTextContent("第二题");
    });
  });
});

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

function visiblePages(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(".paper-page")].filter(
    (page) => !page.closest("[aria-hidden='true']"),
  );
}
