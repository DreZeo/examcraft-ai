import { beforeEach, describe, expect, it } from "vitest";
import type { ChatMessage } from "../types/library";
import type { ExamPaper, Question } from "../types/exam";
import { useAssistantStore } from "../../stores/assistantStore";
import { useConfigStore } from "../../stores/configStore";
import { usePaperStore } from "../../stores/paperStore";

function singleChoice(id: string): Question {
  return {
    id,
    type: "single-choice",
    content: `Question ${id}`,
    options: ["A", "B"],
    correctAnswer: 0,
    score: 5,
  };
}

function paper(questions: Question[] = []): ExamPaper {
  return { version: 1, title: "Test", questions };
}

function resultMessage(
  id: string,
  question: Question,
  applied = false,
): ChatMessage {
  return {
    id,
    kind: "result",
    prose: "",
    operations: [{ type: "appendQuestions", questions: [question] }],
    applied,
  };
}

describe("assistantStore AI result apply undo", () => {
  beforeEach(() => {
    useConfigStore.setState({ dataDir: null });
    usePaperStore.setState({
      paper: paper(),
      undoSnapshot: null,
      activePaperId: "paper-1",
      saveStatus: "saved",
    });
    useAssistantStore.getState().reset();
  });

  it("reopens the same result for apply after undo", () => {
    const generated = singleChoice("q-ai");
    useAssistantStore.setState({
      messages: [resultMessage("card-1", generated)],
      undoableResultId: null,
    });

    useAssistantStore.getState().applyResult("card-1");

    expect(usePaperStore.getState().paper.questions.map((q) => q.id)).toEqual([
      "q-ai",
    ]);
    expect(
      (useAssistantStore.getState().messages[0] as Extract<
        ChatMessage,
        { kind: "result" }
      >).applied,
    ).toBe(true);
    expect(useAssistantStore.getState().undoableResultId).toBe("card-1");

    useAssistantStore.getState().undoResult("card-1");

    expect(usePaperStore.getState().paper.questions).toEqual([]);
    expect(
      (useAssistantStore.getState().messages[0] as Extract<
        ChatMessage,
        { kind: "result" }
      >).applied,
    ).toBe(false);
    expect(useAssistantStore.getState().undoableResultId).toBeNull();

    useAssistantStore.getState().applyResult("card-1");

    expect(usePaperStore.getState().paper.questions.map((q) => q.id)).toEqual([
      "q-ai",
    ]);
    expect(
      (useAssistantStore.getState().messages[0] as Extract<
        ChatMessage,
        { kind: "result" }
      >).applied,
    ).toBe(true);
  });

  it("only lets the current undoable result be undone", () => {
    useAssistantStore.setState({
      messages: [
        resultMessage("card-1", singleChoice("q1")),
        resultMessage("card-2", singleChoice("q2")),
      ],
      undoableResultId: null,
    });

    useAssistantStore.getState().applyResult("card-1");
    useAssistantStore.getState().applyResult("card-2");
    useAssistantStore.getState().undoResult("card-1");

    expect(usePaperStore.getState().paper.questions.map((q) => q.id)).toEqual([
      "q1",
      "q2",
    ]);
    expect(useAssistantStore.getState().undoableResultId).toBe("card-2");
  });
});
