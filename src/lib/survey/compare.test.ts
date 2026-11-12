import { describe, expect, it } from "vitest";
import { assignArm } from "./ab";
import { compareArms } from "./compare";
import { sixQuestions } from "./fixtures";
import type { Answer, Arm, ResponseRecord } from "./types";

const questions = sixQuestions();
let seq = 0;

function resp(arm: Arm, q1: number, extra: Partial<ResponseRecord> = {}): ResponseRecord {
  seq += 1;
  const answers: Record<string, Answer> = { Q1: q1, Q2: 3, Q3: [0, 1], Q4: 0, Q5: 9, Q6: "ok" };
  return {
    id: `R${seq}`,
    surveyId: "S1",
    arm,
    switchedToPlain: false,
    answers,
    startedAt: "2026-11-14T10:00:00.000Z",
    completedAt: "2026-11-14T10:01:40.000Z",
    enjoyment: 4,
    visitorId: `V${seq}`,
    ...extra,
  };
}
const many = (n: number, arm: Arm, q1: (i: number) => number) => Array.from({ length: n }, (_, i) => resp(arm, q1(i)));

function noNaN(value: unknown): void {
  if (typeof value === "number") expect(Number.isNaN(value)).toBe(false);
  else if (value && typeof value === "object") Object.values(value).forEach(noNaN);
}

describe("compareArms", () => {
  it("is not enough below 30 per arm", () => {
    const out = compareArms([...many(29, "story", (i) => i % 3), ...many(40, "plain", (i) => i % 3)], questions);
    expect(out.enough).toBe(false);
    expect(out.shifts).toEqual([]);
  });

  it("handles an empty arm without NaN", () => {
    const out = compareArms(many(40, "story", (i) => i % 3), questions);
    expect(out.plain.n).toBe(0);
    expect(out.plain.enjoymentMean).toBeNull();
    expect(out.enough).toBe(false);
    noNaN(out);
  });

  it("finds no shift for identical distributions", () => {
    const out = compareArms([...many(40, "story", (i) => i % 3), ...many(40, "plain", (i) => i % 3)], questions);
    expect(out.enough).toBe(true);
    expect(out.shifts.every((s) => !s.differs)).toBe(true);
    expect(out.shifts.map((s) => s.questionId)).not.toContain("Q6");
  });

  it("flags a question whose answers flip between arms", () => {
    const out = compareArms([...many(40, "story", () => 0), ...many(40, "plain", () => 1)], questions);
    const q1 = out.shifts.find((s) => s.questionId === "Q1");
    expect(q1?.differs).toBe(true);
    expect(q1!.pAdjusted).toBeLessThan(0.05);
  });

  it("counts switchers in the story arm and in switches", () => {
    const rs = [resp("story", 0, { switchedToPlain: true }), resp("plain", 0)];
    const out = compareArms(rs, questions);
    expect(out.story.n).toBe(1);
    expect(out.story.switches).toBe(1);
    expect(out.plain.switches).toBe(0);
  });

  it("computes completion and median time", () => {
    const rs = [resp("story", 0), resp("story", 1, { completedAt: null }), resp("story", 2)];
    const out = compareArms(rs, questions);
    expect(out.story.completed).toBe(2);
    expect(out.story.completionPct).toBe(67);
    expect(out.story.medianSeconds).toBe(100);
  });
});

describe("assignArm", () => {
  it("always gives the story when the split is off", () => {
    expect(assignArm(false, () => 0.9)).toBe("story");
  });
  it("splits 50/50 when on", () => {
    expect(assignArm(true, () => 0.2)).toBe("story");
    expect(assignArm(true, () => 0.7)).toBe("plain");
  });
});
