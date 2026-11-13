/**
 * "Analyse existing data": turn a spreadsheet of past responses (a CSV file, or rows pasted
 * from Excel or Google Sheets) into a survey plus responses, so every Results page can analyse
 * it. Column types are inferred in code; personal columns (emails, phones, names) are kept out
 * of every chart and AI feature, exactly like personal questions in a PlaySurvey survey.
 */
import type { Answer, Answers, PlayerSurvey, Question } from "@/lib/player/types";

export const MAX_ROWS = 5000;
export const MAX_COLUMNS = 60;

export type ColumnKind = "timestamp" | "single" | "yes_no" | "multi" | "rating" | "nps" | "text" | "personal" | "skip";
export const KIND_LABEL: Record<ColumnKind, string> = {
  timestamp: "Time submitted",
  single: "Single choice",
  yes_no: "Yes / No",
  multi: "Multiple choice",
  rating: "Rating scale",
  nps: "0–10 (NPS)",
  text: "Written answers",
  personal: "Personal, kept private",
  skip: "Left out",
};

export type ColumnPlan = {
  index: number;
  name: string;
  kind: ColumnKind;
  /** Options in order (choice and rating columns). */
  options: string[];
  /** Numeric ratings: the lowest value maps to option 0. */
  numericMin?: number;
  /** How many rows have a value. */
  filled: number;
  /** A few values, for the preview. */
  examples: string[];
};

/* ---------------- parsing ---------------- */

/** RFC 4180-style CSV/TSV parsing: quoted fields, doubled quotes, newlines inside quotes. */
export function parseTable(text: string): { header: string[]; rows: string[][] } {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delim = firstLine.includes("\t") ? "\t" : (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === "") quoted = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    out.push(row);
  }
  const rows = out.filter((r) => r.some((v) => v.trim() !== ""));
  const header = (rows.shift() ?? []).map((h, i) => h.trim() || `Column ${i + 1}`);
  return { header, rows: rows.map((r) => header.map((_, i) => (r[i] ?? "").trim())) };
}

/* ---------------- inference ---------------- */

const PERSONAL_HEADER = /e-?mail|phone|mobile|contact|whats ?app|\bname\b|full name|roll ?(no|number)|student id|address|aadhaar|pan\b/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s()-]{8,}$/;
const TIME_HEADER = /time ?stamp|submitted|date|time/i;
const NPS_HEADER = /recommend|nps|likely/i;

/** Sentiment rank of a label, for putting text scales in order. -1 when it isn't a scale word. */
function scaleRank(v: string): number {
  const s = v.toLowerCase().trim();
  if (/^(very (dis|un)\w*|strongly disagree|very poor|terrible|awful|extremely (dis|un)\w*|very bad|never)$/.test(s)) return 0;
  if (/^(dis\w*|un\w*|disagree|poor|bad|rarely)$/.test(s)) return 1;
  if (/^(neutral|neither.*|average|fair|okay|ok|not sure|maybe|sometimes|somewhat \w+)$/.test(s)) return 2;
  if (/^(very (satisf|happy|likely|good|clear|easy|useful)\w*|strongly agree|excellent|extremely \w+|great|always)$/.test(s)) return 4;
  if (/^(satisf\w*|happy|likely|good|agree|clear|easy|useful|often|usually)$/.test(s)) return 3;
  return -1;
}

function looksLikeDate(v: string): boolean {
  if (!/\d/.test(v) || v.length < 6) return false;
  return !Number.isNaN(parseDate(v));
}
/** Dates in ISO, "d/m/yyyy h:mm:ss" (Google Forms, Indian locale) or anything Date understands. */
export function parseDate(v: string): number {
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i);
  if (m) {
    const [, a, b, y, hh = "0", mm = "0", ss = "0", ap] = m;
    let day = Number(a);
    let month = Number(b);
    if (month > 12 && day <= 12) [day, month] = [month, day];
    let hour = Number(hh) % 24;
    if (ap && /pm/i.test(ap) && hour < 12) hour += 12;
    if (ap && /am/i.test(ap) && hour === 12) hour = 0;
    const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);
    return new Date(year, month - 1, day, hour, Number(mm), Number(ss)).getTime();
  }
  const t = Date.parse(v);
  return Number.isNaN(t) ? NaN : t;
}

const splitMulti = (v: string) =>
  v
    .split(/;|,\s+|\n/)
    .map((x) => x.trim())
    .filter(Boolean);

