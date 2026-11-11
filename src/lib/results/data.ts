/**
 * Response data for the Results pages. Two sources until the backend exists:
 * - the built-in samples: a deterministic, seeded set of responses whose totals match the
 *   Studio's sample stats exactly (412 started / 371 finished for the café, and so on)
 * - surveys published in this browser: the responses the Player recorded here
 * Either way the pages get raw rows; every number on screen is computed from them.
 */
import type { StoredResponse } from "@/lib/player/published-store";
import type { Answer, Answers, PlayerSurvey, Question } from "@/lib/player/types";

export type ResultResponse = {
  id: string;
  startedAt: number;
  /** null = started but left before submitting. */
  submittedAt: number | null;
  /** For people who left: the index of the question they stopped at. */
  leftAt: number | null;
  /** Time from start to submit, in seconds. */
  seconds: number | null;
  answers: Answers;
  enjoyment: number | null;
};

export type Dataset = { survey: PlayerSurvey; responses: ResultResponse[]; isSample: boolean };

const DAY = 24 * 60 * 60 * 1000;

/* ---------------- seeded randomness (same sample every visit) ---------------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

function weighted(rand: () => number, weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/* ---------------- sample specs ---------------- */

type OpenPool = { rate: number; pool: readonly [string, number][]; once?: readonly string[] };
type Spec = {
  started: number;
  /** Completed responses per day, oldest first; the last day is `endDaysAgo` days before now. */
  days: readonly number[];
  endDaysAgo: number;
  /** People who left, per question index. Adds up to started − finished. */
  leftAt: readonly number[];
  weights: Record<string, readonly number[]>;
  open: Record<string, OpenPool>;
  emails?: { id: string; rate: number };
  plants: { speeders: number; duplicates: number; straightLiners: number; lowEffort: number };
  enjoyment: readonly number[];
};

const CAFE_OPEN: OpenPool = {
  rate: 0.7,
  pool: [
    ["Please add a proper breakfast menu, eggs and toast would be great", 9],
    ["A brunch menu on weekends would bring me in more often", 9],
    ["Breakfast plates before class would be amazing", 7],
    ["Would love poha or upma in the morning", 6],
    ["More breakfast options please", 8],
    ["Weekend brunch!", 5],
    ["A quiet corner to study would be nice, it gets very loud", 8],
    ["Too noisy in the evenings to study or work", 7],
    ["Need more tables with plugs so we can study here", 6],
    ["A silent study area upstairs would be great", 5],
    ["Open earlier, 10 am is too late for us", 6],
    ["Please open by 8, I pass by on the way to college", 5],
    ["Opening time is too late on Sundays", 5],
    ["Service was slow when it got busy", 5],
    ["Waited a long time for a cold coffee at lunch", 4],
    ["The billing queue is long at lunch", 3],
    ["Wifi keeps disconnecting", 4],
    ["Better wifi and more charging points", 4],
    ["Prices went up a lot recently", 4],
    ["A bit expensive for students, maybe a student discount?", 4],
    ["Staff are always friendly, thank you", 5],
    ["Love the cold coffee, please keep it the same", 4],
    ["More seating outside would be nice", 3],
    ["Nothing, all good", 5],
  ],
  once: ["a board-games corner", "Call me on 98480 12345 if you start delivery"],
};

const VOLUNTEER_OPEN: OpenPool = {
  rate: 0.75,
  pool: [
    ["Start earlier, it got very hot by 11", 3],
    ["More water stations please", 3],
    ["Clearer instructions on how deep to dig", 2],
    ["More shovels, we had to wait for tools", 2],
    ["A shuttle from the metro station would help", 1],
    ["Nothing, it was well organised", 1],
  ],
};

