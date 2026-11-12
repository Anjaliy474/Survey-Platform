/**
 * DEMO stand-in for the chat_with_data stage (combined.system.txt), in its two halves:
 * `plan` picks the tool calls for a question, and `write` turns the tool results into the
 * final JSON answer, copying every number exactly as the tools returned it. Code then checks
 * that grounding before the answer is shown. The Claude version replaces this file.
 */
import type { QueryResult, SearchResult, ThemeResult, ToolCall, ToolResult } from "@/lib/results/tools";
import { findFields } from "./fields";
import type { AskAnswer, AskCaveat, DashChart, SchemaField } from "./types";

export type AskPlan = {
  interpretation: string;
  alternative: string;
  calls: ToolCall[];
  declined: { request: string; reason: string } | null;
  notInSurvey: string | null;
  why: boolean;
};

const IDENTIFY = /who (said|wrote|answered|gave)|which (person|respondent|people)\b.*\b(said|wrote)|\bemails?\b|phone|names? of|identify|contact details|de-?anonymi/;
const MANIPULATE = /make .{0,40}\blook (better|higher|good|great|bigger)|inflate|boost the (numbers|score|results)|say (that )?(satisfaction|it|the score) is|hide the (negative|bad|low)|round (it )?up|pretend|fake/;
const THEMES = /complain|theme|comment|said|say\b|suggest|feedback|written|what do (people|they|customers|volunteers) (want|ask|mention)|open answers|why do people/;

