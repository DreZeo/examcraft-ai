import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import { MarkdownFormatProvider } from "../../components/layout/MarkdownFormatContext";
import { PaperToolbar } from "../../components/layout/PaperToolbar";
import { QuestionEditModal } from "../../components/paper/QuestionEditModal";
import type { SingleChoiceQuestion } from "../types/exam";

const editQuestion = vi.fn();
const updateSettings = vi.fn();

vi.mock("../../stores/configStore", () => ({
  useConfigStore: (selector: (state: unknown) => unknown) =>
    selector({
      config: {
        settings: {
          paperFont: "default",
          paperFontSize: "xiaosi",
          paperLineHeight: "standard",
          paperMargin: "standard",
          paperSize: "a4",
        },
      },
      updateSettings,
    }),
}));

vi.mock("../../stores/paperStore", () => ({
  usePaperStore: (selector: (state: unknown) => unknown) =>
    selector({
      paper: {
        version: 1,
        title: "测试卷",
        questions: [currentQuestion],
      },
      editQuestion,
    }),
}));

const question: SingleChoiceQuestion = {
  id: "q1",
  type: "single-choice",
  content: "choose one",
  options: ["A", "B"],
  correctAnswer: 0,
  score: 5,
};
let currentQuestion = question;

beforeEach(() => {
  currentQuestion = question;
  editQuestion.mockClear();
  updateSettings.mockClear();
});

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

function renderToolbarWithPreviewSelection({
  content = "choose one",
  rendered,
}: {
  content?: string;
  rendered?: React.ReactNode;
} = {}) {
  currentQuestion = { ...question, content };
  return render(
    <MarkdownFormatProvider>
      <PaperToolbar />
      <div
        className="question-block"
        data-question-id="q1"
      >
        <div data-markdown-source="content" data-markdown-text={content}>
          {rendered ?? <span>choose one</span>}
        </div>
      </div>
    </MarkdownFormatProvider>,
  );
}

async function openMarkdownTab() {
  await userEvent.click(screen.getByRole("tab", { name: "标记" }));
}