const SPECS: Record<string, Spec> = {
  "cafe-feedback": {
    started: 412,
    days: [38, 52, 61, 47, 55, 64, 54],
    endDaysAgo: 0,
    leftAt: [3, 2, 9, 3, 19, 5],
    weights: {
      Q1: [31, 34, 20, 15],
      Q2: [12, 27, 64, 158, 110],
      Q3: [4, 3, 5, 7, 9, 22, 30, 52, 70, 54, 48],
      Q4: [208, 163],
      Q5: [0.38, 0.21, 0.33, 0.26, 0.28, 0.08],
    },
    open: { Q6: CAFE_OPEN },
    plants: { speeders: 9, duplicates: 3, straightLiners: 0, lowEffort: 4 },
    enjoyment: [3, 6, 22, 44, 25],
  },
  "volunteer-feedback": {
    started: 17,
    days: [0, 0, 0, 0, 3, 6, 5],
    endDaysAgo: 0,
    leftAt: [0, 1, 0, 1, 0, 1, 0],
    weights: {
      Q1: [9, 5],
      Q2: [0, 1, 2, 6, 5],
      Q3: [0, 2, 3, 6, 3],
      Q4: [0.7, 0.5, 0.3, 0.55, 0.02],
      Q5: [0, 1, 3, 6, 4],
    },
    open: { Q7: VOLUNTEER_OPEN },
    emails: { id: "Q6", rate: 0.45 },
    plants: { speeders: 1, duplicates: 0, straightLiners: 1, lowEffort: 0 },
    enjoyment: [0, 1, 3, 6, 4],
  },
  "canteen-menu-poll": {
    started: 160,
    days: [12, 25, 31, 18, 14, 9, 11, 7, 5, 4, 2, 3, 1],
    endDaysAgo: 20,
    leftAt: [2, 1, 4, 2, 7, 2],
    weights: {
      Q1: [40, 30, 18, 12],
      Q2: [8, 15, 30, 55, 34],
      Q3: [3, 2, 4, 6, 8, 14, 18, 25, 26, 20, 16],
      Q4: [80, 62],
      Q5: [0.3, 0.25, 0.4, 0.3, 0.2, 0.1],
    },
    open: { Q6: { rate: 0.5, pool: CAFE_OPEN.pool.slice(10, 24) } },
    plants: { speeders: 4, duplicates: 1, straightLiners: 0, lowEffort: 2 },
    enjoyment: [2, 4, 15, 30, 20],
  },
};

const NAMES = ["priya.k", "rahul.m", "anita.r", "vikram.s", "meera.j", "arjun.p", "sana.f", "kiran.d", "neha.t", "rohit.b"];
const LOW_EFFORT = ["asdfgh", "....", "hjkhjk", "aaaaaa"];

function answerFor(q: Question, rand: () => number, spec: Spec, index: number): Answer | undefined {
  const w = spec.weights[q.id];
  switch (q.type) {
    case "single_choice":
    case "yes_no":
    case "number_band":
    case "rating_scale":
    case "nps_0_10":
      return weighted(rand, w ?? Array.from({ length: q.type === "nps_0_10" ? 11 : (q.scale?.points ?? q.options.length) || 2 }, () => 1));
    case "multi_choice": {
      const probs = w ?? q.options.map(() => 0.3);
      const exclusive = q.options.findIndex((o) => /^(nothing|none)/i.test(o));
      if (exclusive >= 0 && rand() < probs[exclusive]) return [exclusive];
      let picks = q.options.map((_, i) => i).filter((i) => i !== exclusive && rand() < probs[i]);
      if (picks.length === 0) picks = [weighted(rand, probs.map((p, i) => (i === exclusive ? 0 : p)))];
      return picks.slice(0, q.max_choices ?? picks.length);
    }
    case "short_text":
      if (spec.emails?.id === q.id) return rand() < spec.emails.rate ? `${NAMES[index % NAMES.length]}@example.com` : undefined;
      return undefined;
    case "long_text": {
      const open = spec.open[q.id];
      if (!open || rand() >= open.rate) return undefined;
      return open.pool[weighted(rand, open.pool.map(([, n]) => n))][0];
    }
  }
}

