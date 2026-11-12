/**
 * The analysis pack for the insight_report stage (combined.system.txt): every statistic, test,
 * data-quality check and theme, computed by code before the AI writes a word. Each entry has an
 * ID the report must cite, and display strings the report must copy exactly.
 */
import { MIN_GROUP_SIZE, formatCount, percent, percentsSummingTo100, singleHighestIndex } from "@/lib/compute";
import { isOpenEnded, optionsFor, scaleLabels } from "@/lib/player/rules";
import type { PlayerSurvey, Question } from "@/lib/player/types";
import type { ThemeState } from "@/lib/studio/types";
import { FLAG_LABEL, type FlagCode, type Review, qualityFlags } from "./compute";
import type { ResultResponse } from "./data";
import { shortLabel } from "./schema";
import { summarize as summarizeThemes } from "./themes";

export type PackEntry = {
  id: string;
  kind: "quality" | "distribution" | "nps" | "crosstab" | "theme" | "minority" | "enjoyment";
  label: string;
  /** The headline figure, written exactly as the report must copy it. */
  display: string;
  base: number;
  details: string[];
  question_id?: string;
  group_question_id?: string;
  test?: { name: string; statistic: string; p: string; p_adj: string; p_adj_label: "significant" | "not_significant"; effect: string; effect_label: "negligible" | "small" | "medium" | "large" };
  small_groups?: string[];
  highest?: string | null;
  lowest?: string | null;
  quote?: { response_id: string; text: string };
};

export type AnalysisPack = {
  survey_title: string;
  decisions_informed: string[];
  n_finished: number;
  entries: PackEntry[];
  segments: { status: "not_run"; reason: string };
  methods: string[];
};

/* ---------------- statistics ---------------- */

function lnGamma(z: number): number {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const c of g) ser += c / ++y;
  x = -tmp + Math.log((2.5066282746310005 * ser) / x);
  return x;
}
/** Regularised lower incomplete gamma P(a, x). */
function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 200; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  // Continued fraction for Q, then P = 1 − Q.
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}
const chiSquareP = (x: number, df: number) => Math.max(0, Math.min(1, 1 - gammaP(df / 2, x / 2)));

