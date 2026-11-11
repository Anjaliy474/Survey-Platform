/**
 * Dashboards (UI_UX_LAYOUT.md R4): code re-checks every spec the AI writes, applies filters,
 * and computes every value, n per group and small-group flag. The AI never sees or states a number.
 */
import type { DashChart, Dashboard, DashCaveat, SchemaField } from "@/lib/ai/types";
import { MIN_GROUP_SIZE, formatCount, percent, percentsSummingTo100 } from "@/lib/compute";
import { optionsFor, scaleLabels } from "@/lib/player/rules";
import type { PlayerSurvey, Question } from "@/lib/player/types";
import type { ThemeState } from "@/lib/studio/types";
import type { ResultResponse } from "./data";

const DAY = 24 * 60 * 60 * 1000;
const TYPES = new Set(["bar", "grouped_bar", "stacked_bar_100", "diverging_likert", "histogram", "line", "kpi_tile", "table"]);

/** Code's own pass over the spec: the rules hold even if the AI got one wrong. */
export function enforceRules(d: Dashboard, fields: SchemaField[], periods: number): { dashboard: Dashboard; notes: string[] } {
  const byName = new Map(fields.map((f) => [f.field, f]));
  const isPersonal = (name: string | null) => !!name && byName.get(name)?.type === "personal";
  const notes: string[] = [];
  let charts = d.charts.filter((c) => {
    const bad = isPersonal(c.x.field) || isPersonal(c.measure.field) || isPersonal(c.group_by);
    if (bad) notes.push(`“${c.title}” used personal data, so code removed it.`);
    return !bad && (c.x.field === "date" || byName.has(c.x.field));
  });
  charts = charts.map((c) => {
    const next: DashChart = { ...c, caveats: [...new Set(c.caveats)], show_n: true };
    if (!TYPES.has(next.type)) next.type = "bar";
    if (next.type === "histogram") next.type = "bar";
    const m = next.measure.field ? byName.get(next.measure.field) : undefined;
    if (next.type === "line" && periods < 5) {
      next.type = "grouped_bar";
      if (!next.caveats.includes("few_periods")) next.caveats.push("few_periods");
      notes.push(`“${c.title}” needs 5 time points for a line, so code shows bars.`);
    }
    if (m?.type === "nominal" && (next.measure.aggregate === "mean" || next.measure.aggregate === "median")) next.measure = { ...next.measure, aggregate: "share" };
    if ((m?.type === "multi_choice" || m?.type === "themes") && !next.caveats.includes("multi_select")) next.caveats.push("multi_select");
    if (m?.type === "ordinal_scale" && next.measure.aggregate === "mean" && !next.caveats.includes("ordinal_mean")) next.caveats.push("ordinal_mean");
    return next;
  });
  if (charts.length > 8) {
    notes.push("Only 8 charts fit on a dashboard; code kept the first 8.");
    charts = charts.slice(0, 8);
  }
  const filters = d.filters.filter((f) => f.field === "date" || (byName.has(f.field) && !isPersonal(f.field)));
  const caveats: DashCaveat[] = [...new Set<DashCaveat>([...d.dashboard_caveats, "convenience_sample"])];
  return { dashboard: { ...d, charts, filters, dashboard_caveats: caveats }, notes };
}

/* ---------------- filters ---------------- */

export type FilterState = { date: "all" | "7" | "30"; fields: Record<string, number | "all"> };
export const NO_FILTERS: FilterState = { date: "all", fields: {} };

export function applyFilters(rows: readonly ResultResponse[], f: FilterState, now: number): ResultResponse[] {
  return rows.filter((r) => {
    if (f.date !== "all" && (r.submittedAt ?? 0) < now - Number(f.date) * DAY) return false;
    return Object.entries(f.fields).every(([field, v]) => v === "all" || r.answers[field] === v);
  });
}

/* ---------------- chart values ---------------- */

