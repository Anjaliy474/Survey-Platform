/**
 * The compute engine for Results (DESIGN.md rule 2: numbers come from code). Pure functions
 * from raw response rows to everything the Overview shows. No AI is involved anywhere here.
 */
import { median, percent, percentsSummingTo100, singleHighestIndex } from "@/lib/compute";
import { isOpenEnded, optionsFor, scaleLabels } from "@/lib/player/rules";
import type { Answer, PlayerSurvey, Question } from "@/lib/player/types";
import type { ResultResponse } from "./data";

const DAY = 24 * 60 * 60 * 1000;

/* ---------------- data quality ---------------- */

export type FlagCode = "speeder" | "straight_liner" | "duplicate" | "low_effort";
export const FLAG_LABEL: Record<FlagCode, string> = {
  speeder: "Very fast",
  straight_liner: "Same answer everywhere",
  duplicate: "Possible duplicate",
  low_effort: "Low-effort text",
};
export const FLAG_REASON: Record<FlagCode, string> = {
  speeder: "Finished in under a third of the expected time.",
  straight_liner: "Picked the same point on every rating question.",
  duplicate: "Identical answers to another response a few minutes apart.",
  low_effort: "The written answer looks like keyboard mashing or a filler.",
};

const estimateFor = (questions: Question[]) => questions.reduce((t, q) => t + (isOpenEnded(q) ? 45 : 10), 0);
/** Keyboard mashing or filler only; a short real answer ("Nothing", "No") is never flagged. */
const LOW_EFFORT = /^(?:(.)\1{3,}|[.\-_ ]{2,}|asdf\w*|qwer\w*|hjk\w*|zxc\w*|jkl\w*)$/i;
const key = (r: ResultResponse, questions: Question[]) => questions.map((q) => JSON.stringify(r.answers[q.id] ?? null)).join("|");

/** Flags for every finished response. Code finds them; a person decides (Keep / Exclude). */
export function qualityFlags(survey: PlayerSurvey, responses: readonly ResultResponse[]): Map<string, FlagCode[]> {
  const out = new Map<string, FlagCode[]>();
  const qs = survey.questions;
  const ratings = qs.filter((q) => q.type === "rating_scale");
  const estimate = estimateFor(qs);
  const finished = responses.filter((r) => r.submittedAt !== null).sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0));
  const seen = new Map<string, number>();
  for (const r of finished) {
    const flags: FlagCode[] = [];
    if (r.seconds !== null && r.seconds < estimate / 3) flags.push("speeder");
    if (ratings.length >= 3) {
      const vals = ratings.map((q) => r.answers[q.id]);
      if (vals.every((v) => typeof v === "number" && v === vals[0])) flags.push("straight_liner");
    }
    // Identical answers within 15 minutes, when there's enough to compare (written text, or 5+ answers).
    const k = key(r, qs);
    const prev = seen.get(k);
    const enough = qs.some((q) => isOpenEnded(q) && answered(r.answers[q.id])) || qs.filter((q) => answered(r.answers[q.id])).length >= 5;
    if (enough && prev !== undefined && (r.submittedAt ?? 0) - prev <= 15 * 60_000) flags.push("duplicate");
    seen.set(k, r.submittedAt ?? 0);
    if (qs.some((q) => q.type === "long_text" && typeof r.answers[q.id] === "string" && LOW_EFFORT.test(String(r.answers[q.id]).trim()))) flags.push("low_effort");
    if (flags.length) out.set(r.id, flags);
  }
  return out;
}

/* ---------------- the overview ---------------- */

export type Review = Record<string, "keep" | "exclude">;

export type BarRow = { label: string; count: number; pct: number };
export type QuestionResult =
  | { kind: "bars"; q: Question; n: number; rows: BarRow[]; multi: boolean; top: number | null }
  | { kind: "likert"; q: Question; n: number; rows: BarRow[]; neg: number; neutral: number; pos: number; hasNeutral: boolean }
  | { kind: "nps"; q: Question; n: number; score: number; dist: number[]; promoters: BarRow; passives: BarRow; detractors: BarRow }
  | { kind: "open"; q: Question; n: number; answered: number }
  | { kind: "personal"; q: Question; n: number; answered: number };

export type Overview = {
  started: number;
  finished: number;
  /** Responses the charts use (finished, minus excluded, minus flagged unless included). */
  base: number;
  completionPct: number;
  medianSeconds: number | null;
  enjoyment: { pct: number; n: number };
  overTime: { label: string; full: string; count: number }[];
  dropOff: { label: string; text: string; count: number }[];
  dropTop: number | null;
  dropSentence: string;
  left: number;
  questions: QuestionResult[];
  quality: { flagged: number; byCode: Record<FlagCode, number>; kept: number; excluded: number; included: boolean };
};

const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const fullFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

function answered(a: Answer | undefined): boolean {
  if (a === undefined || a === null) return false;
  if (Array.isArray(a)) return a.length > 0;
  if (typeof a === "string") return a.trim().length > 0;
  return true;
}

