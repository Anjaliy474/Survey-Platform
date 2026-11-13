import { describe, expect, it } from "vitest";
import { exclusiveIndex, hasAnswer, toggleMulti } from "./answers";

const opts = ["Music", "Dance", "Quiz", "None of these"];

describe("toggleMulti", () => {
  it("adds and removes picks", () => {
    expect(toggleMulti([], 0, opts)).toEqual([0]);
    expect(toggleMulti([0, 1], 0, opts)).toEqual([1]);
  });
  it("makes None of these exclusive", () => {
    expect(toggleMulti([0, 1], 3, opts)).toEqual([3]);
    expect(toggleMulti([3], 1, opts)).toEqual([1]);
    expect(toggleMulti([3], 3, opts)).toEqual([]);
  });
  it("reports the pick limit", () => {
    expect(toggleMulti([0, 1], 2, opts, 2)).toBe("limit");
  });
});

describe("exclusiveIndex", () => {
  it("finds none-style options", () => {
    expect(exclusiveIndex(opts)).toBe(3);
    expect(exclusiveIndex(["Mon", "I don't usually visit cafés"])).toBe(1);
    expect(exclusiveIndex(["A", "B"])).toBe(-1);
  });
});

describe("hasAnswer", () => {
  it("treats empty text and empty picks as unanswered", () => {
    expect(hasAnswer(undefined)).toBe(false);
    expect(hasAnswer(null)).toBe(false);
    expect(hasAnswer("  ")).toBe(false);
    expect(hasAnswer([])).toBe(false);
    expect(hasAnswer(0)).toBe(true);
    expect(hasAnswer([2])).toBe(true);
  });
});
