import { describe, expect, it } from "vitest";
import { contrastRatio, passingShade, sensitiveBriefHint } from "./contrast";

describe("contrastRatio", () => {
  it("is 21 for white on black", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });
  it("matches the persimmon-600 token on white", () => {
    expect(Math.abs(contrastRatio("#C4461B", "#ffffff") - 4.95)).toBeLessThan(0.06);
  });
});

describe("passingShade", () => {
  it("darkens marigold until it passes on white", () => {
    const shade = passingShade("#FFC233", "#ffffff");
    expect(contrastRatio(shade, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps a colour that already passes", () => {
    expect(passingShade("#22192E", "#ffffff").toLowerCase()).toBe("#22192e");
  });
});

describe("sensitiveBriefHint", () => {
  it("does not flag a price question", () => {
    expect(sensitiveBriefHint("Should our café raise prices?")).toBe(false);
  });
  it("flags workplace topics", () => {
    expect(sensitiveBriefHint("Workplace stress check-in")).toBe(true);
  });
});