describe("PaperToolbar Markdown tab", () => {
  it("uses Word-like paper layout controls without text alignment", async () => {
    renderToolbarWithEditor();

    expect(screen.getByLabelText("字号")).toHaveTextContent("小四");
    expect(screen.getByLabelText("字体")).toHaveTextContent("默认");
    await userEvent.click(screen.getByRole("button", { name: "字体" }));
    expect(screen.getByRole("option", { name: "宋体" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "微软雅黑" })).toBeInTheDocument();
    expect(screen.getByLabelText("纸张大小")).toHaveTextContent("A4");
    expect(screen.queryByRole("group", { name: "对齐" })).not.toBeInTheDocument();
  });

  it("updates the Word-like paper size setting", async () => {
    renderToolbarWithEditor();

    await userEvent.click(screen.getByRole("button", { name: "纸张大小" }));
    await userEvent.click(screen.getByRole("option", { name: "B5" }));

    expect(updateSettings).toHaveBeenCalledWith({ paperSize: "b5" });
  });

  it("uses a primary-color sliding indicator for layout and Markdown tabs", async () => {
    const { container } = renderToolbarWithEditor();
    const indicator = container.querySelector(
      "[data-testid='paper-toolbar-tab-indicator']",
    );

    expect(indicator).toHaveClass("bg-primary");
    expect(indicator).toHaveClass("translate-x-0");
    expect(screen.getByRole("tab", { name: "排版" }))
      .toHaveAttribute("aria-selected", "true");

    await openMarkdownTab();

    expect(indicator).toHaveClass("translate-x-full");
    expect(screen.getByRole("tab", { name: "标记" }))
      .toHaveAttribute("aria-selected", "true");
  });

  it("covers the toolbar while the question editor modal is open", () => {
    renderToolbarWithEditor(true);

    const toolbar = screen.getByRole("region", { name: "试卷排版工具栏" });
    const overlay = screen.getByRole("dialog", { name: "编辑题目" })
      .parentElement;

    expect(toolbar).toHaveClass("z-10");
    expect(overlay).toHaveClass("z-50");
  });

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

  it("toggles selected editor text Markdown syntax from the top toolbar", async () => {
    renderToolbarWithEditor(true);
    const textarea = screen.getByPlaceholderText("输入题干，支持 Markdown 与 $公式$");
    textarea.focus();
    (textarea as HTMLTextAreaElement).setSelectionRange(0, 6);

    await openMarkdownTab();
    await userEvent.click(screen.getByRole("button", { name: "加粗" }));

    expect(textarea).toHaveValue("**choose** one");

    (textarea as HTMLTextAreaElement).setSelectionRange(2, 8);
    await userEvent.click(screen.getByRole("button", { name: "加粗" }));

    expect(textarea).toHaveValue("choose one");
  });

  it("keeps the editor selection active when switching to the Markdown tab", async () => {
    renderToolbarWithEditor(true);
    const textarea = screen.getByPlaceholderText("输入题干，支持 Markdown 与 $公式$");
    textarea.focus();
    (textarea as HTMLTextAreaElement).setSelectionRange(0, 6);

    await openMarkdownTab();

    expect(textarea).toHaveFocus();
    expect(screen.getByRole("button", { name: "加粗" })).not.toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "加粗" }));

    expect(textarea).toHaveValue("**choose** one");
  });

  it("formats selected paper-preview stem text when no editor modal is open", async () => {
    renderToolbarWithPreviewSelection();
    selectText(screen.getByText("choose one").firstChild, 0, 6);
    document.dispatchEvent(new Event("selectionchange"));

    await openMarkdownTab();
    window.getSelection()?.removeAllRanges();
    document.dispatchEvent(new Event("selectionchange"));

    expect(screen.getByRole("button", { name: "加粗" })).not.toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "加粗" }));

    expect(editQuestion).toHaveBeenCalledWith({
      ...question,
      content: "**choose** one",
    });
  });

  it("toggles bold off from selected rendered paper-preview text", async () => {
    renderToolbarWithPreviewSelection({
      content: "**choose** one",
      rendered: (
        <p>
          <strong>choose</strong> one
        </p>
      ),
    });
    selectText(screen.getByText("choose").firstChild, 0, 6);
    document.dispatchEvent(new Event("selectionchange"));

    await openMarkdownTab();
    await userEvent.click(screen.getByRole("button", { name: "加粗" }));

    expect(editQuestion).toHaveBeenCalledWith({
      ...question,
      content: "choose one",
    });
  });

  it("applies italic to selected rendered paper-preview text", async () => {
    renderToolbarWithPreviewSelection({
      content: "**choose** one",
      rendered: (
        <p>
          <strong>choose</strong> one
        </p>
      ),
    });
    selectText(screen.getByText("choose").firstChild, 0, 6);
    document.dispatchEvent(new Event("selectionchange"));

    await openMarkdownTab();
    await userEvent.click(screen.getByRole("button", { name: "斜体" }));

    expect(editQuestion).toHaveBeenCalledWith({
      ...question,
      content: "***choose*** one",
    });
  });

  it("clears Markdown syntax from selected rendered paper-preview text", async () => {
    renderToolbarWithPreviewSelection({
      content: "**++choose++** one",
      rendered: (
        <p>
          <strong>
            <u>choose</u>
          </strong>{" "}
          one
        </p>
      ),
    });
    selectText(screen.getByText("choose").firstChild, 0, 6);
    document.dispatchEvent(new Event("selectionchange"));

    await openMarkdownTab();
    await userEvent.click(screen.getByRole("button", { name: "清除格式" }));

    expect(editQuestion).toHaveBeenCalledWith({
      ...question,
      content: "choose one",
    });
  });

  it("keeps Markdown buttons usable after refocusing the question editor", async () => {
    renderToolbarWithEditor(true);
    const textarea = screen.getByPlaceholderText("输入题干，支持 Markdown 与 $公式$");

    await openMarkdownTab();
    expect(screen.getByRole("button", { name: "加粗" })).not.toBeDisabled();

    textarea.focus();
    (textarea as HTMLTextAreaElement).setSelectionRange(7, 10);

    expect(screen.getByRole("button", { name: "下划线" })).not.toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "下划线" }));

    expect(textarea).toHaveValue("choose ++one++");
  });

  it("clears Markdown syntax from selected editor text", async () => {
    renderToolbarWithEditor(true);
    const textarea = screen.getByPlaceholderText("输入题干，支持 Markdown 与 $公式$");

    textarea.focus();
    (textarea as HTMLTextAreaElement).setSelectionRange(0, 6);
    await openMarkdownTab();
    await userEvent.click(screen.getByRole("button", { name: "加粗" }));
    (textarea as HTMLTextAreaElement).setSelectionRange(2, 8);
    await userEvent.click(screen.getByRole("button", { name: "下划线" }));

    expect(textarea).toHaveValue("**++choose++** one");

    (textarea as HTMLTextAreaElement).setSelectionRange(4, 10);
    await userEvent.click(screen.getByRole("button", { name: "清除格式" }));

    expect(textarea).toHaveValue("choose one");
  });
});

function selectText(node: ChildNode | null, start: number, end: number) {
  if (!node) throw new Error("Missing text node");
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