/** Chi-square test of independence on a groups × 2 table (yes / no), with Cramér's V. */
function chiSquare(table: [number, number][]): { chi: number; df: number; p: number; v: number } {
  const rows = table.filter(([a, b]) => a + b > 0);
  const n = rows.reduce((s, [a, b]) => s + a + b, 0);
  const colA = rows.reduce((s, [a]) => s + a, 0);
  const colB = n - colA;
  if (rows.length < 2 || !colA || !colB) return { chi: 0, df: Math.max(1, rows.length - 1), p: 1, v: 0 };
  let chi = 0;
  for (const [a, b] of rows) {
    const t = a + b;
    const ea = (t * colA) / n;
    const eb = (t * colB) / n;
    chi += (a - ea) ** 2 / ea + (b - eb) ** 2 / eb;
  }
  const df = rows.length - 1;
  return { chi, df, p: chiSquareP(chi, df), v: Math.sqrt(chi / n) };
}
const effectLabel = (v: number) => (v < 0.1 ? "negligible" : v < 0.3 ? "small" : v < 0.5 ? "medium" : "large");
const fmtP = (p: number) => (p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`);

/* ---------------- the pack ---------------- */

const labelsOf = (q: Question) => (q.type === "rating_scale" ? scaleLabels(q) : optionsFor(q));
const picked = (a: unknown, i: number) => (Array.isArray(a) ? a.includes(i) : a === i);
const has = (a: unknown) => a !== undefined && a !== null && !(Array.isArray(a) && !a.length) && !(typeof a === "string" && !a.trim());
const isPositive = (q: Question, v: unknown) => {
  if (typeof v !== "number") return false;
  if (q.type === "nps_0_10") return v >= 9;
  const points = q.scale?.points ?? labelsOf(q).length;
  return v >= points - Math.floor(points / 2);
};

export function buildPack(input: {
  survey: PlayerSurvey;
  rows: ResultResponse[];
  review: Review;
  themes: Record<string, ThemeState | undefined>;
  decisions: string[];
}): AnalysisPack {
  const { survey, rows, review } = input;
  const flags = qualityFlags(survey, rows);
  const finished = rows.filter((r) => r.submittedAt !== null);
  const excluded = finished.filter((r) => review[r.id] === "exclude");
  const flaggedOut = finished.filter((r) => flags.has(r.id) && review[r.id] !== "keep" && review[r.id] !== "exclude");
  const used = finished.filter((r) => review[r.id] !== "exclude" && (!flags.has(r.id) || review[r.id] === "keep"));
  const n = used.length;
  const entries: PackEntry[] = [];

  // Q0 · data quality, always first.
  const left = rows.filter((r) => r.submittedAt === null && r.leftAt !== null);
  const drops = survey.questions.map((_, i) => left.filter((r) => r.leftAt === i).length);
  const dropTop = left.length ? singleHighestIndex(drops) : null;
  const byCode: Record<string, number> = {};
  flags.forEach((codes) => codes.forEach((c) => (byCode[FLAG_LABEL[c as FlagCode]] = (byCode[FLAG_LABEL[c as FlagCode]] ?? 0) + 1)));
  entries.push({
    id: "Q0",
    kind: "quality",
    label: "Completion and data quality",
    display: `${formatCount(finished.length)} of ${formatCount(rows.length)} finished (${percent(finished.length, rows.length)}%)`,
    base: rows.length,
    details: [
      dropTop !== null ? `Most people who left did so at Q${dropTop + 1} (${drops[dropTop]} of ${left.length} who left)` : left.length ? "People who left did so at several questions" : "No one left part-way",
      `${formatCount(flaggedOut.length)} flagged responses left out${Object.keys(byCode).length ? ` (${Object.entries(byCode).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(", ")})` : ""}`,
      `${formatCount(excluded.length)} excluded by the creator`,
      `${formatCount(n)} responses analysed`,
    ],
  });

  // E · one entry per closed question.
  let e = 1;
  const measures: Question[] = [];
  const groups: Question[] = [];
  for (const q of survey.questions) {
    if (isOpenEnded(q) || q.collects_personal_data) continue;
    const vals = used.map((r) => r.answers[q.id]).filter(has);
    const base = vals.length;
    if (q.type === "nps_0_10") {
      const nums = vals.filter((v): v is number => typeof v === "number");
      const pro = nums.filter((v) => v >= 9).length;
      const det = nums.filter((v) => v <= 6).length;
      const [dp, , pp] = percentsSummingTo100([det, nums.length - pro - det, pro]);
      const score = nums.length ? Math.round(((pro - det) / nums.length) * 100) : 0;
      entries.push({ id: `E${e++}`, kind: "nps", label: shortLabel(q), question_id: q.id, display: `NPS ${score > 0 ? "+" : ""}${score} (n = ${base})`, base, details: [`${pp}% promoters`, `${dp}% detractors`] });
      measures.push(q);
      continue;
    }
    const labels = labelsOf(q);
    const counts = labels.map((_, i) => vals.filter((v) => picked(v, i)).length);
    const multi = q.type === "multi_choice";
    const pcts = multi ? counts.map((c) => percent(c, base)) : percentsSummingTo100(counts);
    const top = singleHighestIndex(counts);
    if (q.type === "rating_scale") {
      const pos = vals.filter((v) => isPositive(q, v)).length;
      entries.push({
        id: `E${e++}`,
        kind: "distribution",
        label: shortLabel(q),
        question_id: q.id,
        display: `${percent(pos, base)}% positive (n = ${base})`,
        base,
        details: labels.map((l, i) => `${l} ${pcts[i]}%`),
        highest: top === null ? null : labels[top],
      });
      measures.push(q);
    } else {
      entries.push({
        id: `E${e++}`,
        kind: "distribution",
        label: shortLabel(q),
        question_id: q.id,
        display: top === null ? `No single most common answer (n = ${base})` : `“${labels[top]}” ${pcts[top]}% (n = ${base})`,
        base,
        details: labels.map((l, i) => `${l} ${pcts[i]}%${multi ? " of people" : ""}`),
        highest: top === null ? null : labels[top],
      });
      if (!multi && labels.length >= 2 && labels.length <= 8) groups.push(q);
    }
  }

  // C · group comparisons: share positive on each rating / NPS by each category question, tested.
  const tests: { entry: PackEntry; p: number }[] = [];
  let c = 1;
  for (const m of measures) {
    for (const g of groups) {
      const gl = labelsOf(g);
      const table: [number, number][] = [];
      const parts: { label: string; pct: number; n: number }[] = [];
      gl.forEach((label, i) => {
        const vals = used.filter((r) => picked(r.answers[g.id], i)).map((r) => r.answers[m.id]).filter(has);
        const pos = vals.filter((v) => isPositive(m, v)).length;
        table.push([pos, vals.length - pos]);
        parts.push({ label, pct: percent(pos, vals.length), n: vals.length });
      });
      const shown = parts.filter((p) => p.n > 0);
      if (shown.length < 2) continue;
      const t = chiSquare(table);
      const big = shown.filter((p) => p.n >= MIN_GROUP_SIZE);
      const hi = big.length ? big.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
      const lo = big.length ? big.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
      const what = m.type === "nps_0_10" ? "promoters" : "positive";
      const entry: PackEntry = {
        id: `C${c++}`,
        kind: "crosstab",
        label: `${shortLabel(m)} by ${shortLabel(g).toLowerCase()}`,
        question_id: m.id,
        group_question_id: g.id,
        display: shown.map((p) => `${p.label} ${p.pct}% ${what} (n = ${p.n})`).join("; "),
        base: shown.reduce((s, p) => s + p.n, 0),
        details: [],
        small_groups: shown.filter((p) => p.n < MIN_GROUP_SIZE).map((p) => `${p.label} (n = ${p.n})`),
        highest: hi && lo && hi !== lo ? hi.label : null,
        lowest: hi && lo && hi !== lo ? lo.label : null,
        test: { name: "Chi-square test of independence", statistic: `χ²(${t.df}) = ${t.chi.toFixed(2)}`, p: fmtP(t.p), p_adj: "", p_adj_label: "not_significant", effect: `Cramér's V = ${t.v.toFixed(2)}`, effect_label: effectLabel(t.v) },
      };
      if (hi && lo && hi !== lo) entry.details.push(`${hi.label} ${hi.pct}% vs ${lo.label} ${lo.pct}%`);
      tests.push({ entry, p: t.p });
    }
  }
  // Holm correction across every comparison in the pack.
  const order = [...tests].sort((a, b) => a.p - b.p);
  let running = 0;
  order.forEach((t, i) => {
    running = Math.max(running, Math.min(1, (order.length - i) * t.p));
    t.entry.test!.p_adj = `Holm-adjusted ${fmtP(running)}`;
    t.entry.test!.p_adj_label = running < 0.05 ? "significant" : "not_significant";
  });
  entries.push(...tests.map((t) => t.entry));

  // T · themes from the coding, and minority views.
  let th = 1;
  for (const q of survey.questions.filter((x) => isOpenEnded(x) && !x.collects_personal_data)) {
    const state = input.themes[q.id];
    if (!state) continue;
    const present = new Set(used.filter((r) => typeof r.answers[q.id] === "string" && String(r.answers[q.id]).trim()).map((r) => r.id));
    const sum = summarizeThemes(state, present);
    for (const s of sum.stats.slice(0, 5)) {
      entries.push({
        id: `T${th++}`,
        kind: "theme",
        label: s.theme.label,
        question_id: q.id,
        display: `${s.count} answers (${s.pct}% of ${sum.withContent} with content)`,
        base: sum.withContent,
        details: [s.theme.description, ...(s.tiedWith.length ? [`Tied with ${s.tiedWith.join(", ")}`] : []), ...(sum.topId === s.theme.theme_id ? ["Single most mentioned"] : [])],
        quote: s.theme.quotes[0],
      });
    }
    sum.minority.slice(0, 2).forEach((m) =>
      entries.push({ id: `T${th++}`, kind: "minority", label: "Said by one person", question_id: q.id, display: "1 answer", base: sum.withContent, details: [], quote: { response_id: m.response_id, text: m.quote } }),
    );
  }

  // Enjoyment of the survey itself.
  const enjoy = used.map((r) => r.enjoyment).filter((v): v is number => v !== null);
  if (enjoy.length) entries.push({ id: `E${e++}`, kind: "enjoyment", label: "Enjoyed the survey", display: `${percent(enjoy.filter((v) => v >= 3).length, enjoy.length)}% enjoyed it (n = ${enjoy.length})`, base: enjoy.length, details: [] });

  const ratings = survey.questions.filter((q) => q.type === "rating_scale").length;
  return {
    survey_title: survey.title,
    decisions_informed: input.decisions,
    n_finished: n,
    entries,
    segments: {
      status: "not_run",
      reason:
        n < 200
          ? `Grouping people into segments needs at least 200 responses; there are ${n}.`
          : ratings < 3
            ? "Grouping people into segments needs at least 3 rating questions to compare; this survey has fewer."
            : "Segmentation isn’t part of this prototype’s analysis yet.",
    },
    methods: ["Shares of each answer", "Net Promoter Score", "Chi-square tests with Holm correction for multiple comparisons", "Cramér's V for effect size", "Themes from coded written answers"],
  };
}
