import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import { ResultCard } from "../../components/assistant/ResultCard";

const mocks = vi.hoisted(() => ({
  applyResult: vi.fn(),
  undoResult: vi.fn(),
}));

vi.mock("../../stores/assistantStore", () => ({
  useAssistantStore: (selector: (state: unknown) => unknown) =>
    selector({
      applyResult: mocks.applyResult,
      undoResult: mocks.undoResult,
    }),
}));

describe("ResultCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies an unapplied result", async () => {
    const user = userEvent.setup();
    render(
      <ResultCard
        id="card-1"
        prose=""
        operations={[]}
        applied={false}
        undoable={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "应用到试卷" }));

    expect(mocks.applyResult).toHaveBeenCalledWith("card-1");
    expect(screen.queryByRole("button", { name: "撤销" })).not.toBeInTheDocument();
  });

  it("shows undo only for the current undoable applied result", async () => {
    const user = userEvent.setup();
    render(
      <ResultCard
        id="card-1"
        prose=""
        operations={[]}
        applied
        undoable
      />,
    );

    expect(screen.getByText("已应用到试卷")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "撤销" }));

    expect(mocks.undoResult).toHaveBeenCalledWith("card-1");
  });

  it("does not expose undo for historical applied results", () => {
    render(
      <ResultCard
        id="card-1"
        prose=""
        operations={[]}
        applied
        undoable={false}
      />,
    );

    expect(screen.getByText("已应用到试卷")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "撤销" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "应用到试卷" }),
    ).not.toBeInTheDocument();
  });
});