export type Bar = { label: string; value: number; display: string; n: number; small: boolean; ci?: [number, number] };
export type ChartData =
  | { kind: "kpi"; value: string; sub: string; n: number }
  | { kind: "bars"; bars: Bar[]; max: number; unit: "%" | "score" | "avg" | "count"; n: number; scaleMax?: number }
  | { kind: "columns"; bars: { label: string; count: number; tip: string }[]; n: number }
  | { kind: "grouped"; categories: string[]; series: { label: string; n: number; small: boolean }[]; values: number[][]; n: number }
  | { kind: "stacked"; diverging: boolean; parts: string[]; rows: { label: string; n: number; small: boolean; pcts: number[]; counts: number[] }[]; n: number }
  | { kind: "line"; points: { label: string; value: number }[]; n: number }
  | { kind: "empty"; reason: string };

export type ChartContext = { survey: PlayerSurvey; rows: ResultResponse[]; fields: SchemaField[]; themes: Record<string, ThemeState | undefined>; now: number };

const qOf = (ctx: ChartContext, field: string | null) => (field ? ctx.survey.questions.find((q) => q.id === field) : undefined);
const labelsOf = (q: Question) => (q.type === "rating_scale" ? scaleLabels(q) : q.type === "nps_0_10" ? Array.from({ length: 11 }, (_, i) => String(i)) : optionsFor(q));
const picked = (a: unknown, i: number) => (Array.isArray(a) ? a.includes(i) : a === i);
const has = (a: unknown) => a !== undefined && a !== null && !(Array.isArray(a) && a.length === 0) && !(typeof a === "string" && !a.trim());

function npsOf(values: number[]): number {
  if (!values.length) return 0;
  const pro = values.filter((v) => v >= 9).length;
  const det = values.filter((v) => v <= 6).length;
  return Math.round(((pro - det) / values.length) * 100);
}
function wilson(k: number, n: number): [number, number] {
  if (!n) return [0, 0];
  const z = 1.96;
  const p = k / n;
  const den = 1 + (z * z) / n;
  const mid = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [Math.max(0, (mid - half) * 100), Math.min(100, (mid + half) * 100)];
}
function meanCi(values: number[]): [number, number, number] {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, n);
  const sd = n > 1 ? Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  const half = n > 1 ? (1.96 * sd) / Math.sqrt(n) : 0;
  return [mean, mean - half, mean + half];
}

function days(ctx: ChartContext) {
  const times = ctx.rows.map((r) => r.submittedAt as number);
  const end = new Date(times.length ? Math.max(...times) : ctx.now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(times.length ? Math.min(...times) : ctx.now);
  start.setHours(0, 0, 0, 0);
  const span = Math.min(60, Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY) + 1));
  const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
  return Array.from({ length: span }, (_, i) => {
    const from = end.getTime() - (span - 1 - i) * DAY;
    return { label: fmt.format(from), count: times.filter((t) => t >= from && t < from + DAY).length };
  });
}

/** Distinct days with responses: what "time periods available" means for the line rule. */
export function periodsAvailable(rows: readonly ResultResponse[]): number {
  return new Set(rows.filter((r) => r.submittedAt !== null).map((r) => new Date(r.submittedAt as number).toDateString())).size;
}

