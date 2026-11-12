/**
 * Route logic as plain functions, so it can be tested without Next. Each route file
 * parses the request, calls one of these, and returns `Response.json(body, { status })`.
 */
import { z } from "zod";
import { AiError, aiDeadline } from "@/lib/ai/gemini";
import { buildWorld, checkBias, gamify, shapeQuestions } from "@/lib/ai/stages";
import { validateWorld } from "@/lib/story/validate-world";
import { NotFoundError, newId, newSlug, type SurveyStore } from "@/lib/store";
import { assignArm } from "@/lib/survey/ab";
import { compareArms } from "@/lib/survey/compare";
import { sensitiveBriefHint } from "@/lib/survey/contrast";
import { computeReveal, storyAllowed, toPublic } from "@/lib/survey/public";
import {
  FORMATS,
  LEVELS,
  LOOKS,
  MOODS,
  questionSetSchema,
  worldSpecSchema,
  type Answer,
  type QuickPicks,
  type StoryEventType,
  type Survey,
} from "@/lib/survey/types";

export type Result = { status: number; body: unknown };
type Params = Record<string, string>;
type Handler = (store: SurveyStore, input: unknown, params: Params) => Promise<Result>;

const ok = (body: unknown, status = 200): Result => ({ status, body });
const err = (status: number, message: string): Result => ({ status, body: { error: message } });

/** Wraps a handler: bad input → 400, missing records → 404, AI problems → 503. */
function route(fn: Handler): Handler {
  return async (store, input, params) => {
    try {
      return await fn(store, input, params);
    } catch (e) {
      if (e instanceof z.ZodError) return err(400, "Some details are missing or invalid. Check the form and try again.");
      if (e instanceof NotFoundError) return err(404, "We couldn't find that survey.");
      if (e instanceof AiError) return err(503, e.message);
      throw e;
    }
  };
}

const picksSchema = z.object({
  concept: z.string().trim().min(3, "Tell us what the survey is about."),
  audience: z.string().default("Everyone"),
  ageBand: z.enum(["13+", "18+"]).default("18+"),
  format: z.enum(FORMATS).default("journey_map"),
  mood: z.enum(MOODS).default("cosy"),
  look: z.enum(LOOKS).default("clay"),
  level: z.enum(LEVELS).default("medium"),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null),
  logoDataUrl: z.string().startsWith("data:image/").max(300_000).nullable().default(null),
  timeLimitSec: z.number().int().positive().nullable().default(null),
});

async function surveyOr404(store: SurveyStore, id: string): Promise<Survey> {
  const s = await store.getSurvey(id);
  if (!s) throw new NotFoundError(id);
  return s;
}

/* ================= Studio ================= */

export const createSurvey = route(async (store, input) => {
  const picks = picksSchema.parse((input as { picks?: unknown })?.picks) as QuickPicks;
  // Shaping and the bias check share one time budget, so the fallback still runs within 60 s.
  const deadline = aiDeadline();
  const { result: set, prepared } = await shapeQuestions(picks, deadline);
  const bias = await checkBias(set, picks, deadline);
  const survey: Survey = {
    id: newId("S"),
    slug: newSlug(picks.concept),
    status: "draft",
    picks,
    questionSet: set,
    questionsApproved: false,
    bias,
    gamifier: null,
    world: null,
    worldAccepted: false,
    splitAB: true,
    prepared,
    createdAt: new Date().toISOString(),
    publishedAt: null,
  };
  await store.createSurvey(survey);
  return ok({ survey, storyBlocked: !storyAllowed(survey), sensitiveHint: sensitiveBriefHint(picks.concept) }, 201);
});

export const listSurveys = route(async (store) => ok({ surveys: await store.listSurveys() }));

export const getSurvey = route(async (store, _input, { id }) => {
  const survey = await surveyOr404(store, id);
  return ok({ survey, storyBlocked: !storyAllowed(survey) });
});

const patchSchema = z.object({
  questionSet: questionSetSchema.optional(),
  questionsApproved: z.boolean().optional(),
  picks: picksSchema.partial().optional(),
  worldAccepted: z.boolean().optional(),
  splitAB: z.boolean().optional(),
});

