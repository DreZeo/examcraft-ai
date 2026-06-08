import { describe, expect, it } from "vitest";
import { computeWorkbenchScale, getWorkbenchStyle } from "../../App";

describe("computeWorkbenchScale", () => {
  it("keeps the workbench at native scale when the viewport fits the base size", () => {
    expect(computeWorkbenchScale(1280, 800)).toBe(1);
    expect(computeWorkbenchScale(1600, 1000)).toBe(1);
    expect(computeWorkbenchScale(1280, 900)).toBe(1);
  });

  it("scales the whole workbench down proportionally when the viewport is smaller", () => {
    expect(computeWorkbenchScale(960, 800)).toBeCloseTo(0.75);
    expect(computeWorkbenchScale(1280, 600)).toBeCloseTo(0.75);
    expect(computeWorkbenchScale(900, 600)).toBeCloseTo(900 / 1280);
  });

  it("lets full-size workbenches fill the viewport instead of pinning height to 800px", () => {
    expect(getWorkbenchStyle(1, { width: 1600, height: 1000 })).toEqual({
      width: "100%",
      height: "100%",
    });
  });

  it("expands the scaled canvas height so the transformed workbench fills the viewport", () => {
    const scale = computeWorkbenchScale(960, 1000);
    const style = getWorkbenchStyle(scale, { width: 960, height: 1000 });

    expect(style).toEqual({
      width: 1280,
      height: 1000 / 0.75,
      transform: "scale(0.75)",
    });
    expect(Number(style.height) * scale).toBeCloseTo(1000);
  });

  it("keeps the fixed base height when both viewport dimensions are smaller", () => {
    expect(getWorkbenchStyle(0.75, { width: 960, height: 600 })).toEqual({
      width: 1280,
      height: 800,
      transform: "scale(0.75)",
    });
  });
});
