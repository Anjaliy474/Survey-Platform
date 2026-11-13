import { describe, expect, it } from "vitest";
import { makeQuestion } from "./fixtures";
import { plainSeconds, storySeconds } from "./timing";

const six = [
  makeQuestion("Q1", "single_choice"),
  makeQuestion("Q2", "rating_scale", "How satisfied were you?", []),
  makeQuestion("Q3", "multi_choice"),
  makeQuestion("Q4", "yes_no", "Did you go?", ["Yes", "No"]),
  makeQuestion("Q5", "nps_0_10", "How likely to recommend?", []),
  makeQuestion("Q6", "long_text", "Anything else?", []),
];

describe("plainSeconds", () => {
  it("counts 10 s per closed and 45 s per open question", () => {
    expect(plainSeconds(six)).toBe(95);
  });
});

describe("storySeconds", () => {
  it("adds title card and ending, no interludes at Light", () => {
    expect(storySeconds(six, 4, "light")).toBe(110);
  });
  it("adds 2 s per interlude at Medium", () => {
    expect(storySeconds(six, 4, "medium")).toBe(116);
  });
  it("adds the prologue at Full", () => {
    expect(storySeconds(six, 4, "full")).toBe(120);
  });
  it("has no interludes with a single chapter", () => {
    expect(storySeconds(six, 1, "medium")).toBe(110);
  });
});