export const patchSurvey = route(async (store, input, { id }) => {
  const patch = patchSchema.parse(input ?? {});
  const s = await surveyOr404(store, id);
  if (s.status === "live") return err(409, "This survey is live. Its questions and story can't change.");
  const next: Partial<Survey> = {};
  if (patch.questionSet) {
    Object.assign(next, { questionSet: patch.questionSet, questionsApproved: false, gamifier: null, world: null, worldAccepted: false });
  }
  if (patch.picks) {
    const picks = { ...s.picks, ...patch.picks } as QuickPicks;
    const storyChanged = picks.format !== s.picks.format || picks.look !== s.picks.look || picks.mood !== s.picks.mood || picks.level !== s.picks.level;
    Object.assign(next, { picks }, storyChanged ? { world: null, worldAccepted: false } : {});
  }
  if (patch.questionsApproved !== undefined) {
    next.questionsApproved = patch.questionsApproved;
    if (patch.questionsApproved) {
      const set = next.questionSet ?? s.questionSet!;
      next.gamifier = await gamify(set, (next.picks as QuickPicks) ?? s.picks);
    }
  }
  if (patch.worldAccepted !== undefined) {
    if (patch.worldAccepted && !s.world) return err(409, "Build the story world first.");
    next.worldAccepted = patch.worldAccepted;
  }
  if (patch.splitAB !== undefined) next.splitAB = patch.splitAB;
  return ok({ survey: await store.updateSurvey(id, next) });
});

function storyGate(s: Survey): Result | null {
  if (s.status === "live") return err(409, "This survey is live. Its story can't change.");
  if (!s.questionsApproved || !s.questionSet || !s.gamifier) return err(409, "Approve the questions first.");
  if (!storyAllowed(s)) return err(409, "Story Mode is off for sensitive topics, so the survey stays calm and private.");
  return null;
}

export const buildWorldRoute = route(async (store, _input, { id }) => {
  const s = await surveyOr404(store, id);
  const gate = storyGate(s);
  if (gate) return gate;
  const out = await buildWorld({ set: s.questionSet!, gamifier: s.gamifier!, picks: s.picks });
  const survey = await store.updateSurvey(id, { world: out.world, worldAccepted: false, prepared: s.prepared || out.prepared });
  return ok({ survey, failures: out.failures, prepared: out.prepared });
});

const editSchema = z.union([
  z.object({ world: worldSpecSchema }),
  z.object({ chapterId: z.string(), instruction: z.string().min(1) }),
]);

export const editWorld = route(async (store, input, { id }) => {
  const s = await surveyOr404(store, id);
  const gate = storyGate(s);
  if (gate) return gate;
  const edit = editSchema.parse(input);
  const ctx = { questions: s.questionSet!.questions, gamifier: s.gamifier!, level: s.picks.level, timeLimitSec: s.picks.timeLimitSec };
  if ("world" in edit) {
    const failures = validateWorld(edit.world, ctx);
    const survey = await store.updateSurvey(id, { world: edit.world, worldAccepted: false });
    return ok({ survey, failures });
  }
  if (!s.world) return err(409, "Build the story world first.");
  const out = await buildWorld(
    { set: s.questionSet!, gamifier: s.gamifier!, picks: s.picks },
    { world: s.world, chapterId: edit.chapterId, instruction: edit.instruction },
  );
  const survey = await store.updateSurvey(id, { world: out.world, worldAccepted: false });
  return ok({ survey, failures: out.failures });
});

export const publish = route(async (store, input, { id }) => {
  const { splitAB, plainOnly } = z
    .object({ splitAB: z.boolean().default(true), plainOnly: z.boolean().default(false) })
    .parse(input ?? {});
  const s = await surveyOr404(store, id);
  if (s.status === "live") return ok({ survey: s, url: surveyUrl(s.slug) });
  if (!s.questionsApproved || !s.gamifier) return err(409, "Approve the questions first.");
  // The way out when a world can't pass its checks: publish the plain form for everyone.
  if (plainOnly) {
    const survey = await store.updateSurvey(id, {
      status: "live",
      world: null,
      worldAccepted: false,
      splitAB: false,
      publishedAt: new Date().toISOString(),
    });
    return ok({ survey, url: surveyUrl(survey.slug) });
  }
  if (storyAllowed(s)) {
    if (!s.world || !s.worldAccepted) return err(409, "Accept the story world first.");
    const failures = validateWorld(s.world, {
      questions: s.questionSet!.questions,
      gamifier: s.gamifier,
      level: s.picks.level,
      timeLimitSec: s.picks.timeLimitSec,
    });
    if (failures.length) return err(409, "Fix the integrity checks before publishing.");
  }
  const survey = await store.updateSurvey(id, {
    status: "live",
    splitAB: storyAllowed(s) ? splitAB : false,
    publishedAt: new Date().toISOString(),
  });
  return ok({ survey, url: surveyUrl(survey.slug) });
});

