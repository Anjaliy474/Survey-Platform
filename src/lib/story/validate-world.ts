/**
 * The world validator (spec §8): code checks every AI-built world against the
 * integrity rules before a creator can preview or publish it.
 */
import { allowedMechanics, isOpen } from "@/lib/survey/mechanics";
import { storySeconds } from "@/lib/survey/timing";
import type { Gamifier, PlayfulLevel, Question, WorldSpec } from "@/lib/survey/types";
import { CATALOGUE, TEMPLATE_BUDGET_KB } from "./catalogue";

export type ValidationFailure = { rule: string; chapterId?: string; questionId?: string; message: string };

export type ValidateContext = {
  questions: Question[];
  gamifier: Gamifier;
  level: PlayfulLevel;
  timeLimitSec: number | null;
};

export const BANNED_WORDS = [
  "win",
  "winner",
  "score",
  "points",
  "prize",
  "reward",
  "level up",
  "streak",
  "hurry",
  "correct",
  "wrong",
  "best answer",
];

const ALLOWED_TOKENS = ["{{questions_left}}", "{{time_left}}", "{{respondent_count}}"];

export const LIMITS = {
  title: 5,
  chapterTitle: 4,
  intro: 12,
  interlude: 12,
  acknowledgement: 5,
  prologue: 20,
  endingLine: 20,
  postcardTitle: 6,
} as const;

