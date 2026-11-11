/**
 * The compute layer.
 *
 * Every number PlaySurvey shows comes from functions like these, never from the AI
 * (DESIGN.md rule 2: "Numbers come from code, words come from AI").
 */

/** Rules-engine timing from the PRD labelling defaults. */
export const SECONDS_PER_CLOSED = 10;
export const SECONDS_PER_OPEN = 45;
/** Aggregate reveal and per-group thresholds (PRD §3.1). */
export const MIN_RESPONSES_FOR_REVEAL = 20;
export const MIN_GROUP_SIZE = 10;

export function sum(values: readonly number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

/** Whole-number percentage of `part` in `whole` (0 when there is no base). */
export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/**
 * Whole-number percentages for one distribution that add up to exactly 100
 * (largest-remainder method), so a two-option result never reads 58% + 41%.
 */
export function percentsSummingTo100(counts: readonly number[]): number[] {
  const total = sum(counts);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((c) => (c / total) * 100);
  const result = raw.map((r) => Math.floor(r));
  let remainder = 100 - sum(result);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    result[i] += 1;
    remainder -= 1;
  }
  return result;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Index of the single highest value, or null when the top value is shared.
 * The product never calls something "the top" unless code says it is.
 */
export function singleHighestIndex(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const max = Math.max(...values);
  const at = values.flatMap((v, i) => (v === max ? [i] : []));
  return at.length === 1 ? at[0] : null;
}

/** Time budget for a set of questions: 10 s per closed question, 45 s per open one. */
export function estimateSeconds(questions: readonly { open: boolean }[]): number {
  return questions.reduce((total, q) => total + (q.open ? SECONDS_PER_OPEN : SECONDS_PER_CLOSED), 0);
}

/** "30s", "1.5 min", "2 min" (rounded to 5 s under a minute, to half-minutes above). */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.max(5, Math.round(seconds / 5) * 5)}s`;
  return `${Math.round(seconds / 30) / 2} min`;
}

/** "about 30s", "about 1.5 min", "about 2 min". */
export function formatAbout(seconds: number): string {
  return `about ${formatDuration(seconds)}`;
}

const countFormat = new Intl.NumberFormat("en-US");
/** 1248 → "1,248". Indian grouping (1,24,800) only when a creator turns it on. */
export function formatCount(n: number): string {
  return countFormat.format(n);
}