export function surveyUrl(slug: string): string {
  return `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/s/${slug}`;
}

export const results = route(async (store, _input, { id }) => {
  const s = await surveyOr404(store, id);
  const responses = await store.listResponses(id);
  return ok({
    total: responses.length,
    completed: responses.filter((r) => r.completedAt).length,
    splitAB: s.splitAB,
    comparison: compareArms(responses, s.questionSet?.questions ?? []),
  });
});

/* ================= Player ================= */

async function liveOr404(store: SurveyStore, slug: string): Promise<Survey | null> {
  const s = await store.getSurveyBySlug(slug);
  return s && s.status === "live" ? s : null;
}

/** Starts in flight per visitor, so a double request (or React's dev double effect) makes one response. */
const starting = new Map<string, Promise<Result>>();

export const playStart = route(async (store, input, params) => {
  const { visitorId } = z.object({ visitorId: z.string().min(1).max(64) }).passthrough().parse(input);
  const key = `${params.slug}:${visitorId}`;
  const inFlight = starting.get(key);
  if (inFlight) return inFlight;
  const run = startOrResume(store, input, params).finally(() => starting.delete(key));
  starting.set(key, run);
  return run;
});

const startOrResume: Handler = async (store, input, { slug }) => {
  const { responseId, visitorId } = z.object({ responseId: z.string().optional(), visitorId: z.string().min(1).max(64) }).parse(input);
  const s = await liveOr404(store, slug);
  if (!s) return err(404, "We couldn't find that survey.");
  const existing =
    (responseId ? await store.getResponse(responseId) : null) ??
    (await store.listResponses(s.id)).find((r) => r.visitorId === visitorId) ??
    null;
  if (existing && existing.surveyId === s.id) {
    return ok({ survey: toPublic(s), response: existing, alreadyAnswered: Boolean(existing.completedAt) });
  }
  const response = await store.startResponse({
    id: newId("R"),
    surveyId: s.id,
    arm: storyAllowed(s) && s.world ? assignArm(s.splitAB) : "plain",
    switchedToPlain: false,
    answers: {},
    startedAt: new Date().toISOString(),
    completedAt: null,
    enjoyment: null,
    visitorId,
  });
  return ok({ survey: toPublic(s), response, alreadyAnswered: false }, 201);
};

const answerValue: z.ZodType<Answer> = z.union([z.number(), z.array(z.number()), z.string().max(2000), z.null()]);

async function ownResponse(store: SurveyStore, slug: string, responseId: string) {
  const s = await liveOr404(store, slug);
  const r = await store.getResponse(responseId);
  if (!s || !r || r.surveyId !== s.id) return null;
  return { s, r };
}

export const playAnswer = route(async (store, input, { slug }) => {
  const { responseId, questionId, answer } = z
    .object({ responseId: z.string(), questionId: z.string(), answer: answerValue })
    .parse(input);
  const own = await ownResponse(store, slug, responseId);
  if (!own) return err(404, "We couldn't find that response.");
  if (own.r.completedAt) return err(409, "You've already answered this one. Thanks!");
  if (!own.s.questionSet?.questions.some((q) => q.id === questionId)) return err(400, "Unknown question.");
  await store.saveAnswer(responseId, questionId, answer);
  return ok({ saved: true });
});

export const playComplete = route(async (store, input, { slug }) => {
  const { responseId, enjoyment } = z
    .object({ responseId: z.string(), enjoyment: z.number().int().min(0).max(4).nullable().default(null) })
    .parse(input);
  const own = await ownResponse(store, slug, responseId);
  if (!own) return err(404, "We couldn't find that response.");
  const response = await store.completeResponse(responseId, enjoyment);
  const completed = (await store.listResponses(own.s.id)).filter((r) => r.completedAt);
  return ok({ response, reveal: computeReveal(own.s, completed, response) });
});

const EVENT_TYPES = ["story_chapter_viewed", "story_skip_prologue", "story_switch_plain", "story_sound_on"] as const satisfies readonly StoryEventType[];

export const playEvent = route(async (store, input, { slug }) => {
  const { responseId, type, data } = z
    .object({
      responseId: z.string(),
      type: z.enum(EVENT_TYPES),
      data: z.record(z.union([z.string(), z.number()])).optional(),
    })
    .parse(input);
  const own = await ownResponse(store, slug, responseId);
  if (!own) return err(404, "We couldn't find that response.");
  if (type === "story_switch_plain") await store.markSwitched(responseId);
  await store.logEvent({ surveyId: own.s.id, responseId, type, data, at: new Date().toISOString() });
  return ok({ logged: true });
});
