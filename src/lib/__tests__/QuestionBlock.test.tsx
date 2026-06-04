import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "../../i18n";
import { QuestionBlock } from "../../components/paper/QuestionBlock";
import type { CalculationQuestion, SingleChoiceQuestion } from "../types/exam";

vi.mock("../../stores/paperStore", () => ({
  usePaperStore: () => ({
    reorder: vi.fn(),
    deleteQuestion: vi.fn(),
  }),
}));

vi.mock("../../stores/assistantStore", () => ({
  useAssistantStore: () => vi.fn(),
}));

describe("QuestionBlock", () => {
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

    const { container } = render(
      <QuestionBlock
        question={question}
        index={0}
        studentView={false}
        onEdit={vi.fn()}
      />,
    );

    expect(container.querySelector("strong")?.textContent).toBe("one");
    expect(screen.getByText("Bold")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("bold")).toBeInTheDocument();
    expect(container).toHaveTextContent("Because bold uses Markdown.");
    expect(container.querySelector(".answer-block")).toBeInTheDocument();
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

    const { rerender } = render(
      <QuestionBlock
        question={question}
        index={0}
        studentView={false}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText((content) => content.includes("解题步骤")))
      .toBeInTheDocument();
    expect(screen.getByText("Add the terms")).toBeInTheDocument();
    expect(screen.getByText("Simple arithmetic.")).toBeInTheDocument();

    rerender(
      <QuestionBlock
        question={question}
        index={0}
        studentView={true}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.queryByText((content) => content.includes("解题步骤")))
      .not.toBeInTheDocument();
    expect(screen.queryByText("Add the terms")).not.toBeInTheDocument();
    expect(screen.queryByText("Simple arithmetic.")).not.toBeInTheDocument();
  });
});