export function computeChart(c: DashChart, ctx: ChartContext): ChartData {
  const rows = ctx.rows;
  if (!rows.length) return { kind: "empty", reason: "No responses match the filters." };

  // Themes: mentions per theme, from the coding.
  if (c.x.field.startsWith("themes:")) {
    const qid = c.x.field.slice(7);
    const state = ctx.themes[qid];
    if (!state) return { kind: "empty", reason: `Open Themes for ${qid} first; this chart counts its themes.` };
    const ids = new Set(rows.map((r) => r.id));
    const coded = state.result.assignments.filter((a) => ids.has(a.response_id) && a.theme_ids.length);
    const n = state.result.assignments.filter((a) => ids.has(a.response_id) && a.status !== "no_content").length;
    const bars = state.result.themes
      .map((t) => {
        const count = coded.filter((a) => a.theme_ids.includes(t.theme_id)).length;
        return { label: t.label, value: percent(count, n), display: `${percent(count, n)}% (${formatCount(count)})`, n: count, small: false };
      })
      .sort((a, b) => b.value - a.value);
    return { kind: "bars", bars, max: Math.max(1, ...bars.map((b) => b.value)), unit: "%", n };
  }

  if (c.x.field === "date") {
    if (c.type === "kpi_tile") return { kind: "kpi", value: formatCount(rows.length), sub: "finished responses", n: rows.length };
    const ds = days(ctx);
    if (c.type === "line") return { kind: "line", points: ds.map((d) => ({ label: d.label, value: d.count })), n: rows.length };
    return { kind: "columns", bars: ds.map((d) => ({ label: d.label, count: d.count, tip: `${d.label}: ${formatCount(d.count)}` })), n: rows.length };
  }

  const xq = qOf(ctx, c.x.field);
  if (!xq) return { kind: "empty", reason: "This chart’s question isn’t in the survey any more." };
  const mq = qOf(ctx, c.measure.field) ?? xq;
  const agg = c.measure.aggregate;

  if (c.type === "kpi_tile") {
    const vals = rows.map((r) => r.answers[mq.id]).filter((v): v is number => typeof v === "number");
    if (agg === "nps") return { kind: "kpi", value: `${npsOf(vals) > 0 ? "+" : ""}${npsOf(vals)}`, sub: `Net Promoter Score · n = ${formatCount(vals.length)}`, n: vals.length };
    if (agg === "mean") {
      const [m] = meanCi(vals.map((v) => v + 1));
      return { kind: "kpi", value: m.toFixed(1), sub: `average on a 1–${mq.scale?.points ?? 5} scale · n = ${formatCount(vals.length)}`, n: vals.length };
    }
    const points = mq.scale?.points ?? labelsOf(mq).length;
    const pos = vals.filter((v) => v >= points - Math.floor(points / 2)).length;
    return { kind: "kpi", value: `${percent(pos, vals.length)}%`, sub: `picked the positive side · n = ${formatCount(vals.length)}`, n: vals.length };
  }

  const xLabels = labelsOf(xq);
  const sameField = mq.id === xq.id;

  // A measure per group (NPS or average by outlet).
  if (!sameField && (agg === "nps" || agg === "mean" || agg === "median")) {
    const bars: Bar[] = xLabels.map((label, i) => {
      const group = rows.filter((r) => picked(r.answers[xq.id], i));
      const vals = group.map((r) => r.answers[mq.id]).filter((v): v is number => typeof v === "number");
      const n = vals.length;
      if (agg === "nps") {
        const v = npsOf(vals);
        return { label, value: v, display: n ? `${v > 0 ? "+" : ""}${v}` : "–", n, small: n < MIN_GROUP_SIZE };
      }
      const [m, lo, hi] = meanCi(vals.map((v) => v + 1));
      return { label, value: n ? m : 0, display: n ? m.toFixed(1) : "–", n, small: n < MIN_GROUP_SIZE, ci: c.show_uncertainty && n > 1 ? [lo, hi] : undefined };
    });
    const scaleMax = agg === "nps" ? 100 : (mq.scale?.points ?? 5);
    // Groups with no one in them (for example after a filter) are left out, not flagged.
    const shown = bars.filter((b) => b.n > 0);
    return { kind: "bars", bars: shown, max: scaleMax, unit: agg === "nps" ? "score" : "avg", n: shown.reduce((a, b) => a + b.n, 0), scaleMax };
  }

  // Distribution of a scale (or category) within each group, or for everyone.
  if (c.type === "diverging_likert" || c.type === "stacked_bar_100") {
    const parts = labelsOf(mq);
    const groups = sameField ? [{ label: "Everyone", rows }] : xLabels.map((label, i) => ({ label, rows: rows.filter((r) => picked(r.answers[xq.id], i)) }));
    const out = groups.map((g) => {
      const vals = g.rows.map((r) => r.answers[mq.id]).filter(has);
      const counts = parts.map((_, i) => vals.filter((v) => picked(v, i)).length);
      return { label: g.label, n: vals.length, small: !sameField && vals.length < MIN_GROUP_SIZE, counts, pcts: percentsSummingTo100(counts) };
    });
    const shown = out.filter((r) => r.n > 0);
    return { kind: "stacked", diverging: c.type === "diverging_likert" && mq.type === "rating_scale", parts, rows: shown, n: shown.reduce((a, r) => a + r.n, 0) };
  }

  // Category shares split by a second question.
  if (c.group_by) {
    const gq = qOf(ctx, c.group_by);
    if (gq) {
      const gLabels = labelsOf(gq);
      const series = gLabels.map((label, gi) => {
        const group = rows.filter((r) => picked(r.answers[gq.id], gi) && has(r.answers[xq.id]));
        return { label, n: group.length, small: group.length < MIN_GROUP_SIZE, group };
      });
      const values = xLabels.map((_, xi) => series.map((s) => percent(s.group.filter((r) => picked(r.answers[xq.id], xi)).length, s.group.length)));
      const keep = series.map((s, i) => (s.n > 0 ? i : -1)).filter((i) => i >= 0);
      return {
        kind: "grouped",
        categories: xLabels,
        series: keep.map((i) => ({ label: series[i].label, n: series[i].n, small: series[i].small })),
        values: values.map((row) => keep.map((i) => row[i])),
        n: series.reduce((a, s) => a + s.n, 0),
      };
    }
  }

  // Shares (or mentions) of one question.
  const answered = rows.filter((r) => has(r.answers[xq.id]));
  const counts = xLabels.map((_, i) => answered.filter((r) => picked(r.answers[xq.id], i)).length);
  const multi = xq.type === "multi_choice";
  const pcts = multi ? counts.map((k) => percent(k, answered.length)) : percentsSummingTo100(counts);
  let bars: Bar[] = xLabels.map((label, i) => ({
    label,
    value: pcts[i],
    display: `${pcts[i]}% (${formatCount(counts[i])})`,
    n: counts[i],
    small: false,
    ci: c.show_uncertainty ? wilson(counts[i], answered.length) : undefined,
  }));
  if (c.x.sort === "value_desc") bars = [...bars].sort((a, b) => b.value - a.value);
  return { kind: "bars", bars, max: Math.max(1, ...bars.map((b) => b.value)), unit: "%", n: answered.length };
}

