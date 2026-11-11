/**
 * Story vs plain comparison (spec §10). Every number on the results card comes from here.
 * The answer-shift alarm compares closed-question distributions between arms.
 */
import { chiSquare, holm } from "@/lib/stats/chi-square";
import { median, percent } from "@/lib/compute";
import { isOpen } from "./mechanics";
import type { Answer, Arm, Question, ResponseRecord } from "./types";

export const MIN_PER_ARM = 30;
const ALPHA = 0.05;

export type ArmStats = {
  n: number;
  completed: number;
  completionPct: number;
  medianSeconds: number;
  enjoymentMean: number | null;
  switches: number;
};

export type Comparison = {
  story: ArmStats;
  plain: ArmStats;
  enough: boolean;
  shifts: { questionId: string; pAdjusted: number; differs: boolean }[];
};

function stats(rs: ResponseRecord[]): ArmStats {
  const done = rs.filter((r) => r.completedAt);
  const seconds = done.map((r) => Math.round((Date.parse(r.completedAt!) - Date.parse(r.startedAt)) / 1000));
  const joys = done.map((r) => r.enjoyment).filter((e): e is number => typeof e === "number");
  return {
    n: rs.length,
    completed: done.length,
    completionPct: percent(done.length, rs.length),
    medianSeconds: median(seconds),
    enjoymentMean: joys.length ? Math.round((joys.reduce((s, v) => s + v, 0) / joys.length) * 10) / 10 : null,
    switches: rs.filter((r) => r.switchedToPlain).length,
  };
}

function categories(q: Question): number {
  if (q.type === "nps_0_10") return 11;
  if (q.type === "rating_scale") return q.scale?.points ?? 5;
  return q.options.length;
}

function countsFor(q: Question, rs: ResponseRecord[], option?: number): number[] {
  const answers = rs.map((r) => r.answers[q.id]).filter((a): a is Exclude<Answer, null> => a !== null && a !== undefined);
  if (option !== undefined) {
    const picked = answers.filter((a) => Array.isArray(a) && a.includes(option)).length;
    return [picked, answers.length - picked];
  }
  const counts = new Array(categories(q)).fill(0);
  for (const a of answers) if (typeof a === "number" && a >= 0 && a < counts.length) counts[a] += 1;
  return counts;
}

function questionP(q: Question, story: ResponseRecord[], plain: ResponseRecord[]): number | null {
  if (q.type === "multi_choice") {
    const ps = q.options
      .map((_, o) => chiSquare([countsFor(q, story, o), countsFor(q, plain, o)])?.p)
      .filter((p): p is number => typeof p === "number");
    return ps.length ? Math.min(...ps) : null;
  }
  return chiSquare([countsFor(q, story), countsFor(q, plain)])?.p ?? null;
}

export function compareArms(responses: ResponseRecord[], questions: Question[]): Comparison {
  const of = (arm: Arm) => responses.filter((r) => r.arm === arm);
  const storyRs = of("story");
  const plainRs = of("plain");
  const story = stats(storyRs);
  const plain = stats(plainRs);
  const enough = story.completed >= MIN_PER_ARM && plain.completed >= MIN_PER_ARM;
  if (!enough) return { story, plain, enough, shifts: [] };

  const done = (rs: ResponseRecord[]) => rs.filter((r) => r.completedAt);
  const tested = questions
    .filter((q) => !isOpen(q))
    .map((q) => ({ q, p: questionP(q, done(storyRs), done(plainRs)) }))
    .filter((x): x is { q: Question; p: number } => x.p !== null);
  const adjusted = holm(tested.map((t) => t.p));
  return {
    story,
    plain,
    enough,
    shifts: tested.map((t, i) => ({ questionId: t.q.id, pAdjusted: adjusted[i], differs: adjusted[i] < ALPHA })),
  };
}
