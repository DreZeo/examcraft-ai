import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "../../i18n";
import { PaperOutline } from "../../components/paper/PaperOutline";

describe("PaperOutline", () => {
  it("stays visible so the scaled workbench can shrink as a whole", () => {
    const { container } = render(
      <PaperOutline
        questions={[]}
        activeQuestionId={null}
        open
        onToggle={vi.fn()}
        onActiveQuestionChange={vi.fn()}
      />,
    );

    const outline = container.querySelector("aside");

    expect(outline).toHaveClass("flex", "w-56", "shrink-0");
    expect(outline).not.toHaveClass("hidden", "lg:flex");
  });
});
