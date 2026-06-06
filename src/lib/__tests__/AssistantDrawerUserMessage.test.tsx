import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import { AssistantDrawer } from "../../components/assistant/AssistantDrawer";
import type { ChatMessage } from "../types/library";

const mocks = vi.hoisted(() => ({
  resendUserMessage: vi.fn(),
  editAndResendUserMessage: vi.fn(),
  sendMessage: vi.fn(),
  stop: vi.fn(),
  clearFocus: vi.fn(),
  newSession: vi.fn(),
  openSession: vi.fn(),
  renameSession: vi.fn(),
  deleteSession: vi.fn(),
}));

let assistantState: Record<string, unknown>;

vi.mock("../../components/assistant/ChatHistoryPanel", () => ({
  ChatHistoryPanel: () => null,
}));

vi.mock("../../stores/configStore", () => ({
  useConfigStore: (selector: (state: unknown) => unknown) =>
    selector({
      activeConfig: () => ({
        id: "model-1",
        name: "Test Model",
        baseUrl: "https://example.test/v1",
        model: "test-model",
      }),
    }),
}));

vi.mock("../../stores/assistantStore", () => ({
  useAssistantStore: (selector: (state: unknown) => unknown) =>
    selector(assistantState),
}));

function userMessage(content = "生成一份英语试卷"): ChatMessage {
  return {
    id: "user-1",
    kind: "text",
    role: "user",
    content,
    apiHistoryIndex: 0,
    requestContext: { kind: "plain" },
  };
}

function renderDrawer(message: ChatMessage = userMessage()) {
  assistantState = {
    messages: [message],
    status: "idle",
    streamBuffer: "",
    focusedQuestion: null,
    undoableResultId: null,
    resendUserMessage: mocks.resendUserMessage,
    editAndResendUserMessage: mocks.editAndResendUserMessage,
    sendMessage: mocks.sendMessage,
    stop: mocks.stop,
    clearFocus: mocks.clearFocus,
    newSession: mocks.newSession,
    openSession: mocks.openSession,
    renameSession: mocks.renameSession,
    deleteSession: mocks.deleteSession,
    sessions: [],
    activeSessionId: null,
  };

  return render(
    <AssistantDrawer
      open
      onToggle={vi.fn()}
      onOpenSettings={vi.fn()}
    />,
  );
}

describe("AssistantDrawer user message actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollTo = vi.fn();
    mocks.resendUserMessage.mockResolvedValue({ ok: true });
    mocks.editAndResendUserMessage.mockResolvedValue({ ok: true });
  });

  it("retries a user message from the bubble action", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "重试" }));

    expect(mocks.resendUserMessage).toHaveBeenCalledWith("user-1");
  });

  it("edits a user message inline and resends it", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "编辑消息" }));
    const editor = screen.getByRole("textbox", { name: "编辑消息" });
    await user.clear(editor);
    await user.type(editor, "生成一份英语完形填空");
    await user.click(screen.getByRole("button", { name: "重新发送" }));

    expect(mocks.editAndResendUserMessage).toHaveBeenCalledWith(
      "user-1",
      "生成一份英语完形填空",
    );
  });

  it("cancels inline editing", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "编辑消息" }));
    expect(screen.getByRole("textbox", { name: "编辑消息" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(screen.queryByRole("textbox", { name: "编辑消息" })).not.toBeInTheDocument();
    expect(screen.getByText("生成一份英语试卷")).toBeInTheDocument();
  });

  it("shows a warning when retry is blocked by an applied result", async () => {
    const user = userEvent.setup();
    mocks.resendUserMessage.mockResolvedValue({
      ok: false,
      reason: "appliedResultAfter",
    });
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "重试" }));

    expect(
      await screen.findByText(/这条消息之后已有结果应用到试卷/),
    ).toBeInTheDocument();
  });
});
