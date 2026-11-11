import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateWorld } from "@/lib/story/validate-world";
import { gamifierFor, sixQuestions, validWorld } from "@/lib/survey/fixtures";
import { gamifierSchema, questionSetSchema, worldSpecSchema, type QuestionSet, type QuickPicks } from "@/lib/survey/types";
import { AiError } from "./gemini";
import { PREPARED, findPrepared } from "./prepared";
import { buildWorld, shapeQuestions } from "./stages";

const picks = (concept: string): QuickPicks => ({
  concept,
  audience: "Students",
  ageBand: "18+",
  format: "journey_map",
  mood: "festive",
  look: "clay",
  level: "medium",
  brandColor: null,
  logoDataUrl: null,
  timeLimitSec: null,
});

const set: QuestionSet = {
  status: "ready",
  summary_for_creator: "",
  decisions_informed: [],
  assumptions: [],
  purpose_line: "Help us plan next year's fest.",
  consent_line: "",
  questions: sixQuestions(),
  notes_for_creator: [],
  flags: [],
};

function geminiReply(obj: unknown) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("without a Gemini key", () => {
  beforeEach(() => vi.stubEnv("GEMINI_API_KEY", ""));

  it("uses the prepared fest example", async () => {
    const out = await shapeQuestions(picks("Feedback for our college fest"));
    expect(out.prepared).toBe(true);
    expect(out.result.questions.length).toBeGreaterThan(3);
  });

  it("explains when nothing is prepared", async () => {
    await expect(shapeQuestions(picks("Gym timings survey"))).rejects.toThrow(
      "AI isn't connected yet. Add a Gemini key or try one of the prepared examples.",
    );
    await expect(shapeQuestions(picks("Gym timings survey"))).rejects.toBeInstanceOf(AiError);
  });
});

describe("with a Gemini key", () => {
  beforeEach(() => vi.stubEnv("GEMINI_API_KEY", "test-key"));

  it("retries once after invalid JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(geminiReply(set));
    vi.stubGlobal("fetch", fetchMock);
    const out = await shapeQuestions(picks("Gym timings survey"));
    expect(out.prepared).toBe(false);
    expect(out.result.questions).toHaveLength(6);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a world that breaks a rule, sending the failures", async () => {
    const bad = validWorld();
    bad.chapters[0].intro_line = "one two three four five six seven eight nine ten eleven twelve thirteen";
    const fetchMock = vi.fn().mockResolvedValueOnce(geminiReply(bad)).mockResolvedValueOnce(geminiReply(validWorld()));
    vi.stubGlobal("fetch", fetchMock);
    const out = await buildWorld({ set, gamifier: gamifierFor(set.questions.map((q) => q.id)), picks: picks("Gym timings") });
    expect(out.failures).toEqual([]);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(JSON.stringify(secondBody)).toContain("Intro line is over 12 words");
  });

  it("falls back to the prepared world when both attempts fail", async () => {
    const bad = validWorld();
    bad.ending.line = "You win a prize";
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(geminiReply(bad))));
    const fest = PREPARED.fest;
    const out = await buildWorld({ set: fest.set, gamifier: fest.gamifier, picks: fest.picks });
    expect(out.prepared).toBe(true);
    expect(out.world.world.title).toBe(fest.world.world.title);
  });
});

describe("prepared examples", () => {
  it("match their concepts", () => {
    expect(findPrepared("Feedback for our college fest")?.key).toBe("fest");
    expect(findPrepared("Should our café open on Sundays?")?.key).toBe("cafe");
    expect(findPrepared("Would students pay for laundry pickup?")?.key).toBe("laundry");
    expect(findPrepared("Gym timings")).toBeNull();
  });

  it.each(Object.values(PREPARED))("$key passes every schema and the validator", (p) => {
    expect(() => questionSetSchema.parse(p.set)).not.toThrow();
    expect(() => gamifierSchema.parse(p.gamifier)).not.toThrow();
    expect(() => worldSpecSchema.parse(p.world)).not.toThrow();
    expect(
      validateWorld(p.world, {
        questions: p.set.questions,
        gamifier: p.gamifier,
        level: p.picks.level,
        timeLimitSec: p.picks.timeLimitSec,
      }),
    ).toEqual([]);
  });
});