export function questionResult(q: Question, rows: readonly ResultResponse[]): QuestionResult {
  const values = rows.map((r) => r.answers[q.id]).filter(answered);
  const n = values.length;
  if (q.collects_personal_data) return { kind: "personal", q, n: rows.length, answered: n };
  if (isOpenEnded(q)) return { kind: "open", q, n: rows.length, answered: n };

  if (q.type === "nps_0_10") {
    const dist = Array.from({ length: 11 }, (_, i) => values.filter((v) => v === i).length);
    const det = dist.slice(0, 7).reduce((a, b) => a + b, 0);
    const pas = dist[7] + dist[8];
    const pro = dist[9] + dist[10];
    const [dp, pp, prp] = percentsSummingTo100([det, pas, pro]);
    return {
      kind: "nps",
      q,
      n,
      dist,
      score: n ? Math.round(((pro - det) / n) * 100) : 0,
      detractors: { label: "Detractors (0–6)", count: det, pct: dp },
      passives: { label: "Passives (7–8)", count: pas, pct: pp },
      promoters: { label: "Promoters (9–10)", count: pro, pct: prp },
    };
  }

  if (q.type === "rating_scale") {
    const labels = scaleLabels(q);
    const counts = labels.map((_, i) => values.filter((v) => v === i).length);
    const pcts = percentsSummingTo100(counts);
    const mid = labels.length % 2 === 1 ? (labels.length - 1) / 2 : -1;
    const half = Math.floor(labels.length / 2);
    const neg = counts.slice(0, half).reduce((a, b) => a + b, 0);
    const pos = counts.slice(labels.length - half).reduce((a, b) => a + b, 0);
    const [negP, neuP, posP] = percentsSummingTo100([neg, mid >= 0 ? counts[mid] : 0, pos]);
    return {
      kind: "likert",
      q,
      n,
      rows: labels.map((label, i) => ({ label, count: counts[i], pct: pcts[i] })),
      neg: negP,
      neutral: neuP,
      pos: posP,
      hasNeutral: mid >= 0,
    };
  }

  const labels = optionsFor(q);
  const multi = q.type === "multi_choice";
  const counts = labels.map((_, i) => values.filter((v) => (Array.isArray(v) ? v.includes(i) : v === i)).length);
  const pcts = multi ? counts.map((c) => percent(c, n)) : percentsSummingTo100(counts);
  return { kind: "bars", q, n, multi, rows: labels.map((label, i) => ({ label, count: counts[i], pct: pcts[i] })), top: singleHighestIndex(counts) };
}

export function overview(
  survey: PlayerSurvey,
  responses: readonly ResultResponse[],
  options: { includeFlagged: boolean; review: Review; now: number },
): Overview {
  const flags = qualityFlags(survey, responses);
  const finishedAll = responses.filter((r) => r.submittedAt !== null);
  const excluded = finishedAll.filter((r) => options.review[r.id] === "exclude");
  const kept = finishedAll.filter((r) => flags.has(r.id) && options.review[r.id] === "keep");
  const used = finishedAll.filter((r) => {
    if (options.review[r.id] === "exclude") return false;
    if (flags.has(r.id) && options.review[r.id] !== "keep") return options.includeFlagged;
    return true;
  });

  const byCode: Record<FlagCode, number> = { speeder: 0, straight_liner: 0, duplicate: 0, low_effort: 0 };
  flags.forEach((codes) => codes.forEach((c) => (byCode[c] += 1)));

  // Responses over time: one bar per day of the survey's active window (at least 7 days).
  const times = finishedAll.map((r) => r.submittedAt as number);
  const endAt = times.length ? Math.max(...times) : options.now;
  const end = new Date(endAt);
  end.setHours(0, 0, 0, 0);
  const startAt = times.length ? Math.min(...times) : options.now;
  const start = new Date(startAt);
  start.setHours(0, 0, 0, 0);
  const spanDays = Math.min(30, Math.max(7, Math.round((end.getTime() - start.getTime()) / DAY) + 1));
  const overTime = Array.from({ length: spanDays }, (_, i) => {
    const from = end.getTime() - (spanDays - 1 - i) * DAY;
    const count = times.filter((t) => t >= from && t < from + DAY).length;
    return { label: dayFmt.format(from), full: fullFmt.format(from), count };
  });

  // Drop-off: people who saw a question and stopped there.
  const leftRows = responses.filter((r) => r.submittedAt === null && r.leftAt !== null);
  const dropOff = survey.questions.map((q, i) => ({ label: `Q${i + 1}`, text: q.text, count: leftRows.filter((r) => r.leftAt === i).length }));
  const dropTop = leftRows.length ? singleHighestIndex(dropOff.map((d) => d.count)) : null;
  const dropSentence = !leftRows.length
    ? "No one has left part-way so far."
    : dropTop === null
      ? "People who left did so at several different questions."
      : `Most people who left did so at Q${dropTop + 1}.`;

  const seconds = used.map((r) => r.seconds).filter((s): s is number => s !== null);
  const enjoy = used.map((r) => r.enjoyment).filter((e): e is number => e !== null);

  return {
    started: responses.length,
    finished: finishedAll.length,
    base: used.length,
    completionPct: percent(finishedAll.length, responses.length),
    medianSeconds: seconds.length ? median(seconds) : null,
    enjoyment: { pct: percent(enjoy.filter((e) => e >= 3).length, enjoy.length), n: enjoy.length },
    overTime,
    dropOff,
    dropTop,
    dropSentence,
    left: leftRows.length,
    questions: survey.questions.map((q) => questionResult(q, used)),
    quality: { flagged: flags.size, byCode, kept: kept.length, excluded: excluded.length, included: options.includeFlagged },
  };
}

export function formatSeconds(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return r ? `${m}m ${r}s` : `${m} min`;
}
