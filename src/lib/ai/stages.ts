/**
 * The AI stages Story Mode uses. Each one calls Gemini when a key is set and falls back
 * to the prepared examples (or a code-built default) when it isn't, or when Gemini fails.
 */
import { CATALOGUE } from "@/lib/story/catalogue";
import { validateWorld, type ValidationFailure } from "@/lib/story/validate-world";
import { allowedMechanics, isOpen } from "@/lib/survey/mechanics";
import {
  biasReportSchema,
  gamifierSchema,
  questionSetSchema,
  worldSpecSchema,
  type BiasReport,
  type Gamifier,
  type QuestionSet,
  type QuickPicks,
  type WorldSpec,
} from "@/lib/survey/types";
import { AiError, NOT_CONNECTED, aiAvailable, aiDeadline, callGemini } from "./gemini";
import { findPrepared } from "./prepared";

export { aiAvailable } from "./gemini";

/** Same questions as shown to respondents: wording, type, options and scale all unchanged. */
const sameQuestions = (a: QuestionSet, b: QuestionSet) =>
  a.questions.length === b.questions.length &&
  a.questions.every((q, i) => {
    const o = b.questions[i];
    return (
      q.id === o.id &&
      q.text === o.text &&
      q.type === o.type &&
      JSON.stringify(q.options) === JSON.stringify(o.options) &&
      JSON.stringify(q.scale) === JSON.stringify(o.scale)
    );
  });

/* ---------------- question_shaper ---------------- */

export async function shapeQuestions(picks: QuickPicks, deadline = aiDeadline()): Promise<{ result: QuestionSet; prepared: boolean }> {
  const prepared = findPrepared(picks.concept);
  if (!aiAvailable()) {
    if (prepared) return { result: structuredClone(prepared.set), prepared: true };
    throw new AiError(NOT_CONNECTED);
  }
  try {
    const result = await callGemini(
      "survey_request",
      {
        mode: "quick_prompt",
        brief: picks.concept,
        audience: picks.audience,
        age_band: picks.ageBand,
        anonymous: true,
        time_limit_seconds: picks.timeLimitSec ?? "not given",
      },
      questionSetSchema,
      deadline,
    );
    return { result, prepared: false };
  } catch (e) {
    if (prepared) return { result: structuredClone(prepared.set), prepared: true };
    throw e;
  }
}

/* ---------------- bias_checker ---------------- */

function biasNotRun(set: QuestionSet): BiasReport {
  return {
    items_reviewed: set.questions.map((q) => ({ id: q.id, verdict: "clear" })),
    findings: [],
    overall_note: "The bias check didn't run because the AI isn't connected. Read each question once before publishing.",
    flags: ["bias_check_not_run"],
  };
}

export async function checkBias(set: QuestionSet, picks: QuickPicks, deadline = aiDeadline()): Promise<BiasReport> {
  const prepared = findPrepared(picks.concept);
  const fallback = () => (prepared && sameQuestions(prepared.set, set) ? structuredClone(prepared.bias) : biasNotRun(set));
  if (!aiAvailable()) return fallback();
  try {
    return await callGemini(
      "bias_check_request",
      { audience: picks.audience, purpose: set.purpose_line, questions: set.questions },
      biasReportSchema,
      deadline,
    );
  } catch {
    return fallback();
  }
}

/* ---------------- gamifier ---------------- */

/** A neutral gamifier built in code: first allowed mechanic, the same "Got it." after every answer. */
export function defaultGamifier(set: QuestionSet): Gamifier {
  return {
    intro: { title: "A quick survey", start_button: "Start" },
    items: set.questions.map((q) => ({
      question_id: q.id,
      mechanic: allowedMechanics(q)[allowedMechanics(q).length > 1 && q.type === "rating_scale" ? 1 : 0],
      lead_in: "",
      feedback_after_answer: "Got it.",
      helper_text: q.type === "multi_choice" ? "Pick all that apply" : "",
    })),
    milestones: [],
    closing: {
      thank_you: "Thanks for taking part.",
      enjoyment_prompt: "How did you find this survey?",
      reveal_teaser: "Results appear here once more people have answered.",
    },
    reveal: {
      question_ids: set.questions
        .filter((q) => !isOpen(q) && !q.sensitive && !q.collects_personal_data)
        .slice(0, 3)
        .map((q) => q.id),
      intro_copy: "Here is how {{respondent_count}} people answered",
    },
    notes_for_creator: [],
    flags: [],
  };
}

