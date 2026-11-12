import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PREPARED } from "@/lib/ai/prepared";
import { LocalStore } from "@/lib/store/local-store";
import type { Survey } from "@/lib/survey/types";
import * as h from "./handlers";

let dir = "";
let store: LocalStore;
beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "");
  dir = mkdtempSync(path.join(tmpdir(), "ps-api-"));
  store = new LocalStore(path.join(dir, "store.json"));
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

async function created(): Promise<Survey> {
  const res = await h.createSurvey(store, { picks: PREPARED.fest.picks }, {});
  expect(res.status).toBe(201);
  return (res.body as { survey: Survey }).survey;
}

async function published(splitAB = true): Promise<Survey> {
  const s = await created();
  await h.patchSurvey(store, { questionsApproved: true }, { id: s.id });
  await h.buildWorldRoute(store, {}, { id: s.id });
  await h.patchSurvey(store, { worldAccepted: true }, { id: s.id });
  const pub = await h.publish(store, { splitAB }, { id: s.id });
  expect(pub.status).toBe(200);
  return (pub.body as { survey: Survey }).survey;
}

describe("studio routes", () => {
  it("creates a survey from the fest concept", async () => {
    const s = await created();
    expect(s.questionSet?.questions).toHaveLength(6);
    expect(s.questionsApproved).toBe(false);
    expect(s.prepared).toBe(true);
  });

  it("lists surveys as summaries without full bodies", async () => {
    const s = await created();
    const res = await h.listSurveys(store, {}, {});
    const body = JSON.stringify(res.body);
    expect(body).toContain(s.id);
    for (const heavy of ["questionSet", "logoDataUrl", "overall_note", "gamifier"]) expect(body).not.toContain(heavy);
  });

  it("won't build a world before the questions are approved", async () => {
    const s = await created();
    expect((await h.buildWorldRoute(store, {}, { id: s.id })).status).toBe(409);
  });

  it("approving runs the gamifier", async () => {
    const s = await created();
    const res = await h.patchSurvey(store, { questionsApproved: true }, { id: s.id });
    expect((res.body as { survey: Survey }).survey.gamifier?.items).toHaveLength(6);
  });

  it("won't publish before the world is accepted", async () => {
    const s = await created();
    await h.patchSurvey(store, { questionsApproved: true }, { id: s.id });
    await h.buildWorldRoute(store, {}, { id: s.id });
    expect((await h.publish(store, { splitAB: true }, { id: s.id })).status).toBe(409);
  });

  it("locks the world after publishing", async () => {
    const s = await published();
    expect(s.status).toBe("live");
    const edit = await h.editWorld(store, { world: s.world }, { id: s.id });
    expect(edit.status).toBe(409);
  });

  it("can publish as a plain survey when the story isn't accepted", async () => {
    const s = await created();
    await h.patchSurvey(store, { questionsApproved: true }, { id: s.id });
    await h.buildWorldRoute(store, {}, { id: s.id });
    const pub = await h.publish(store, { splitAB: true, plainOnly: true }, { id: s.id });
    expect(pub.status).toBe(200);
    const live = (pub.body as { survey: Survey }).survey;
    expect(live.world).toBeNull();
    expect(live.splitAB).toBe(false);
    const start = await h.playStart(store, { visitorId: "V9" }, { slug: live.slug });
    expect((start.body as { response: { arm: string } }).response.arm).toBe("plain");
  });

  it("blocks Story Mode when a question is sensitive", async () => {
    const s = await created();
    const set = structuredClone(s.questionSet!);
    set.questions[1].sensitive = true;
    await h.patchSurvey(store, { questionSet: set }, { id: s.id });
    await h.patchSurvey(store, { questionsApproved: true }, { id: s.id });
    expect((await h.buildWorldRoute(store, {}, { id: s.id })).status).toBe(409);
    const pub = await h.publish(store, { splitAB: true }, { id: s.id });
    expect(pub.status).toBe(200);
    const start = await h.playStart(store, { visitorId: "V1" }, { slug: (pub.body as { survey: Survey }).survey.slug });
    expect((start.body as { response: { arm: string } }).response.arm).toBe("plain");
  });
});

