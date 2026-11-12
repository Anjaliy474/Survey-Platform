/**
 * The chat_with_data tools (combined.system.txt), run by code. The AI asks for them; code
 * computes and returns figures as display strings, which the AI must copy exactly. Results come
 * back both with and without flagged responses when any are flagged.
 */
import { maskPersonalData } from "@/lib/ai/masking";
import { MIN_GROUP_SIZE, formatCount, percent, percentsSummingTo100, singleHighestIndex } from "@/lib/compute";
import { optionsFor, scaleLabels } from "@/lib/player/rules";
import type { PlayerSurvey, Question } from "@/lib/player/types";
import type { ThemeState } from "@/lib/studio/types";
import { FLAG_LABEL, type Review, qualityFlags } from "./compute";
import type { ResultResponse } from "./data";
import { summarize as summarizeThemes } from "./themes";

export type Measure = "count" | "share" | "positive_share" | "mean" | "nps" | "mentions";
export type ToolCall =
  | { call_id: string; tool: "run_query"; args: { measure: Measure; field: string | null; group_by: string | null } }
  | { call_id: string; tool: "get_theme_summary"; args: { question_id: string } }
  | { call_id: string; tool: "search_responses"; args: { question_id: string; text: string } };

export type QueryRow = { group: string; value: string; n: number; small: boolean };
export type QueryResult = {
  measure: Measure;
  field_label: string;
  group_label: string | null;
  rows: QueryRow[];
  n_total: number;
  single_highest: string | null;
  min_group_size: number;
  with_flagged: { rows: QueryRow[]; n_total: number; flagged_count: number; reasons: string[] } | null;
};
export type ThemeResult =
  | { available: false; reason: string }
  | {
      available: true;
      question: string;
      answers_with_content: number;
      themes: { label: string; count: number; share: string; tied_with: string[] }[];
      single_highest: string | null;
      quotes: { response_id: string; text: string; theme: string }[];
    };
export type SearchResult = { excerpts: { response_id: string; text: string }[]; note: string };
export type ToolResult = { call_id: string; tool: ToolCall["tool"]; args: ToolCall["args"]; plain: string; result: QueryResult | ThemeResult | SearchResult };

export type ToolContext = { survey: PlayerSurvey; rows: ResultResponse[]; review: Review; themes: Record<string, ThemeState | undefined> };

const PLAIN: Record<ToolCall["tool"], string> = { run_query: "Counting answers", get_theme_summary: "Reading themes", search_responses: "Finding quotes" };

const labelsOf = (q: Question) => (q.type === "rating_scale" ? scaleLabels(q) : optionsFor(q));
const picked = (a: unknown, i: number) => (Array.isArray(a) ? a.includes(i) : a === i);
const has = (a: unknown) => a !== undefined && a !== null && !(Array.isArray(a) && !a.length) && !(typeof a === "string" && !a.trim());

function measureRows(measure: Measure, q: Question | undefined, groups: { label: string; rows: ResultResponse[] }[]): QueryRow[] {
  const out: QueryRow[] = [];
  for (const g of groups) {
    const vals = q ? g.rows.map((r) => r.answers[q.id]).filter(has) : g.rows;
    const n = vals.length;
    let value = "";
    if (measure === "count" || !q) value = formatCount(g.rows.length);
    else if (measure === "positive_share") {
      const points = q.scale?.points ?? labelsOf(q).length;
      const pos = vals.filter((v) => typeof v === "number" && v >= points - Math.floor(points / 2)).length;
      value = `${percent(pos, n)}%`;
    } else if (measure === "mean") {
      const nums = vals.filter((v): v is number => typeof v === "number").map((v) => v + 1);
      value = nums.length ? `${(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)} out of ${q.scale?.points ?? 5}` : "–";
    } else if (measure === "nps") {
      const nums = vals.filter((v): v is number => typeof v === "number");
      const score = nums.length ? Math.round(((nums.filter((v) => v >= 9).length - nums.filter((v) => v <= 6).length) / nums.length) * 100) : 0;
      value = `${score > 0 ? "+" : ""}${score}`;
    }
    out.push({ group: g.label, value, n: measure === "count" ? g.rows.length : n, small: groups.length > 1 && (measure === "count" ? g.rows.length : n) < MIN_GROUP_SIZE });
  }
  return out;
}