export function inferColumns(header: string[], rows: string[][]): ColumnPlan[] {
  return header.slice(0, MAX_COLUMNS).map((name, index) => {
    const values = rows.map((r) => r[index] ?? "").filter((v) => v !== "");
    const filled = values.length;
    const distinct = [...new Set(values)];
    const examples = distinct.slice(0, 3);
    const base = { index, name, filled, examples, options: [] as string[] };
    if (!filled) return { ...base, kind: "skip" as const };

    const share = (test: (v: string) => boolean) => values.filter(test).length / filled;
    if (PERSONAL_HEADER.test(name) || share((v) => EMAIL.test(v)) > 0.5 || share((v) => PHONE.test(v)) > 0.6) return { ...base, kind: "personal" as const };
    if (TIME_HEADER.test(name) && share(looksLikeDate) > 0.8) return { ...base, kind: "timestamp" as const };

    // Numbers: 0–10 → NPS, small integer ranges → rating scale
    if (share((v) => /^-?\d+$/.test(v)) > 0.95) {
      const nums = values.map(Number);
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      if (min >= 0 && max <= 10 && max >= 8 && (min === 0 || NPS_HEADER.test(name)) && max - min >= 5) return { ...base, kind: "nps" as const, options: Array.from({ length: 11 }, (_, i) => String(i)) };
      if (min >= 0 && max <= 10 && max - min >= 2 && max - min <= 9) {
        const lo = min <= 1 ? min : 1;
        return { ...base, kind: "rating" as const, numericMin: lo, options: Array.from({ length: max - lo + 1 }, (_, i) => String(lo + i)) };
      }
    }

    // Yes / No
    if (distinct.every((v) => /^(yes|no|y|n|true|false)$/i.test(v))) return { ...base, kind: "yes_no" as const, options: ["Yes", "No"] };

    // A text scale whose words can be put in order
    if (distinct.length >= 3 && distinct.length <= 7) {
      const ranks = distinct.map(scaleRank);
      if (ranks.every((r) => r >= 0) && new Set(ranks).size === ranks.length) {
        const ordered = distinct.map((v, i) => ({ v, r: ranks[i] })).sort((a, b) => a.r - b.r).map((x) => x.v);
        return { ...base, kind: "rating" as const, options: ordered };
      }
    }

    // Multiple choice: several picks in one cell, from a short repeated list
    const multiCells = share((v) => /;|,\s/.test(v));
    if (multiCells > 0.25) {
      const items = values.flatMap(splitMulti);
      const counts = new Map<string, number>();
      items.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
      const common = [...counts].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);
      if (common.length >= 2 && common.length <= 15 && common.reduce((t, [, c]) => t + c, 0) / items.length > 0.8)
        return { ...base, kind: "multi" as const, options: common.map(([x]) => x) };
    }

    // Single choice: a short list of repeated answers (not open questions, not all-different answers)
    const avgLen = values.reduce((t, v) => t + v.length, 0) / filled;
    const openHeader = /anything else|comment|suggest|why\b|tell us|thoughts|describe|explain|improve|feedback|other\b/i.test(name);
    if (openHeader || (distinct.length === filled && filled >= 3)) return { ...base, kind: "text" as const };
    if (distinct.length >= 2 && distinct.length <= 12 && (distinct.length / filled <= 0.5 || filled < 12) && avgLen < 40) {
      const counts = distinct.map((v) => ({ v, c: values.filter((x) => x === v).length })).sort((a, b) => b.c - a.c);
      return { ...base, kind: "single" as const, options: counts.map((x) => x.v) };
    }

    return { ...base, kind: "text" as const };
  });
}

/* ---------------- building the survey and its responses ---------------- */

export type BuiltDataset = {
  survey: PlayerSurvey;
  responses: { id: string; startedAt: number | null; submittedAt: number; answers: Answers; enjoyment: number | null }[];
  questions: { open: boolean }[];
  analysed: number;
  hasTimes: boolean;
};