describe("player routes", () => {
  it("resumes the same response on reload", async () => {
    const s = await published();
    const first = await h.playStart(store, { visitorId: "V1" }, { slug: s.slug });
    const r1 = (first.body as { response: { id: string } }).response;
    const again = await h.playStart(store, { visitorId: "V1", responseId: r1.id }, { slug: s.slug });
    expect((again.body as { response: { id: string } }).response.id).toBe(r1.id);
    expect((await store.listResponses(s.id)).length).toBe(1);
  });

  it("creates one response when the same visitor starts twice at once", async () => {
    const s = await published();
    const [a, b] = await Promise.all([
      h.playStart(store, { visitorId: "V1" }, { slug: s.slug }),
      h.playStart(store, { visitorId: "V1" }, { slug: s.slug }),
    ]);
    const id = (r: typeof a) => (r.body as { response: { id: string } }).response.id;
    expect(id(a)).toBe(id(b));
    expect((await store.listResponses(s.id)).length).toBe(1);
  });

  it("completes once and then reports already answered", async () => {
    const s = await published();
    const start = await h.playStart(store, { visitorId: "V1" }, { slug: s.slug });
    const id = (start.body as { response: { id: string } }).response.id;
    await h.playAnswer(store, { responseId: id, questionId: "Q1", answer: 0 }, { slug: s.slug });
    const c1 = await h.playComplete(store, { responseId: id, enjoyment: 3 }, { slug: s.slug });
    const c2 = await h.playComplete(store, { responseId: id, enjoyment: 1 }, { slug: s.slug });
    const at = (r: typeof c1) => (r.body as { response: { completedAt: string } }).response.completedAt;
    expect(at(c2)).toBe(at(c1));
    const back = await h.playStart(store, { visitorId: "V1", responseId: id }, { slug: s.slug });
    expect((back.body as { alreadyAnswered: boolean }).alreadyAnswered).toBe(true);
  });

  it("returns 404 for drafts and unknown slugs", async () => {
    const s = await created();
    expect((await h.playStart(store, { visitorId: "V1" }, { slug: s.slug })).status).toBe(404);
    expect((await h.playStart(store, { visitorId: "V1" }, { slug: "nope" })).status).toBe(404);
  });

  it("shows the reveal only from the 20th completed response", async () => {
    const s = await published(false);
    let last: { reveal: unknown } = { reveal: null };
    for (let i = 0; i < 20; i++) {
      const start = await h.playStart(store, { visitorId: `V${i}` }, { slug: s.slug });
      const id = (start.body as { response: { id: string } }).response.id;
      await h.playAnswer(store, { responseId: id, questionId: "Q1", answer: i % 5 }, { slug: s.slug });
      await h.playAnswer(store, { responseId: id, questionId: "Q4", answer: i % 2 }, { slug: s.slug });
      last = (await h.playComplete(store, { responseId: id, enjoyment: 4 }, { slug: s.slug })).body as { reveal: unknown };
      if (i === 18) expect(last.reveal).toBeNull();
    }
    expect(last.reveal).not.toBeNull();
  });

  it("sends respondents only what they play", async () => {
    const s = await published();
    const start = await h.playStart(store, { visitorId: "V1" }, { slug: s.slug });
    const publicSurvey = JSON.stringify((start.body as { survey: unknown }).survey);
    for (const internal of ["overall_note", "maps_to_decision", "\"reason\"", "notes_for_creator", "\"flags\"", "\"role\"", "collects_personal_data", s.id]) {
      expect(publicSurvey).not.toContain(internal);
    }
    expect(publicSurvey).toContain(s.questionSet!.questions[0].text);
  });

  it("marks a switch to plain", async () => {
    const s = await published();
    const start = await h.playStart(store, { visitorId: "V1" }, { slug: s.slug });
    const id = (start.body as { response: { id: string } }).response.id;
    await h.playEvent(store, { responseId: id, type: "story_switch_plain" }, { slug: s.slug });
    expect((await store.getResponse(id))?.switchedToPlain).toBe(true);
  });
});
