/**
 * Player rules: the "Mechanics Library + Schema Check" box in survey-platform-architecture.mmd.
 * Code, not the AI, decides what may reach a respondent. The gamifier only chooses a mechanic
 * and writes light copy; wording, options and scales always come from the approved question set.
 */
import { SECONDS_PER_CLOSED, SECONDS_PER_OPEN, formatAbout, formatDuration } from "@/lib/compute";
import type { Answer, Answers, GamifiedItem, Mechanic, PlayerSurvey, PresentationStyle, Question, QuestionType } from "./types";

/** Allowed mechanics per question type (combined.system.txt, stage gamifier). */
export const ALLOWED_MECHANICS: Record<QuestionType, Mechanic[]> = {
  single_choice: ["tap_chips_single", "this_or_that"],
  multi_choice: ["tap_chips_multi"],
  rating_scale: ["segmented_scale", "emoji_scale"],
  nps_0_10: ["number_row_11"],
  yes_no: ["this_or_that"],
  number_band: ["tap_chips_single"],
  short_text: ["text_box"],
  long_text: ["text_box"],
};

/** Single-value mechanics auto-advance 400ms after a pick (DESIGN.md §7.2). */
export const AUTO_ADVANCE_MS = 400;
export const SINGLE_VALUE: Mechanic[] = ["tap_chips_single", "this_or_that", "segmented_scale", "emoji_scale", "number_row_11"];

const COPY_LIMITS = { lead_in: 12, feedback_after_answer: 5, milestone: 12 } as const;
const BANNED_WORDS = /\b(points?|score|scores|badges?|streaks?|leaderboards?|prizes?|rewards?|hurry|win|winner)\b/i;
const MAX_QUESTIONS = 15;
const MAX_OPEN = 2;
const MAX_REVEAL = 3;

/** Open-ended question (at most two, last, optional). */
export const isOpenEnded = (q: Question) => q.type === "short_text" || q.type === "long_text";
/** Timing: 45 s for a written answer, 10 s for everything else (a short field such as an email is quick). */
const takesLong = (q: Question) => q.type === "long_text";

export function secondsFor(questions: readonly Question[]): number {
  return questions.reduce((t, q) => t + (takesLong(q) ? SECONDS_PER_OPEN : SECONDS_PER_CLOSED), 0);
}

export function surveyLengthLabel(questions: readonly Question[]): string {
  return `${questions.length} question${questions.length === 1 ? "" : "s"} · ${formatAbout(secondsFor(questions))}`;
}

export function remainingLabel(questionsLeft: readonly Question[]): string {
  return `${questionsLeft.length} left · ${formatAbout(secondsFor(questionsLeft))}`;
}

/** Copy may contain numbers only through tokens that code fills in. */
export function fillTokens(copy: string, values: { questionsLeft?: Question[]; respondentCount?: number }): string {
  return copy
    .replaceAll("{{questions_left}}", String(values.questionsLeft?.length ?? ""))
    .replaceAll("{{time_left}}", values.questionsLeft ? formatDuration(secondsFor(values.questionsLeft)) : "")
    .replaceAll("{{respondent_count}}", values.respondentCount?.toLocaleString("en-US") ?? "");
}

export function isAnswered(q: Question, a: Answer | undefined): boolean {
  if (a === undefined) return false;
  if (Array.isArray(a)) return a.length > 0;
  if (typeof a === "string") return a.trim().length > 0;
  return Number.isInteger(a);
}

/** Labels for each scale point: the question's own labels, or numbers with worded ends. */
export function scaleLabels(q: Question): string[] {
  const points = q.scale?.points ?? 0;
  if (q.scale?.point_labels?.length === points) return q.scale.point_labels;
  return Array.from({ length: points }, (_, i) => String(i + 1));
}

export function optionsFor(q: Question): string[] {
  if (q.type === "yes_no") return q.options.length === 2 ? q.options : ["Yes", "No"];
  return q.options;
}

/** Short text for an answer, used in chat bubbles. */
export function summarize(q: Question, a: Answer | undefined): string {
  if (a === undefined || !isAnswered(q, a)) return "Skipped";
  if (q.type === "nps_0_10") return String(a);
  if (q.type === "rating_scale") return scaleLabels(q)[a as number];
  if (Array.isArray(a)) return a.map((i) => optionsFor(q)[i]).join(", ");
  if (typeof a === "string") return a.length > 60 ? `${a.slice(0, 57)}…` : a;
  return optionsFor(q)[a] ?? "";
}

/**
 * Screens for a style. One-per-screen and chat show one question at a time; pages use the
 * gamifier's grouping (or group 2–3 in order, with sensitive and open questions alone);
 * classic shows everything on one page.
 */
