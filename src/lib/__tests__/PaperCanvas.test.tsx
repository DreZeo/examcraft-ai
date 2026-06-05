import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import "../../i18n";
import { PaperCanvas } from "../../components/paper/PaperCanvas";

vi.mock("../../stores/paperStore", () => ({
  usePaperStore: () => ({
    paper: {
      version: 1,
      title: "测试卷",
      questions: [],
    },
    view: "teacher",
    addBlankQuestion: vi.fn(),
  }),
}));

vi.mock("../../stores/configStore", () => ({
  useConfigStore: (selector: (state: unknown) => unknown) =>
    selector({
      config: {
        settings: {
          paperFont: "fangsong",
          paperFontSize: "sihao",
          paperLineHeight: "standard",
          paperMargin: "standard",
          paperSize: "b5",
        },
      },
    }),
}));

describe("PaperCanvas", () => {
  it("applies Word-like paper size and font size styles", () => {
    const { container } = render(<PaperCanvas />);
    const sheet = container.querySelector(".paper-sheet");

    expect(sheet).toHaveStyle({
      fontSize: "14pt",
      width: "176mm",
      maxWidth: "176mm",
      minHeight: "250mm",
    });
    expect(sheet).not.toHaveStyle({ textAlign: "justify" });
  });
});