export function wordCount(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function validateWorld(world: WorldSpec, ctx: ValidateContext): ValidationFailure[] {
  const out: ValidationFailure[] = [];
  const fail = (rule: string, message: string, extra: Partial<ValidationFailure> = {}) =>
    out.push({ rule, message, ...extra });

  const template = CATALOGUE[world.world.template];
  if (!template) {
    fail("catalogue", `Unknown template "${world.world.template}".`);
    return out;
  }
  const byId = new Map(ctx.questions.map((q) => [q.id, q]));

  /* ---- coverage and order ---- */
  const placed = world.chapters.flatMap((c) => c.question_ids);
  const approved = ctx.questions.map((q) => q.id);
  if (placed.length !== approved.length || placed.some((id, i) => id !== approved[i])) {
    fail("coverage", "Every approved question must appear exactly once, in the approved order.");
  }

  /* ---- chapters ---- */
  const sceneIds = new Set(template.scenes.map((s) => s.id));
  for (const c of world.chapters) {
    if (c.question_ids.length < 1 || c.question_ids.length > 4) {
      fail("chapter_size", `${c.title || c.chapter_id} must hold 1 to 4 questions.`, { chapterId: c.chapter_id });
    }
    const opens = c.question_ids.filter((id) => {
      const q = byId.get(id);
      return q ? isOpen(q) : false;
    });
    if (opens.length > 0 && c.question_ids.length > 1) {
      fail("open_alone", `Open questions need a chapter of their own (${c.title || c.chapter_id}).`, {
        chapterId: c.chapter_id,
      });
    }
    if (!sceneIds.has(c.scene_id)) {
      fail("catalogue", `Scene "${c.scene_id}" isn't in ${template.label}.`, { chapterId: c.chapter_id });
    }
  }
  if (world.ending.scene_id !== template.endingSceneId) {
    fail("catalogue", `The ending scene must be "${template.endingSceneId}".`);
  }

  /* ---- items: mechanic, prop family, slot ---- */
  const slotsByScene = new Map(template.scenes.map((s) => [s.id, new Set(s.slots)]));
  const chapterOf = new Map(world.chapters.flatMap((c) => c.question_ids.map((id) => [id, c] as const)));
  for (const q of ctx.questions) {
    const gi = ctx.gamifier.items.find((i) => i.question_id === q.id);
    if (!gi || !allowedMechanics(q).includes(gi.mechanic)) {
      fail("mechanic", `${q.id} needs a mechanic allowed for ${q.type}.`, { questionId: q.id });
    }
    const items = world.items.filter((i) => i.question_id === q.id);
    if (items.length !== 1) {
      fail("coverage", `${q.id} needs exactly one story item.`, { questionId: q.id });
      continue;
    }
    const item = items[0];
    if (gi && !(template.propFamilies[gi.mechanic] ?? []).includes(item.prop_family)) {
      fail("prop_family", `${q.id} can't use "${item.prop_family}" for ${gi.mechanic}.`, { questionId: q.id });
    }
    const chapter = chapterOf.get(q.id);
    const slots = chapter ? slotsByScene.get(chapter.scene_id) : undefined;
    if (slots && !slots.has(item.slot)) {
      fail("catalogue", `Slot "${item.slot}" doesn't exist in that scene.`, { questionId: q.id });
    }
  }

  /* ---- copy ---- */
  type Line = { text: string; limit: number; label: string; chapterId?: string; questionId?: string };
  const lines: Line[] = [
    { text: world.world.title, limit: LIMITS.title, label: "World title" },
    { text: world.prologue, limit: LIMITS.prologue, label: "Prologue" },
    { text: world.ending.line, limit: LIMITS.endingLine, label: "Ending line" },
    { text: world.ending.postcard_title, limit: LIMITS.postcardTitle, label: "Postcard title" },
    ...world.chapters.flatMap((c) => [
      { text: c.title, limit: LIMITS.chapterTitle, label: "Chapter title", chapterId: c.chapter_id },
      { text: c.intro_line, limit: LIMITS.intro, label: "Intro line", chapterId: c.chapter_id },
      { text: c.interlude_line, limit: LIMITS.interlude, label: "Interlude line", chapterId: c.chapter_id },
    ]),
    ...world.items.map((i) => ({
      text: i.acknowledgement,
      limit: LIMITS.acknowledgement,
      label: "Acknowledgement",
      questionId: i.question_id,
    })),
  ];
  const premiseSentences = world.world.premise.split(/[.!?](\s|$)/).filter((s) => s && s.trim()).length;
  if (premiseSentences > 1) fail("copy_length", "The premise must be one sentence.");

  for (const l of lines) {
    const where = { chapterId: l.chapterId, questionId: l.questionId };
    if (wordCount(l.text) > l.limit) fail("copy_length", `${l.label} is over ${l.limit} words.`, where);
  }
  for (const l of [...lines, { text: world.world.premise, limit: 0, label: "Premise" }]) {
    const where = { chapterId: l.chapterId, questionId: l.questionId };
    const tokens = l.text.match(/\{\{[^}]*\}\}/g) ?? [];
    if (tokens.some((t) => !ALLOWED_TOKENS.includes(t))) fail("tokens", `${l.label} uses an unknown token.`, where);
    if (/\d/.test(l.text.replace(/\{\{[^}]*\}\}/g, ""))) fail("digits", `${l.label} contains a number.`, where);
    const lower = l.text.toLowerCase();
    const hit = BANNED_WORDS.find((w) => new RegExp(`\\b${w}\\b`, "i").test(lower));
    if (hit) fail("banned", `${l.label} uses "${hit}", which rewards or rushes answers.`, where);
  }

  const leadCopy = [
    ...world.chapters.flatMap((c) => [c.intro_line, c.interlude_line]),
    ...world.items.map((i) => i.acknowledgement),
  ];
  if (ctx.level === "light" && (leadCopy.some((t) => t.trim()) || world.prologue.trim())) {
    fail("copy_empty", "At Light, intro lines, interludes, acknowledgements and the prologue stay empty.");
  }
  if (ctx.level === "medium" && world.prologue.trim()) {
    fail("copy_empty", "Only Full story has a prologue.");
  }

  /* ---- budgets ---- */
  if (ctx.timeLimitSec !== null) {
    const seconds = storySeconds(ctx.questions, world.chapters.length, ctx.level);
    if (seconds > ctx.timeLimitSec) {
      fail("time_budget", `The story takes about ${seconds} s, over the ${ctx.timeLimitSec} s limit.`);
    }
  }
  if (template.sizeKb[world.world.look] > TEMPLATE_BUDGET_KB) {
    fail("size_budget", `${template.label} in this look is over the ${TEMPLATE_BUDGET_KB} KB budget.`);
  }

  return out;
}