export function buildScreens(survey: PlayerSurvey, style: PresentationStyle): string[][] {
  const ids = survey.questions.map((q) => q.id);
  if (style === "classic") return [ids];
  if (style === "one_per_screen" || style === "chat") return ids.map((id) => [id]);
  if (survey.gamified.style === "pages") return survey.gamified.screens.map((s) => s.question_ids);
  const pages: string[][] = [];
  let page: string[] = [];
  for (const q of survey.questions) {
    const alone = q.sensitive || isOpenEnded(q);
    if (alone || page.length === 3) {
      if (page.length) pages.push(page);
      page = [];
    }
    page.push(q.id);
    if (alone) {
      pages.push(page);
      page = [];
    }
  }
  if (page.length) pages.push(page);
  return pages;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const hasBareNumber = (s: string) => /\d/.test(s.replace(/\{\{\w+\}\}/g, ""));

function checkItem(q: Question, item: GamifiedItem, level: PlayerSurvey["gamified"]["playful_level"], style: PresentationStyle): string[] {
  const p: string[] = [];
  if (!ALLOWED_MECHANICS[q.type].includes(item.mechanic)) p.push(`${q.id}: ${item.mechanic} is not allowed for ${q.type}`);
  if (item.mechanic === "this_or_that" && optionsFor(q).length !== 2) p.push(`${q.id}: this_or_that needs exactly 2 options`);
  if (item.mechanic === "number_row_11" && (q.scale?.points ?? 11) !== 11) p.push(`${q.id}: the 0–10 row must keep all 11 points`);
  if (item.mechanic === "emoji_scale" && (q.scale?.points !== 5 || item.mechanic_params.emoji_set !== "faces_5"))
    p.push(`${q.id}: emoji_scale needs a 5-point scale and the faces_5 set`);
  if (q.type === "rating_scale" && q.scale?.point_labels && q.scale.point_labels.length !== q.scale.points)
    p.push(`${q.id}: every scale point needs a label`);
  if (isOpenEnded(q) && q.required) p.push(`${q.id}: open questions must be optional`);
  if (q.sensitive && q.required) p.push(`${q.id}: sensitive questions must be optional`);
  for (const [field, limit] of [["lead_in", COPY_LIMITS.lead_in], ["feedback_after_answer", COPY_LIMITS.feedback_after_answer]] as const) {
    const copy = item[field];
    if (words(copy) > limit) p.push(`${q.id}: ${field} is longer than ${limit} words`);
    if (hasBareNumber(copy)) p.push(`${q.id}: ${field} contains a number not filled by code`);
    if (BANNED_WORDS.test(copy)) p.push(`${q.id}: ${field} mentions a reward or pressure mechanic`);
  }
  if (hasBareNumber(item.helper_text)) p.push(`${q.id}: helper_text contains a number not filled by code`);
  if (item.feedback_after_answer && level !== "medium") p.push(`${q.id}: feedback is only for the Medium level`);
  if (item.lead_in && (level === "off" || style === "classic")) p.push(`${q.id}: no lead-ins at Off level or in classic style`);
  return p;
}

/** Returns every problem found; an empty list means the survey may be shown. */
export function checkSurvey(survey: PlayerSurvey): string[] {
  const { questions, gamified } = survey;
  const p: string[] = [];
  const ids = questions.map((q) => q.id);
  if (questions.length === 0) p.push("The survey has no questions");
  if (questions.length > MAX_QUESTIONS) p.push(`More than ${MAX_QUESTIONS} questions`);
  if (!survey.purpose_line.trim()) p.push("The purpose line is missing");
  if (questions.some((q) => q.collects_personal_data || q.sensitive) && !survey.consent_line.trim())
    p.push("Personal or sensitive data needs a consent line");

  const open = questions.filter(isOpenEnded);
  if (open.length > MAX_OPEN) p.push(`More than ${MAX_OPEN} open questions`);
  const firstOpen = questions.findIndex(isOpenEnded);
  if (firstOpen >= 0 && questions.slice(firstOpen).some((q) => !isOpenEnded(q))) p.push("Open questions must come last");

  const itemIds = gamified.items.map((i) => i.question_id);
  if (itemIds.join() !== ids.join()) p.push("The gamified items must cover every question once, in order");
  const screenIds = gamified.screens.flatMap((s) => s.question_ids);
  if (screenIds.join() !== ids.join()) p.push("Screens must cover every question once, in order");

  for (const item of gamified.items) {
    const q = questions.find((x) => x.id === item.question_id);
    if (q) p.push(...checkItem(q, item, gamified.playful_level, gamified.style));
  }
  for (const m of gamified.milestones) {
    if (words(m.copy) > COPY_LIMITS.milestone) p.push(`Milestone after ${m.after_question_id} is too long`);
    if (hasBareNumber(m.copy)) p.push(`Milestone after ${m.after_question_id} contains a number not filled by code`);
    if (BANNED_WORDS.test(m.copy)) p.push(`Milestone after ${m.after_question_id} mentions a reward or pressure`);
  }
  if (gamified.reveal.question_ids.length > MAX_REVEAL) p.push(`The reveal shows more than ${MAX_REVEAL} questions`);
  for (const id of gamified.reveal.question_ids) {
    const q = questions.find((x) => x.id === id);
    if (!q || isOpenEnded(q) || q.sensitive || q.collects_personal_data) p.push(`${id} can't be in the reveal`);
  }
  return p;
}

export function firstMissingRequired(questions: readonly Question[], answers: Answers): Question | undefined {
  return questions.find((q) => q.required && !isAnswered(q, answers[q.id]));
}
