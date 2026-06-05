import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import { ExportMenu } from "../../components/layout/ExportMenu";

const mocks = vi.hoisted(() => ({
  setView: vi.fn(),
  replacePaper: vi.fn(),
  exportJson: vi.fn(),
  exportMarkdown: vi.fn(),
  importJson: vi.fn(),
}));

vi.mock("../../stores/paperStore", () => ({
  usePaperStore: (selector: (state: unknown) => unknown) =>
    selector({
      paper: {
        version: 1,
        title: "测试卷",
        questions: [],
      },
      setView: mocks.setView,
      replacePaper: mocks.replacePaper,
    }),
}));

vi.mock("../../stores/configStore", () => ({
  useConfigStore: (selector: (state: unknown) => unknown) =>
    selector({ dataDir: "E:\\tmp" }),
}));

vi.mock("../../lib/export/exportFile", () => ({
  exportJson: mocks.exportJson,
  exportMarkdown: mocks.exportMarkdown,
  importJson: mocks.importJson,
}));

describe("ExportMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("labels PDF as the WYSIWYG export and Markdown as a text backup", async () => {
    const user = userEvent.setup();
    render(<ExportMenu />);

    await user.click(screen.getByRole("button", { name: /导出/ }));

    expect(screen.getByText("PDF / 打印（所见即所得）")).toBeInTheDocument();
    expect(screen.getByText("Markdown 文本备份")).toBeInTheDocument();
  });

  it("switches to teacher view before printing the teacher PDF", async () => {
    const user = userEvent.setup();
    render(<ExportMenu />);

    await user.click(screen.getByRole("button", { name: /导出/ }));
    const teacherButtons = screen.getAllByRole("menuitem", { name: "教师版" });
    await user.click(teacherButtons[0]);

    expect(mocks.setView).toHaveBeenCalledWith("teacher");
    await waitFor(() => expect(window.print).toHaveBeenCalled());
  });

  it("switches to student view before printing the student PDF", async () => {
    const user = userEvent.setup();
    render(<ExportMenu />);

    await user.click(screen.getByRole("button", { name: /导出/ }));
    const studentButtons = screen.getAllByRole("menuitem", { name: "学生版" });
    await user.click(studentButtons[0]);

    expect(mocks.setView).toHaveBeenCalledWith("student");
    await waitFor(() => expect(window.print).toHaveBeenCalled());
  });
});
