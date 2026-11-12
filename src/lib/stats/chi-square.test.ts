import { describe, expect, it } from "vitest";
import { chiSquare, holm } from "./chi-square";

describe("chiSquare", () => {
  it("computes a 2×2 test", () => {
    const r = chiSquare([
      [10, 20],
      [20, 10],
    ]);
    expect(r).not.toBeNull();
    expect(r!.statistic).toBeCloseTo(6.667, 2);
    expect(r!.df).toBe(1);
    expect(Math.abs(r!.p - 0.0098)).toBeLessThan(0.0005);
  });

  it("returns null when a row is empty", () => {
    expect(
      chiSquare([
        [0, 0],
        [5, 5],
      ]),
    ).toBeNull();
  });

  it("drops empty columns before testing", () => {
    const r = chiSquare([
      [10, 20, 0],
      [20, 10, 0],
    ]);
    expect(r!.df).toBe(1);
  });
});

describe("holm", () => {
  it("adjusts p-values step-down and keeps order", () => {
    const out = holm([0.01, 0.04, 0.03]);
    expect(out[0]).toBeCloseTo(0.03, 10);
    expect(out[1]).toBeCloseTo(0.06, 10);
    expect(out[2]).toBeCloseTo(0.06, 10);
  });
});