/** Code guard: every question gets exactly one item with an allowed mechanic. */
function sanitiseGamifier(g: Gamifier, set: QuestionSet): Gamifier {
  const fallback = defaultGamifier(set);
  const items = set.questions.map((q, i) => {
    const item = g.items.find((it) => it.question_id === q.id);
    return item && allowedMechanics(q).includes(item.mechanic) ? item : fallback.items[i];
  });
  return { ...g, items };
}

export async function gamify(set: QuestionSet, picks: QuickPicks, deadline = aiDeadline()): Promise<Gamifier> {
  const prepared = findPrepared(picks.concept);
  if (prepared && sameQuestions(prepared.set, set)) return sanitiseGamifier(structuredClone(prepared.gamifier), set);
  if (!aiAvailable()) return defaultGamifier(set);
  try {
    const g = await callGemini(
      "gamify_request",
      {
        style: "one_per_screen",
        playful_level: picks.level === "full" ? "medium" : picks.level,
        audience: picks.audience,
        questions: set.questions.map((q) => ({ id: q.id, text: q.text, type: q.type, options: q.options, sensitive: q.sensitive })),
      },
      gamifierSchema,
      deadline,
    );
    return sanitiseGamifier(g, set);
  } catch {
    return defaultGamifier(set);
  }
}

/* ---------------- world_builder ---------------- */

type WorldInput = { set: QuestionSet; gamifier: Gamifier; picks: QuickPicks };
type WorldEdit = { world: WorldSpec; chapterId: string; instruction: string };

function worldPayload({ set, gamifier, picks }: WorldInput, edit?: WorldEdit, failures?: ValidationFailure[]) {
  const t = CATALOGUE[picks.format];
  return {
    mode: edit ? "edit_chapter" : "create",
    template: { id: t.id, scenes: t.scenes, ending_scene_id: t.endingSceneId, prop_families: t.propFamilies },
    quick_picks: { format: picks.format, mood: picks.mood, look: picks.look, playful_level: picks.level, audience: picks.audience, age_band: picks.ageBand },
    concept: picks.concept,
    questions: set.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      options_count: q.options.length,
      open: isOpen(q),
      mechanic: gamifier.items.find((i) => i.question_id === q.id)?.mechanic,
    })),
    time_limit_seconds: picks.timeLimitSec ?? "not given",
    ...(edit ? { current_world: edit.world, chapter_id: edit.chapterId, instruction: edit.instruction } : {}),
    ...(failures?.length ? { previous_attempt_failed: failures.map((f) => f.message) } : {}),
  };
}

/** The creator's picks always win over what the model returns. */
function pinPicks(w: WorldSpec, picks: QuickPicks): WorldSpec {
  return { ...w, world: { ...w.world, template: picks.format, mood: picks.mood, look: picks.look } };
}

export async function buildWorld(
  input: WorldInput,
  edit?: WorldEdit,
  deadline = aiDeadline(),
): Promise<{ world: WorldSpec; failures: ValidationFailure[]; prepared: boolean }> {
  const { set, gamifier, picks } = input;
  const ctx = { questions: set.questions, gamifier, level: picks.level, timeLimitSec: picks.timeLimitSec };
  const preparedMatch = findPrepared(picks.concept);
  const prepared =
    preparedMatch && sameQuestions(preparedMatch.set, set) && preparedMatch.picks.format === picks.format ? preparedMatch : null;
  const preparedResult = () => ({ world: pinPicks(structuredClone(prepared!.world), picks), failures: [], prepared: true });

  if (!aiAvailable()) {
    if (prepared && !edit) return preparedResult();
    throw new AiError(NOT_CONNECTED);
  }

  let last: WorldSpec | null = null;
  let failures: ValidationFailure[] = [];
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      last = pinPicks(await callGemini("world_request", worldPayload(input, edit, failures), worldSpecSchema, deadline), picks);
      failures = validateWorld(last, ctx);
      if (failures.length === 0) return { world: last, failures, prepared: false };
    }
  } catch (e) {
    if (prepared && !edit) return preparedResult();
    throw e;
  }
  if (prepared && !edit) return preparedResult();
  return { world: last!, failures, prepared: false };
}