export function demoPlan(question: string, fields: SchemaField[]): AskPlan {
  const t = question.toLowerCase().trim();
  const calls: ToolCall[] = [];
  let id = 1;
  const call = (c: Omit<ToolCall, "call_id">) => calls.push({ ...c, call_id: `call_${id++}` } as ToolCall);
  const why = /\bwhy\b|cause|because|lead to|drive/.test(t);
  const themed = fields.find((f) => f.type === "themes");

  if (IDENTIFY.test(t)) {
    return {
      interpretation: "A request to identify respondents or see their contact details.",
      alternative: "",
      calls: [],
      declined: { request: question, reason: "I can’t help identify people or share contact details; I can only describe answers as a group." },
      notInSurvey: null,
      why: false,
    };
  }

  const found = findFields(t, fields).filter((f) => f.type !== "date");
  const byMatch = /\b(by|per|across|for each|between|differ(s|ent)? (by|across|between)|compared? (by|across))\b(.+)$/.exec(t);
  const after = byMatch ? findFields(byMatch[0], fields) : [];
  const group = after.find((f) => f.type === "nominal" && found.length > 1) ?? null;
  const measure = found.find((f) => f !== group && f.type !== "themes") ?? null;
  const wantsThemes = THEMES.test(t) || found.some((f) => f.type === "themes");

  if (MANIPULATE.test(t)) {
    if (measure) call({ tool: "run_query", args: { measure: measure.type === "ordinal_scale" ? "positive_share" : measure.type === "nps" ? "nps" : "share", field: measure.field, group_by: null } });
    return {
      interpretation: "A request to change how the results look.",
      alternative: "",
      calls,
      declined: { request: question, reason: "I can’t change, inflate or hide results. Here’s the honest figure instead." },
      notInSurvey: null,
      why: false,
    };
  }

  if (/how many|number of (responses|people)|response count/.test(t) && !measure) {
    call({ tool: "run_query", args: { measure: "count", field: null, group_by: group?.field ?? null } });
  } else if (measure) {
    const m =
      measure.type === "ordinal_scale"
        ? /average|mean|score out of/.test(t)
          ? "mean"
          : "positive_share"
        : measure.type === "nps"
          ? "nps"
          : measure.type === "multi_choice"
            ? "mentions"
            : "share";
    call({ tool: "run_query", args: { measure: m, field: measure.field, group_by: group?.field ?? null } });
  }
  if (wantsThemes && themed) {
    const qid = themed.field.replace("themes:", "");
    call({ tool: "get_theme_summary", args: { question_id: qid } });
  }

  if (!calls.length) {
    // The asker's own words, minus the question opener: "Should we open on Sundays?" → "open on Sundays".
    const subject = question
      .trim()
      .replace(/[?.!]+$/, "")
      .replace(/^(should|could|can|would|will|do|does|did|is|are|was|were)\s+(we|i|people|they|customers|it)\s+/i, "")
      .replace(/^(what about|how about|tell me about)\s+/i, "")
      .split(/\s+/)
      .slice(0, 8)
      .join(" ");
    return {
      interpretation: `A question about “${subject}”, which this survey didn’t ask.`,
      alternative: "",
      calls: [],
      declined: null,
      notInSurvey: subject || question,
      why,
    };
  }

  const mLabel = measure?.label.toLowerCase() ?? "responses";
  return {
    interpretation: group
      ? `How ${mLabel} compares by ${group.label.toLowerCase()}.`
      : measure
        ? `How people answered about ${mLabel}${wantsThemes ? ", plus what they wrote" : ""}.`
        : "What people wrote in their open answers.",
    alternative: measure?.type === "ordinal_scale" ? (/average|mean/.test(t) ? `What share rated ${mLabel} positively?` : `What is the average ${mLabel}?`) : group ? `Overall ${mLabel}, without splitting` : "",
    calls,
    declined: null,
    notInSurvey: null,
    why,
  };
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

export function demoWrite(question: string, plan: AskPlan, results: ToolResult[], fields: SchemaField[]): AskAnswer {
  const parts: string[] = [];
  const caveats = new Set<AskCaveat>(["convenience_sample"]);
  // Short names ("Outlet", "Satisfaction") read better than full question text.
  const short = (field: string | null | undefined, fallback: string) => (fields.find((f) => f.field === field)?.label ?? fallback.replace(/\?$/, "")).toLowerCase();
  const evidence: AskAnswer["evidence"] = [];
  const quotes: AskAnswer["quotes"] = [];
  let chart: DashChart | null = null;

  if (plan.notInSurvey) {
    caveats.add("not_in_survey");
    const follow = fields.filter((f) => f.type === "ordinal_scale" || f.type === "nps").slice(0, 2).map((f) => `How do people rate ${f.label.toLowerCase()}?`);
    return {
      answer: `This survey didn’t ask anything about “${plan.notInSurvey}”, so the data can’t answer that. For your next survey, add a question that asks it directly, with labelled answer options.`,
      interpretation_used: plan.interpretation,
      evidence: [],
      quotes: [],
      caveats: [...caveats],
      flagged_responses: [],
      suggested_chart: null,
      follow_up_suggestions: follow,
      declined: { request: "", reason: "" },
    };
  }

  for (const r of results) {
    if (r.tool === "run_query") {
      const q = r.result as QueryResult;
      evidence.push({ tool: "run_query", call_id: r.call_id, used_for: "The figures in the answer" });
      const args = r.args as { field: string | null; group_by: string | null };
      const label = short(args.field, q.field_label);
      const groupLabel = short(args.group_by, q.group_label ?? "");
      if (q.group_label) {
        const ok = q.rows.filter((x) => x.n > 0);
        const small = ok.filter((x) => x.small).map((x) => x.group);
        const what = q.measure === "positive_share" ? "rated it positively" : q.measure === "nps" ? "Net Promoter Score" : q.measure === "mean" ? "average" : "share";
        parts.push(`${titleCase(label)} by ${groupLabel} (${what}): ${ok.map((x) => `${x.group} ${x.value} (n = ${x.n})`).join("; ")}.`);
        if (q.single_highest) parts.push(`${q.single_highest} is the highest.`);
        else if (ok.length > 1) parts.push("No single group is highest once small groups are set aside.");
        if (small.length) {
          caveats.add("small_group");
          parts.push(`${list(small)} ${small.length === 1 ? "has" : "have"} fewer than ${q.min_group_size} responses, so ${small.length === 1 ? "its result is" : "their results are"} unreliable.`);
        }
        chart = {
          chart_id: "ASK",
          title: `${q.measure === "nps" ? "Net Promoter Score" : q.measure === "mean" ? `Average ${label}` : titleCase(label)} by ${groupLabel}`,
          answers_question: question,
          type: q.measure === "positive_share" ? "diverging_likert" : "bar",
          x: { field: String((r.args as { group_by: string }).group_by), time_grain: "none", sort: "natural" },
          measure: { aggregate: q.measure === "positive_share" ? "share" : q.measure === "mentions" ? "mentions" : (q.measure as "nps" | "mean"), field: (r.args as { field: string }).field },
          group_by: null,
          show_n: true,
          show_uncertainty: q.measure === "mean",
          caveats: q.measure === "mean" ? ["ordinal_mean"] : [],
        };
      } else if (q.measure === "count") {
        parts.push(`${q.rows[0]?.value} people have finished the survey.`);
      } else if (q.measure === "share" || q.measure === "mentions") {
        const top = q.rows.find((x) => x.group === q.single_highest);
        if (top) parts.push(`The most common answer to “${q.field_label}” is “${top.group}” at ${top.value}, across ${q.n_total} responses.`);
        else {
          const best = [...q.rows].sort((a, b) => parseFloat(b.value) - parseFloat(a.value)).slice(0, 2);
          parts.push(`“${best[0]?.group}” and “${best[1]?.group}” are tied at the top (${best[0]?.value}), across ${q.n_total} responses.`);
        }
        if (q.measure === "mentions") parts.push("People could pick several, so the shares add up to more than the whole.");
        chart = {
          chart_id: "ASK",
          title: q.field_label,
          answers_question: question,
          type: "bar",
          x: { field: String((r.args as { field: string }).field), time_grain: "none", sort: "value_desc" },
          measure: { aggregate: q.measure, field: (r.args as { field: string }).field },
          group_by: null,
          show_n: true,
          show_uncertainty: false,
          caveats: q.measure === "mentions" ? ["multi_select"] : [],
        };
      } else {
        const row = q.rows[0];
        if (q.measure === "positive_share") parts.push(`${row.value} of people rated ${label} on the positive side, across ${row.n} responses.`);
        if (q.measure === "mean") parts.push(`The average is ${row.value}, across ${row.n} responses. An average of a rating scale hides how answers spread.`);
        if (q.measure === "nps") parts.push(`The Net Promoter Score is ${row.value}, across ${row.n} responses.`);
      }
      if (q.with_flagged) {
        caveats.add("flagged_responses");
        const w = q.with_flagged;
        const headline = q.group_label ? null : { without: q.rows[0]?.value, with: w.rows[0]?.value };
        parts.push(
          `${w.flagged_count} flagged ${w.flagged_count === 1 ? "response is" : "responses are"} left out (${list(w.reasons)})` +
            (headline && headline.without !== headline.with ? `; with them it would be ${headline.with}.` : headline ? "; including them gives the same figure." : "; “Show how this was calculated” has both versions."),
        );
      }
    }
    if (r.tool === "get_theme_summary") {
      const th = r.result as ThemeResult;
      evidence.push({ tool: "get_theme_summary", call_id: r.call_id, used_for: "What people wrote" });
      if (!th.available) parts.push(th.reason);
      else if (th.themes.length) {
        if (th.single_highest) {
          const top = th.themes.find((x) => x.label === th.single_highest)!;
          parts.push(`In the written answers, people most often mentioned “${top.label}” (${top.count} answers, ${top.share} of ${th.answers_with_content} with content).`);
        } else {
          const t2 = th.themes.slice(0, 2);
          parts.push(`In the written answers, “${t2[0].label}” and “${t2[1]?.label}” come up equally often (${t2[0].count} answers each).`);
        }
        const rest = th.themes.slice(1, 3).filter((x) => x.label !== th.single_highest);
        if (rest.length && th.single_highest) parts.push(`Next: ${rest.map((x) => `“${x.label}” (${x.count})`).join(", ")}.`);
        th.quotes.slice(0, 2).forEach((qt) => quotes.push({ response_id: qt.response_id, text: qt.text }));
      }
    }
    if (r.tool === "search_responses") {
      (r.result as SearchResult).excerpts.slice(0, 2).forEach((e) => quotes.push(e));
    }
  }

  if (plan.why) {
    caveats.add("association_not_causation");
    parts.push("This shows what goes together, not what causes it. To test a cause, change one thing for some people and compare.");
  }

  const answer = plan.declined ? `${plan.declined.reason} ${parts.join(" ")}`.trim() : parts.join(" ");
  const follow = [
    ...fields.filter((f) => f.type === "ordinal_scale").slice(0, 1).flatMap((f) => fields.filter((g) => g.type === "nominal").slice(0, 1).map((g) => `How does ${f.label.toLowerCase()} differ by ${g.label.toLowerCase()}?`)),
    ...(fields.some((f) => f.type === "themes") ? ["What do people mention most in their written answers?"] : []),
    ...(fields.some((f) => f.type === "nps") ? ["What is the Net Promoter Score?"] : []),
  ].filter((f) => f.toLowerCase() !== question.toLowerCase());

  return {
    answer,
    interpretation_used: plan.interpretation,
    evidence,
    quotes,
    caveats: [...caveats],
    flagged_responses: [],
    suggested_chart: plan.declined ? null : chart,
    follow_up_suggestions: follow.slice(0, 3),
    declined: plan.declined ?? { request: "", reason: "" },
  };
}
