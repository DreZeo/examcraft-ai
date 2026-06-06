import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import { TopBar } from "../../components/layout/TopBar";
import type { ViewMode } from "../../stores/paperStore";

const mocks = vi.hoisted(() => ({
  setTitle: vi.fn(),
  setView: vi.fn(),
  newPaper: vi.fn(),
}));

let view: ViewMode;

vi.mock("../../components/layout/ExportMenu", () => ({
  ExportMenu: () => <button type="button">导出</button>,
}));

vi.mock("../../stores/paperStore", () => ({
  usePaperStore: (selector: (state: unknown) => unknown) =>
    selector({
      paper: {
        title: "测试卷",
        questions: [{ id: "q1" }],
      },
      setTitle: mocks.setTitle,
      saveStatus: "saved",
      view,
      setView: mocks.setView,
      newPaper: mocks.newPaper,
    }),
}));

describe("TopBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    view = "teacher";
  });

  it("renders teacher/student as an animated segmented view switch", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TopBar onOpenSettings={vi.fn()} onOpenPaperManager={vi.fn()} />,
    );

    expect(screen.getByRole("group", { name: "视图模式" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "教师视图" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "学生预览" }))
      .toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "学生预览" }));

    expect(mocks.setView).toHaveBeenCalledWith("student");
    expect(screen.getByRole("button", { name: "学生预览" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector("[data-testid='view-toggle-indicator']"))
      .toHaveClass("translate-x-full");
  });
});
