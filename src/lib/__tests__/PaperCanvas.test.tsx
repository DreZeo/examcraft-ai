import { render } from "@testing-library/react";
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
    expect([...container.querySelectorAll(".question-block > div > span")]
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