function generate(survey: PlayerSurvey, spec: Spec, now: number): ResultResponse[] {
  const rand = mulberry32(hash(survey.slug));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const lastDay = today.getTime() - spec.endDaysAgo * DAY;
  const firstDay = lastDay - (spec.days.length - 1) * DAY;
  const qs = survey.questions;
  const estimate = qs.reduce((t, q) => t + (q.type === "long_text" || q.type === "short_text" ? 45 : 10), 0);
  const rows: (Omit<ResultResponse, "id"> & { day?: number })[] = [];

  spec.days.forEach((count, d) => {
    const dayStart = firstDay + d * DAY;
    for (let k = 0; k < count; k++) {
      // Daytime answers; today's stop at the current time.
      const latest = d === spec.days.length - 1 && spec.endDaysAgo === 0 ? Math.max(dayStart + 60_000, now - 60_000) : dayStart + 22 * 3600_000;
      const submittedAt = Math.min(latest, dayStart + (8 + rand() * 14) * 3600_000);
      const seconds = Math.round(estimate * (0.55 + rand() * 0.9));
      const answers: Answers = {};
      qs.forEach((q) => {
        const a = answerFor(q, rand, spec, rows.length);
        if (a !== undefined) answers[q.id] = a;
      });
      rows.push({ day: d, startedAt: submittedAt - seconds * 1000, submittedAt, leftAt: null, seconds, answers, enjoyment: rand() < 0.8 ? weighted(rand, spec.enjoyment) : null });
    }
  });

  // Quality problems the checks should find (code finds them; nothing is labelled here).
  const done = rows.slice();
  const pickRow = () => done[Math.floor(rand() * done.length)];
  for (let i = 0; i < spec.plants.speeders; i++) {
    const r = pickRow();
    r.seconds = 8 + Math.floor(rand() * 10);
    r.startedAt = (r.submittedAt ?? 0) - r.seconds * 1000;
  }
  for (let i = 0; i < spec.plants.straightLiners; i++) {
    const r = pickRow();
    qs.filter((q) => q.type === "rating_scale").forEach((q) => (r.answers[q.id] = 4));
  }
  const openQ = qs.find((q) => q.type === "long_text");
  for (let i = 0; i < spec.plants.lowEffort && openQ; i++) pickRow().answers[openQ.id] = LOW_EFFORT[i % LOW_EFFORT.length];
  // Duplicates: a row from the same day re-submits another's answers two minutes later, so the
  // daily and total counts stay exact.
  for (let i = 0; i < spec.plants.duplicates; i++) {
    const original = pickRow();
    const twin = done.find((r) => r !== original && r.day === original.day && r.seconds !== null);
    if (!twin) continue;
    const at = Math.min((original.submittedAt ?? 0) + 2 * 60_000, now);
    twin.answers = { ...original.answers };
    twin.submittedAt = at;
    twin.startedAt = at - (twin.seconds ?? 60) * 1000;
  }
  // Once-only answers (a minority mention, and one with a phone number to mask).
  const once = openQ ? (spec.open[openQ.id]?.once ?? []) : [];
  once.forEach((text, i) => {
    const r = done[(i * 37 + 11) % done.length];
    if (openQ) r.answers[openQ.id] = text;
  });

  // People who left part-way.
  spec.leftAt.forEach((count, qi) => {
    for (let k = 0; k < count; k++) {
      const startedAt = firstDay + Math.floor(rand() * spec.days.length) * DAY + (8 + rand() * 13) * 3600_000;
      const answers: Answers = {};
      qs.slice(0, qi).forEach((q) => {
        const a = answerFor(q, rand, spec, rows.length);
        if (a !== undefined) answers[q.id] = a;
      });
      rows.push({ startedAt: Math.min(startedAt, now - 120_000), submittedAt: null, leftAt: qi, seconds: null, answers, enjoyment: null });
    }
  });

  rows.sort((a, b) => a.startedAt - b.startedAt);
  return rows.map((r, i) => ({
    id: `R-${String(i + 1).padStart(4, "0")}`,
    startedAt: r.startedAt,
    submittedAt: r.submittedAt,
    leftAt: r.leftAt,
    seconds: r.seconds,
    answers: r.answers,
    enjoyment: r.enjoyment,
  }));
}

const cache = new Map<string, { day: number; data: ResultResponse[] }>();

/** The sample responses for a built-in survey, or null. Stable for the day. */
export function sampleResponses(survey: PlayerSurvey, now: number): ResultResponse[] | null {
  const spec = SPECS[survey.slug];
  if (!spec) return null;
  if (spec.started !== spec.days.reduce((a, b) => a + b, 0) + spec.leftAt.reduce((a, b) => a + b, 0))
    throw new Error(`Sample data for ${survey.slug}: finished per day + people who left must equal started`);
  const day = Math.floor(now / DAY);
  const hit = cache.get(survey.slug);
  if (hit && hit.day === day) return hit.data;
  const data = generate(survey, spec, now);
  cache.set(survey.slug, { day, data });
  return data;
}

/** Responses the Player recorded in this browser. */
export function localResponses(stored: readonly StoredResponse[]): ResultResponse[] {
  return stored.map((r) => ({
    id: r.id,
    startedAt: r.startedAt ?? r.submittedAt,
    submittedAt: r.submittedAt,
    leftAt: null,
    seconds: r.startedAt ? Math.max(1, Math.round((r.submittedAt - r.startedAt) / 1000)) : null,
    answers: r.answers,
    enjoyment: r.enjoyment,
  }));
}