function runQuery(args: { measure: Measure; field: string | null; group_by: string | null }, ctx: ToolContext, rows: ResultResponse[]): Omit<QueryResult, "with_flagged"> {
  const q = ctx.survey.questions.find((x) => x.id === args.field);
  const g = ctx.survey.questions.find((x) => x.id === args.group_by);
  const fieldLabel = q?.text ?? "responses";

  // Distribution of one question (share / mentions): one row per answer.
  if (q && (args.measure === "share" || args.measure === "mentions") && !g) {
    const answered = rows.filter((r) => has(r.answers[q.id]));
    const labels = labelsOf(q);
    const counts = labels.map((_, i) => answered.filter((r) => picked(r.answers[q.id], i)).length);
    const pcts = args.measure === "mentions" ? counts.map((c) => percent(c, answered.length)) : percentsSummingTo100(counts);
    const top = singleHighestIndex(counts);
    return {
      measure: args.measure,
      field_label: fieldLabel,
      group_label: null,
      rows: labels.map((label, i) => ({ group: label, value: `${pcts[i]}%`, n: counts[i], small: false })),
      n_total: answered.length,
      single_highest: top === null ? null : labels[top],
      min_group_size: MIN_GROUP_SIZE,
    };
  }
  const groups = g ? labelsOf(g).map((label, i) => ({ label, rows: rows.filter((r) => picked(r.answers[g.id], i)) })) : [{ label: "Everyone", rows }];
  const out = measureRows(args.measure, q, groups);
  const numeric = out.map((r) => (r.small ? -Infinity : parseFloat(r.value.replace(/[^\d.+-]/g, ""))));
  const top = g ? singleHighestIndex(numeric) : null;
  return {
    measure: args.measure,
    field_label: fieldLabel,
    group_label: g?.text ?? null,
    rows: out,
    n_total: out.reduce((a, r) => a + r.n, 0),
    single_highest: top === null ? null : out[top].group,
    min_group_size: MIN_GROUP_SIZE,
  };
}

export function runTools(calls: ToolCall[], ctx: ToolContext): ToolResult[] {
  const finished = ctx.rows.filter((r) => r.submittedAt !== null && ctx.review[r.id] !== "exclude");
  const flags = qualityFlags(ctx.survey, ctx.rows);
  const kept = finished.filter((r) => !flags.has(r.id) || ctx.review[r.id] === "keep");
  const flaggedHere = finished.filter((r) => flags.has(r.id) && ctx.review[r.id] !== "keep");

  return calls.map((call) => {
    if (call.tool === "run_query") {
      const base = runQuery(call.args, ctx, kept);
      const withAll = flaggedHere.length ? runQuery(call.args, ctx, finished) : null;
      const reasons = [...new Set(flaggedHere.flatMap((r) => (flags.get(r.id) ?? []).map((c) => FLAG_LABEL[c].toLowerCase())))];
      return {
        call_id: call.call_id,
        tool: call.tool,
        args: call.args,
        plain: PLAIN.run_query,
        result: { ...base, with_flagged: withAll ? { rows: withAll.rows, n_total: withAll.n_total, flagged_count: flaggedHere.length, reasons } : null },
      };
    }
    if (call.tool === "get_theme_summary") {
      const state = ctx.themes[call.args.question_id];
      const q = ctx.survey.questions.find((x) => x.id === call.args.question_id);
      if (!state || !q) {
        return { call_id: call.call_id, tool: call.tool, args: call.args, plain: PLAIN.get_theme_summary, result: { available: false, reason: "Themes haven’t been found for this question yet. Open the Themes tab first." } };
      }
      const present = new Set(finished.filter((r) => typeof r.answers[q.id] === "string" && String(r.answers[q.id]).trim()).map((r) => r.id));
      const sum = summarizeThemes(state, present);
      return {
        call_id: call.call_id,
        tool: call.tool,
        args: call.args,
        plain: PLAIN.get_theme_summary,
        result: {
          available: true,
          question: q.text,
          answers_with_content: sum.withContent,
          themes: sum.stats.map((s) => ({ label: s.theme.label, count: s.count, share: `${s.pct}%`, tied_with: s.tiedWith })),
          single_highest: sum.topId ? (sum.stats.find((s) => s.theme.theme_id === sum.topId)?.theme.label ?? null) : null,
          quotes: sum.stats.slice(0, 3).flatMap((s) => s.theme.quotes.slice(0, 1).map((qt) => ({ response_id: qt.response_id, text: qt.text, theme: s.theme.label }))),
        },
      };
    }
    const q = ctx.survey.questions.find((x) => x.id === call.args.question_id);
    const words = call.args.text.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const excerpts = q
      ? finished
          .map((r) => ({ response_id: r.id, text: typeof r.answers[q.id] === "string" ? maskPersonalData(String(r.answers[q.id])) : "" }))
          .filter((e) => e.text && words.some((w) => e.text.toLowerCase().includes(w)))
          .slice(0, 5)
      : [];
    return { call_id: call.call_id, tool: call.tool, args: call.args, plain: PLAIN.search_responses, result: { excerpts, note: "A sample of matching answers, for quotes only; never counted." } };
  });
}
