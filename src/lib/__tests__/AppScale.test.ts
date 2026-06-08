import { describe, expect, it } from "vitest";
import { computeWorkbenchScale } from "../../App";

describe("computeWorkbenchScale", () => {
  it("keeps the workbench at native scale when the viewport fits the base size", () => {
    expect(computeWorkbenchScale(1280, 800)).toBe(1);
    expect(computeWorkbenchScale(1600, 1000)).toBe(1);
  });

  it("scales the whole workbench down proportionally when the viewport is smaller", () => {
    expect(computeWorkbenchScale(960, 800)).toBeCloseTo(0.75);
    expect(computeWorkbenchScale(1280, 600)).toBeCloseTo(0.75);
    expect(computeWorkbenchScale(900, 600)).toBeCloseTo(900 / 1280);
  });
});
