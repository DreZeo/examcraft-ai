import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "../../i18n";
import { MarkdownFormatProvider } from "../../components/layout/MarkdownFormatContext";
import { QuestionBlock } from "../../components/paper/QuestionBlock";
import type {
  CalculationQuestion,
  EssayQuestion,
  FillInBlankQuestion,
  SingleChoiceQuestion,
} from "../types/exam";

const editQuestion = vi.fn();

vi.mock("../../stores/paperStore", () => ({
  usePaperStore: () => ({
    reorder: vi.fn(),
    deleteQuestion: vi.fn(),
    editQuestion,
  }),
}));

vi.mock("../../stores/assistantStore", () => ({
  useAssistantStore: () => vi.fn(),
}));

describe("QuestionBlock", () => {
  function renderQuestion(
    question:
      | SingleChoiceQuestion
      | CalculationQuestion
      | FillInBlankQuestion
      | EssayQuestion,
    studentView = false,
  ) {
    return render(
      <MarkdownFormatProvider>
        <QuestionBlock
          question={question}
          index={0}
          studentView={studentView}
          onEdit={vi.fn()}
        />
      </MarkdownFormatProvider>,
    );
  }

  it("renders Markdown in options and teacher answer sections", () => {
    const question: SingleChoiceQuestion = {
      id: "q1",
      type: "single-choice",
      content: "Choose **one**",
      options: ["Plain", "**Bold** option with $x^2$"],
      correctAnswer: 1,
      explanation: "Because **bold** uses Markdown.",
      score: 5,
    };

    const { container } = renderQuestion(question);

    expect(container.querySelector("strong")?.textContent).toBe("one");
    expect(screen.getByText("Bold")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("bold")).toBeInTheDocument();
    expect(container).toHaveTextContent("Because bold uses Markdown.");
    expect(container.querySelector(".answer-block")).toBeInTheDocument();
  });

  it("renders custom underline syntax without raw HTML", () => {
    const question: SingleChoiceQuestion = {
      id: "q1",
      type: "single-choice",
      content: "Mark ++important++ text, ++x++, and <u>raw</u> text",
      options: ["A", "B"],
      correctAnswer: 0,
      score: 5,
    };

    const { container } = renderQuestion(question);

    expect([...container.querySelectorAll("u")].map((node) => node.textContent))
      .toEqual(["important", "x"]);
    expect(container).toHaveTextContent("<u>raw</u>");
  });

  it("does not render structured options again when content already includes them", () => {
    const question: SingleChoiceQuestion = {
      id: "q1",
      type: "single-choice",
      content: [
        "下列物质中，属于弱电解质的是（）",
        "A. HCl",
        "B. NaOH",
        "C. CH3COOH",
        "D. NaCl",
      ].join("\n"),
      options: ["HCl", "NaOH", "CH3COOH", "NaCl"],
      correctAnswer: 2,
      score: 4,
    };

    const { container } = renderQuestion(question);

    expect(container).toHaveTextContent("A. HCl");
    expect(container.querySelectorAll("ol ol li")).toHaveLength(0);
  });

  it("does not render structured options again when content includes inline option markers", () => {
    const question: SingleChoiceQuestion = {
      id: "q1",
      type: "single-choice",
      content: "鸦片战争后，中国被迫开放的第一批通商口岸中，位于最北端的是？ A. 广州 B. 厦门 C. 上海 D. 宁波",
      options: ["广州", "厦门", "上海", "宁波"],
      correctAnswer: 2,
      score: 2,
    };

    const { container } = renderQuestion(question);

    expect(container).toHaveTextContent("A. 广州");
    expect(container.querySelectorAll("ol ol li")).toHaveLength(0);
  });

  it("renders calculation solution in teacher view and hides it in student view", () => {
    const question: CalculationQuestion = {
      id: "q2",
      type: "calculation",
      content: "Compute $1 + 1$",
      solution: "1. Add the terms\n2. Result is **2**",
      answer: "$2$",
      explanation: "Simple arithmetic.",
      score: 6,
    };

    const { rerender } = renderQuestion(question);

    expect(screen.getByText((content) => content.includes("解题步骤")))
      .toBeInTheDocument();
    expect(screen.getByText("Add the terms")).toBeInTheDocument();
    expect(screen.getByText("Simple arithmetic.")).toBeInTheDocument();

    rerender(
      <MarkdownFormatProvider>
        <QuestionBlock
          question={question}
          index={0}
          studentView={true}
          onEdit={vi.fn()}
        />
      </MarkdownFormatProvider>,
    );

    expect(screen.queryByText((content) => content.includes("解题步骤")))
      .not.toBeInTheDocument();
    expect(screen.queryByText("Add the terms")).not.toBeInTheDocument();
    expect(screen.queryByText("Simple arithmetic.")).not.toBeInTheDocument();
  });

  it("renders longer fill-in blank lines in student view", () => {
    const question: FillInBlankQuestion = {
      id: "q3",
      type: "fill-in-blank",
      content: "水的化学式是 ___。",
      blanks: ["H2O"],
      score: 4,
    };

    const { container } = renderQuestion(question, true);

    expect(container).toHaveTextContent("水的化学式是 __________。");
  });

  it("adds student answer space for essays", () => {
    const question: EssayQuestion = {
      id: "q4",
      type: "essay",
      content: "请论述水循环的意义。",
      scoringCriteria: "观点明确，论证充分。",
      score: 20,
    };

    const { container } = renderQuestion(question, true);

    expect(container.querySelector(".answer-space")).toBeInTheDocument();
    expect(container.querySelector(".answer-block")).not.toBeInTheDocument();
  });
});
