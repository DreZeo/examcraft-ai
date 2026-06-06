import { describe, expect, it } from "vitest";
import { applyMarkdownFormat } from "../../components/layout/markdownFormat";

describe("applyMarkdownFormat", () => {
  it("applies italic to selected inline text", () => {
    const result = applyMarkdownFormat("choose one", 0, 6, "italic");

    expect(result.value).toBe("*choose* one");
  });

  it("keeps selected whitespace outside inline Markdown markers", () => {
    const result = applyMarkdownFormat("choose one", 6, 10, "italic");

    expect(result.value).toBe("choose *one*");
  });

  it("toggles italic off from selected inline text", () => {
    const result = applyMarkdownFormat("*choose* one", 1, 7, "italic");

    expect(result.value).toBe("choose one");
  });

  it("applies heading to the whole selected line", () => {
    const result = applyMarkdownFormat("choose one", 7, 10, "heading");

    expect(result.value).toBe("## choose one");
  });

  it("toggles heading off from inside a rendered heading line", () => {
    const result = applyMarkdownFormat("## choose one", 3, 9, "heading");

    expect(result.value).toBe("choose one");
  });

  it("applies unordered and ordered list markers to the whole selected line", () => {
    expect(applyMarkdownFormat("choose one", 7, 10, "bulletList").value)
      .toBe("- choose one");
    expect(applyMarkdownFormat("choose one", 7, 10, "orderedList").value)
      .toBe("1. choose one");
  });

  it("clears line-level Markdown markers from inside the selected line", () => {
    expect(applyMarkdownFormat("- choose one", 2, 8, "clear").value)
      .toBe("choose one");
    expect(applyMarkdownFormat("1. choose one", 3, 9, "clear").value)
      .toBe("choose one");
    expect(applyMarkdownFormat("> choose one", 2, 8, "clear").value)
      .toBe("choose one");
  });

  it("clears nested bold italic markers", () => {
    const result = applyMarkdownFormat("***choose*** one", 3, 9, "clear");

    expect(result.value).toBe("choose one");
  });
});