function answerFor(plan: ColumnPlan, raw: string): Answer | undefined {
  if (raw === "") return undefined;
  switch (plan.kind) {
    case "single": {
      const i = plan.options.indexOf(raw);
      return i >= 0 ? i : undefined;
    }
    case "yes_no":
      return /^(yes|y|true)$/i.test(raw) ? 0 : 1;
    case "rating": {
      if (plan.numericMin !== undefined) {
        const i = Number(raw) - plan.numericMin;
        return i >= 0 && i < plan.options.length ? i : undefined;
      }
      const i = plan.options.indexOf(raw);
      return i >= 0 ? i : undefined;
    }
    case "nps": {
      const n = Number(raw);
      return Number.isInteger(n) && n >= 0 && n <= 10 ? n : undefined;
    }
    case "multi": {
      const picks = splitMulti(raw)
        .map((x) => plan.options.indexOf(x))
        .filter((i) => i >= 0);
      return picks.length ? [...new Set(picks)] : undefined;
    }
    case "text":
    case "personal":
      return raw.slice(0, 2000);
    default:
      return undefined;
  }
}

function questionFor(plan: ColumnPlan, id: string): Question | null {
  const base = { id, text: plan.name, options: [] as string[], scale: null, required: false, sensitive: false, collects_personal_data: false, role: "attitude" as Question["role"] };
  switch (plan.kind) {
    case "single":
      return { ...base, type: "single_choice", options: plan.options, role: "behaviour" };
    case "yes_no":
      return { ...base, type: "yes_no", options: ["Yes", "No"], role: "behaviour" };
    case "multi":
      return { ...base, type: "multi_choice", options: plan.options };
    case "rating":
      return {
        ...base,
        type: "rating_scale",
        role: /satisf|overall|happy|rate/i.test(plan.name) ? "outcome" : "attitude",
        scale: { points: plan.options.length, min_label: plan.options[0], max_label: plan.options.at(-1) ?? "", point_labels: plan.options },
      };
    case "nps":
      return { ...base, type: "nps_0_10", role: "outcome", scale: { points: 11, min_label: "Not at all likely", max_label: "Extremely likely" } };
    case "text":
      return { ...base, type: "long_text" };
    case "personal":
      return { ...base, type: "short_text", collects_personal_data: true, role: "demographic" };
    default:
      return null;
  }
}

export function buildDataset(input: { title: string; slug: string; creator: string; rows: string[][]; plan: ColumnPlan[]; now: number }): BuiltDataset {
  const used = input.plan.filter((p) => p.kind !== "skip" && p.kind !== "timestamp");
  const timeCol = input.plan.find((p) => p.kind === "timestamp");
  const questions: Question[] = [];
  const idFor = new Map<number, string>();
  used.forEach((p) => {
    const id = `Q${questions.length + 1}`;
    const q = questionFor(p, id);
    if (q) {
      questions.push(q);
      idFor.set(p.index, id);
    }
  });
  const rows = input.rows.slice(0, MAX_ROWS);
  let hasTimes = false;
  const responses = rows.map((r, i) => {
    const answers: Answers = {};
    used.forEach((p) => {
      const id = idFor.get(p.index);
      const a = id ? answerFor(p, r[p.index] ?? "") : undefined;
      if (id && a !== undefined) answers[id] = a;
    });
    const t = timeCol ? parseDate(r[timeCol.index] ?? "") : NaN;
    if (!Number.isNaN(t)) hasTimes = true;
    return {
      id: `R-${String(i + 1).padStart(4, "0")}`,
      startedAt: null,
      submittedAt: Number.isNaN(t) ? input.now : Math.min(t, input.now),
      answers,
      enjoyment: null,
    };
  });
  const survey: PlayerSurvey = {
    slug: input.slug,
    status: "closed",
    title: input.title,
    creator: { name: input.creator },
    theme: "marigold",
    purpose_line: "",
    consent_line: "",
    questions,
    gamified: {
      style: "classic",
      playful_level: "off",
      intro: { title: input.title, start_button: "Start" },
      screens: questions.map((q, i) => ({ screen_id: `S${i + 1}`, question_ids: [q.id], transition_copy: "" })),
      items: [],
      milestones: [],
      closing: { thank_you: "", enjoyment_prompt: "", reveal_teaser: "" },
      reveal: { question_ids: [], intro_copy: "" },
    },
    aggregates: { completed: responses.length, counts: {}, isSample: false },
  };
  return {
    survey,
    responses,
    questions: questions.map((q) => ({ open: q.type === "long_text" })),
    analysed: questions.filter((q) => !q.collects_personal_data).length,
    hasTimes,
  };
}

/** A small CSV of the café sample, so people can try the import without their own file. */
export function toCsv(header: string[], rows: string[][]): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
}
