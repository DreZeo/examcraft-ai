import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import "../../i18n";
import { MarkdownFormatProvider } from "../../components/layout/MarkdownFormatContext";
import { PaperToolbar } from "../../components/layout/PaperToolbar";
import { QuestionEditModal } from "../../components/paper/QuestionEditModal";
import type { SingleChoiceQuestion } from "../types/exam";

const editQuestion = vi.fn();

vi.mock("../../stores/configStore", () => ({
  useConfigStore: (selector: (state: unknown) => unknown) =>
    selector({
      config: {
        settings: {
          paperFont: "default",
          paperFontSize: "standard",
          paperLineHeight: "standard",
          paperTextAlign: "left",
          paperMargin: "standard",
        },
      },
      updateSettings: vi.fn(),
    }),
}));

vi.mock("../../stores/paperStore", () => ({
  usePaperStore: (selector: (state: { editQuestion: typeof editQuestion }) => unknown) =>
    selector({ editQuestion }),
}));

const question: SingleChoiceQuestion = {
  id: "q1",
  type: "single-choice",
  content: "choose one",
  options: ["A", "B"],
  correctAnswer: 0,
  score: 5,
};

function renderToolbarWithEditor(editorOpen = false) {
  return render(
    <MarkdownFormatProvider>
      <PaperToolbar />
      {editorOpen && (
        <QuestionEditModal question={question} onClose={vi.fn()} />
      )}
    </MarkdownFormatProvider>,
  );
}

async function openMarkdownTab() {
  await userEvent.click(screen.getByRole("tab", { name: "Markdown" }));
}

describe("PaperToolbar Markdown tab", () => {
  it("disables Markdown buttons when no question editor is open", async () => {
    renderToolbarWithEditor();

    await openMarkdownTab();

    expect(screen.getByRole("button", { name: "加粗" })).toBeDisabled();
  });

  it("enables Markdown buttons when a question editor is open", async () => {
    renderToolbarWithEditor(true);

    await openMarkdownTab();

    expect(screen.getByRole("button", { name: "加粗" })).not.toBeDisabled();
  });

  it("wraps selected editor text with Markdown syntax from the top toolbar", async () => {
    renderToolbarWithEditor(true);
    const textarea = screen.getByPlaceholderText("输入题干，支持 Markdown 与 $公式$");
    textarea.focus();
    (textarea as HTMLTextAreaElement).setSelectionRange(0, 6);

    await openMarkdownTab();
    await userEvent.click(screen.getByRole("button", { name: "加粗" }));

    expect(textarea).toHaveValue("**choose** one");

    (textarea as HTMLTextAreaElement).setSelectionRange(2, 8);
    await userEvent.click(screen.getByRole("button", { name: "下划线" }));

    expect(textarea).toHaveValue("**++choose++** one");
  });
});