/** Flat rows for "View as table" and for table charts. */
export function tableOf(d: ChartData): { head: string[]; rows: (string | number)[][] } {
  switch (d.kind) {
    case "kpi":
      return { head: ["Measure", "Value"], rows: [[d.sub, d.value]] };
    case "bars":
      return { head: ["Group", "Value", "n"], rows: d.bars.map((b) => [b.label, b.display, b.n]) };
    case "columns":
      return { head: ["Day", "Responses"], rows: d.bars.map((b) => [b.label, b.count]) };
    case "line":
      return { head: ["Day", "Responses"], rows: d.points.map((p) => [p.label, p.value]) };
    case "grouped":
      return { head: ["Answer", ...d.series.map((s) => `${s.label} (n = ${s.n})`)], rows: d.categories.map((c, i) => [c, ...d.values[i].map((v) => `${v}%`)]) };
    case "stacked":
      return { head: ["Group", ...d.parts, "n"], rows: d.rows.map((r) => [r.label, ...r.pcts.map((p) => `${p}%`), r.n]) };
    default:
      return { head: ["Note"], rows: [[d.reason]] };
  }
}

export function smallGroups(d: ChartData): { label: string; n: number }[] {
  if (d.kind === "bars") return d.bars.filter((b) => b.small).map((b) => ({ label: b.label, n: b.n }));
  if (d.kind === "grouped") return d.series.filter((s) => s.small).map((s) => ({ label: s.label, n: s.n }));
  if (d.kind === "stacked") return d.rows.filter((r) => r.small).map((r) => ({ label: r.label, n: r.n }));
  return [];
}
