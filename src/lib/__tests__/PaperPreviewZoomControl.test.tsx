import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import { PaperPreviewZoomControl } from "../../components/paper/PaperPreviewZoomControl";
import type { PaperPreviewZoom } from "../types/config";

const updateSettings = vi.fn();
let paperPreviewZoom: PaperPreviewZoom = "pct100";

vi.mock("../../stores/configStore", () => ({
  useConfigStore: (selector: (state: unknown) => unknown) =>
    selector({
      config: {
        settings: {
          paperPreviewZoom,
        },
      },
      updateSettings,
    }),
}));

describe("PaperPreviewZoomControl", () => {
  beforeEach(() => {
    paperPreviewZoom = "pct100";
    updateSettings.mockReset();
    delete document.documentElement.dataset.paperPreviewScale;
  });

  it("renders as a compact inline preview control with the current zoom", () => {
    const { container } = render(<PaperPreviewZoomControl />);

    expect(screen.getByRole("button", { name: "缩放" })).toHaveTextContent(
      "100%",
    );
    expect(container.firstElementChild).toHaveClass("relative");
    expect(container.firstElementChild).toHaveClass("inline-flex");
    expect(container.firstElementChild).not.toHaveClass("absolute");
    expect(container.firstElementChild).not.toHaveClass("no-print");
  });

  it("updates zoom from the plus and minus buttons", async () => {
    render(<PaperPreviewZoomControl />);

    await userEvent.click(screen.getByRole("button", { name: "放大" }));
    expect(updateSettings).toHaveBeenCalledWith({ paperPreviewZoom: "pct125" });

    await userEvent.click(screen.getByRole("button", { name: "缩小" }));
    expect(updateSettings).toHaveBeenCalledWith({ paperPreviewZoom: "pct75" });
  });

  it("uses the current auto-fit scale when stepping from an adaptive zoom", async () => {
    paperPreviewZoom = "fitWidth";
    document.documentElement.dataset.paperPreviewScale = "0.82";
    render(<PaperPreviewZoomControl />);

    await userEvent.click(screen.getByRole("button", { name: "放大" }));

    expect(updateSettings).toHaveBeenCalledWith({ paperPreviewZoom: "pct100" });
  });

  it("opens a compact preset menu from the percent button", async () => {
    render(<PaperPreviewZoomControl />);

    await userEvent.click(screen.getByRole("button", { name: "缩放" }));
    expect(screen.getAllByRole("option").map((node) => node.textContent)).toEqual([
      "适合页宽",
      "整页",
      "50%",
      "75%",
      "100%",
      "125%",
      "150%",
      "200%",
    ]);

    await userEvent.click(screen.getByRole("option", { name: "整页" }));
    expect(updateSettings).toHaveBeenCalledWith({ paperPreviewZoom: "fitPage" });
  });
});
