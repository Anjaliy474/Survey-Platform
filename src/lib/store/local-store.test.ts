import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { QuickPicks, ResponseRecord, Survey } from "@/lib/survey/types";
import { LocalStore } from "./local-store";
import { newId, newSlug } from "./store";

const picks: QuickPicks = {
  concept: "Feedback for our college fest",
  audience: "Students",
  ageBand: "18+",
  format: "journey_map",
  mood: "festive",
  look: "clay",
  level: "medium",
  brandColor: null,
  logoDataUrl: null,
  timeLimitSec: null,
};

function survey(id: string, slug: string): Survey {
  return {
    id,
    slug,
    status: "draft",
    picks,
    questionSet: null,
    questionsApproved: false,
    bias: null,
    gamifier: null,
    world: null,
    worldAccepted: false,
    splitAB: true,
    prepared: false,
    createdAt: "2026-11-13T10:00:00.000Z",
    publishedAt: null,
  };
}

function response(id: string): ResponseRecord {
  return {
    id,
    surveyId: "S1",
    arm: "story",
    switchedToPlain: false,
    answers: {},
    startedAt: "2026-11-13T10:00:00.000Z",
    completedAt: null,
    enjoyment: null,
    visitorId: "V1",
  };
}

let dir = "";
let store: LocalStore;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "ps-store-"));
  store = new LocalStore(path.join(dir, "store.json"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("LocalStore", () => {
  it("creates, reads, finds by slug and lists surveys", async () => {
    await store.createSurvey(survey("S1", "fest-ab12"));
    await store.createSurvey(survey("S2", "cafe-cd34"));
    expect((await store.getSurvey("S1"))?.slug).toBe("fest-ab12");
    expect((await store.getSurveyBySlug("cafe-cd34"))?.id).toBe("S2");
    expect(await store.getSurvey("nope")).toBeNull();
    expect((await store.listSurveys()).map((s) => s.id).sort()).toEqual(["S1", "S2"]);
  });

  it("persists across instances", async () => {
    await store.createSurvey(survey("S1", "fest-ab12"));
    const again = new LocalStore(path.join(dir, "store.json"));
    expect((await again.getSurvey("S1"))?.id).toBe("S1");
  });

  it("updates a survey", async () => {
    await store.createSurvey(survey("S1", "fest-ab12"));
    const updated = await store.updateSurvey("S1", { status: "live", splitAB: false });
    expect(updated.status).toBe("live");
    expect((await store.getSurvey("S1"))?.splitAB).toBe(false);
  });

  it("keeps the latest answer for a question", async () => {
    await store.startResponse(response("R1"));
    await store.saveAnswer("R1", "Q1", 0);
    await store.saveAnswer("R1", "Q1", 2);
    expect((await store.getResponse("R1"))?.answers.Q1).toBe(2);
  });

  it("completes a response only once", async () => {
    await store.startResponse(response("R1"));
    const first = await store.completeResponse("R1", 4);
    await new Promise((r) => setTimeout(r, 5));
    const second = await store.completeResponse("R1", 2);
    expect(second.completedAt).toBe(first.completedAt);
    expect(second.enjoyment).toBe(4);
  });

  it("marks a switch without changing the arm", async () => {
    await store.startResponse(response("R1"));
    await store.markSwitched("R1");
    const r = await store.getResponse("R1");
    expect(r?.switchedToPlain).toBe(true);
    expect(r?.arm).toBe("story");
  });

  it("lists responses for one survey and logs events", async () => {
    await store.startResponse(response("R1"));
    await store.startResponse({ ...response("R2"), surveyId: "S2" });
    expect((await store.listResponses("S1")).map((r) => r.id)).toEqual(["R1"]);
    await expect(
      store.logEvent({ surveyId: "S1", responseId: "R1", type: "story_sound_on", at: "2026-11-13T10:00:00.000Z" }),
    ).resolves.toBeUndefined();
  });
});

describe("ids and slugs", () => {
  it("makes prefixed ids and kebab slugs", () => {
    expect(newId("S")).toMatch(/^S_[a-z0-9]{10,}$/);
    expect(newSlug("Fest Night Trail!")).toMatch(/^fest-night-trail-[a-z0-9]{4}$/);
  });
});
