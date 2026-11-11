/**
 * DEMO stand-in for the dashboard_spec stage (combined.system.txt). It reads a plain-language
 * request against the dataset's structure (never its values) and returns the exact
 * dashboard_spec JSON: library charts only, every adaptation explained, nothing silently changed.
 * The Claude version replaces this file; code re-checks the result either way.
 */
import type { DashChart, Dashboard, DashboardRequest, DashboardSpec, SchemaField } from "./types";

type Mapping = DashboardSpec["request_mapping"][number];

const SYNONYMS: Record<string, RegExp> = {
  Outlet: /outlet|branch|store|location|city|cities|where/,
  City: /city|cities|location|where/,
  "Recommendation (NPS)": /recommend|nps|promoter|loyal/,
  Satisfaction: /satisf|happy|rating|rated/,
  "Ordered food": /food|order/,
  "Menu wishes": /menu|dish|item/,
  "First time": /first.time|new (visitor|volunteer)s?|returning/,
  Clarity: /clear|clarity|instruction/,
  "Enjoyed most": /enjoy/,
  "Likely to return": /likely|return|come back|join (the )?next/,
  "How they heard": /hear|heard|channel|source/,
  "Response date": /over time|trend|per day|daily|each day|by day|weekly|timeline/,
};
const THEMES_WORDS = /complain|theme|comment|said|suggest|feedback|open|written|what people/;
const PERSONAL_WORDS = /\bemails?\b|phone|\bnames?\b|contact|address/;
const INJECTION = /ignore (the )?(rules|previous|instructions)|bypass|show (all )?(raw|personal)|hide the caveat|remove the caveat/;

function findFields(text: string, fields: SchemaField[]): SchemaField[] {
  const t = text.toLowerCase();
  const hits = fields.filter((f) => {
    if (f.type === "personal") return false;
    if (f.type === "themes") return THEMES_WORDS.test(t);
    const syn = SYNONYMS[f.label];
    if (syn?.test(t)) return true;
    return t.includes(f.label.toLowerCase()) || t.includes(f.field.toLowerCase());
  });
  // Keep the order they appear in the request.
  return hits.sort((a, b) => position(t, a) - position(t, b));
}
function position(t: string, f: SchemaField): number {
  const m = (f.type === "themes" ? THEMES_WORDS : (SYNONYMS[f.label] ?? new RegExp(f.label.toLowerCase()))).exec(t);
  return m ? m.index : 999;
}

function splitParts(request: string): string[] {
  const out: string[] = [];
  for (const raw of request.split(/[;\n]|,(?![^(]*\))|\.(?=\s)|\balso\b|\bplus\b/i)) {
    const p = raw.trim();
    if (!p) continue;
    if (/^compare\b/i.test(p)) out.push(p);
    else out.push(...p.split(/\band\b|&/i).map((s) => s.trim()).filter(Boolean));
  }
  return out.slice(0, 12);
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const STOP = new Set(["the", "and", "per", "chart", "for"]);

class Builder {
  charts: DashChart[] = [];
  mapping: Mapping[] = [];
  questions: string[] = [];
  flags: string[] = [];
  filters = new Set<string>();
  next: number;
  constructor(
    private fields: SchemaField[],
    private periods: number,
    existing: DashChart[] = [],
  ) {
    this.charts = existing.map((c) => ({ ...c }));
    this.next = existing.reduce((m, c) => Math.max(m, Number(c.chart_id.replace(/\D/g, "")) || 0), 0) + 1;
  }
  field = (name: string) => this.fields.find((f) => f.field === name);

  add(c: Omit<DashChart, "chart_id" | "show_n" | "show_uncertainty" | "caveats"> & Partial<DashChart>): string | null {
    // The same chart already on the dashboard: point to it rather than adding a copy.
    const same = this.charts.find(
      (x) => x.type === c.type && x.x.field === c.x.field && x.measure.aggregate === c.measure.aggregate && x.measure.field === c.measure.field && x.group_by === c.group_by,
    );
    if (same) return same.chart_id;
    if (this.charts.length >= 8) return null;
    const chart: DashChart = { chart_id: `C${this.next++}`, show_n: true, show_uncertainty: false, caveats: [], ...c } as DashChart;
    this.charts.push(chart);
    return chart.chart_id;
  }

  /** One measure, optionally split by a group: the right library chart for the field types. */
  chartFor(measure: SchemaField, group: SchemaField | null, opts: { pie?: boolean; table?: boolean; average?: boolean }): { id: string | null; note: string } {
    const notes: string[] = [];
    if (opts.pie) notes.push("A pie chart isn’t in the library: bars show the same counts and are easier to compare, so this is a bar chart.");
    const by = group ? ` by ${group.label.toLowerCase()}` : "";
    if (group?.type === "nominal") this.filters.add(group.field);

    if (measure.type === "date") {
      const enough = this.periods >= 5;
      if (!enough) {
        notes.push(`A line needs at least 5 time points and there are only ${this.periods > 0 ? "a few" : "none"} so far, so this shows a bar per day.`);
        this.questions.push("Keep the responses-per-day chart while there are only a few days of answers?");
      }
      const id = this.add({
        title: "Responses per day",
        answers_question: "How many people answered each day",
        type: enough ? "line" : "grouped_bar",
        x: { field: "date", time_grain: "day", sort: "natural" },
        measure: { aggregate: "count", field: null },
        group_by: null,
        caveats: enough ? [] : ["few_periods"],
      });
      return { id, note: notes.join(" ") };
    }
    if (measure.type === "themes") {
      const id = this.add({
        title: `What people mentioned in ${measure.field.replace("themes:", "")}`,
        answers_question: "Which points come up in the written answers, and how often",
        type: opts.table ? "table" : "bar",
        x: { field: measure.field, time_grain: "none", sort: "value_desc" },
        measure: { aggregate: "mentions", field: measure.field },
        group_by: null,
        caveats: ["multi_select"],
      });
      return { id, note: notes.join(" ") };
    }
    if (measure.type === "nps") {
      const id = group
        ? this.add({
            title: `Net Promoter Score${by}`,
            answers_question: `How likely people are to recommend, compared${by}`,
            type: opts.table ? "table" : "bar",
            x: { field: group.field, time_grain: "none", sort: "natural" },
            measure: { aggregate: "nps", field: measure.field },
            group_by: null,
            show_uncertainty: false,
          })
        : this.add({
            title: "Net Promoter Score",
            answers_question: "How likely people are to recommend, as one number",
            type: "kpi_tile",
            x: { field: measure.field, time_grain: "none", sort: "natural" },
            measure: { aggregate: "nps", field: measure.field },
            group_by: null,
          });
      return { id, note: notes.join(" ") };
    }
    if (measure.type === "ordinal_scale") {
      if (opts.average) {
        notes.push("The average of a rating scale hides how answers spread, so it carries a caveat.");
        const id = this.add({
          title: `Average ${measure.label.toLowerCase()}${by}`,
          answers_question: `How ${measure.label.toLowerCase()} compares${by}, as an average`,
          type: opts.table ? "table" : "bar",
          x: { field: group?.field ?? measure.field, time_grain: "none", sort: "natural" },
          measure: { aggregate: "mean", field: measure.field },
          group_by: null,
          show_uncertainty: !!group,
          caveats: ["ordinal_mean"],
        });
        return { id, note: notes.join(" ") };
      }
      const id = this.add({
        title: `${measure.label}${by}`,
        answers_question: `How people rated ${measure.label.toLowerCase()}${group ? `, side by side${by}` : ""}`,
        type: opts.table ? "table" : opts.pie ? "stacked_bar_100" : "diverging_likert",
        x: { field: group?.field ?? measure.field, time_grain: "none", sort: "natural" },
        measure: { aggregate: "share", field: measure.field },
        group_by: null,
        show_uncertainty: false,
      });
      return { id, note: notes.join(" ") };
    }
    if (measure.type === "multi_choice") {
      const id = this.add({
        title: `${measure.label}${by}`,
        answers_question: `What people picked${by}; they could pick several`,
        type: opts.table ? "table" : group ? "grouped_bar" : "bar",
        x: { field: measure.field, time_grain: "none", sort: "value_desc" },
        measure: { aggregate: "mentions", field: measure.field },
        group_by: group?.field ?? null,
        show_uncertainty: false,
        caveats: ["multi_select"],
      });
      return { id, note: notes.join(" ") };
    }
    // nominal
    if (opts.average) notes.push(`“Average ${measure.label.toLowerCase()}” has no meaning for categories, so this shows the share of each answer instead.`);
    const id = this.add({
      title: `${measure.label}${by}`,
      answers_question: group ? `How answers to “${measure.label}” differ${by}` : `How people answered “${measure.label}”`,
      type: opts.table ? "table" : group ? "grouped_bar" : "bar",
      x: { field: measure.field, time_grain: "none", sort: "natural" },
      measure: { aggregate: "share", field: measure.field },
      group_by: group?.field ?? null,
      show_uncertainty: !!group,
    });
    return { id, note: notes.join(" ") };
  }

  part(text: string) {
    const t = text.toLowerCase();
    if (INJECTION.test(t)) {
      this.flags.push(`“${text}” asks to get around the dashboard rules; it was not followed.`);
      this.mapping.push({ requested: text, outcome: "declined", chart_ids: [], explanation: "This asks to bypass the rules that keep results honest, so it wasn’t done." });
      return;
    }
    if (PERSONAL_WORDS.test(t)) {
      this.mapping.push({ requested: text, outcome: "declined", chart_ids: [], explanation: "Personal data such as emails, phone numbers or names is never charted, tabled or filtered on." });
      return;
    }
    if (/how many|number of responses|total responses|response count|headline/.test(t) && !/\bby\b/.test(t)) {
      const id = this.add({ title: "Responses", answers_question: "How many people answered", type: "kpi_tile", x: { field: "date", time_grain: "none", sort: "natural" }, measure: { aggregate: "count", field: null }, group_by: null });
      this.mapping.push({ requested: text, outcome: id ? "fulfilled" : "declined", chart_ids: id ? [id] : [], explanation: id ? "" : "The dashboard already has 8 charts, the most it can hold." });
      return;
    }
    const pie = /\bpie|donut|doughnut/.test(t);
    const table = /\btable\b/.test(t);
    const average = /average|\bmean\b|avg/.test(t);
    const byMatch = /\b(by|per|across|for each|split by|broken down by|between)\b(.+)$/.exec(t);
    const found = findFields(t, this.fields);

    if (/^compare\b/.test(t)) {
      const groups = this.fields.filter((f) => f.type === "nominal" && f.options?.some((o) => t.includes(o.toLowerCase())));
      if (!groups.length) {
        const what = text.replace(/^compare\s+/i, "");
        this.mapping.push({ requested: text, outcome: "declined", chart_ids: [], explanation: `This survey doesn’t ask anything that tells “${what}” apart, so they can’t be compared.` });
        this.questions.push(`Which question should split the answers instead? For example ${this.fields.filter((f) => f.type === "nominal").map((f) => `“${f.label}”`).slice(0, 2).join(" or ") || "a grouping question"}.`);
        return;
      }
      const measure = found.find((f) => f.field !== groups[0].field && f.type !== "date") ?? this.fields.find((f) => f.type === "ordinal_scale") ?? this.fields.find((f) => f.type === "nps");
      if (!measure) return;
      const { id, note } = this.chartFor(measure, groups[0], { pie, table, average });
      this.mapping.push({ requested: text, outcome: "adapted", chart_ids: id ? [id] : [], explanation: `${note} It shows every ${groups[0].label.toLowerCase()} side by side, so the ones you named can be compared with the rest.`.trim() });
      return;
    }

    if (!found.length) {
      this.mapping.push({ requested: text, outcome: "declined", chart_ids: [], explanation: `We couldn’t find “${text}” among this survey’s questions.` });
      this.questions.push(`Which question did you mean by “${text}”?`);
      return;
    }
    // "X by Y": Y is the group when it's a category question; the measure is the other field.
    const after = byMatch ? findFields(byMatch[2], this.fields) : [];
    const group = after.find((f) => f.type === "nominal" && found.length > 1) ?? null;
    const measure = found.find((f) => f !== group) ?? found[0];
    const groupMissing = !!byMatch && after.length === 0;
    const groupNotCategory = !!byMatch && after.length > 0 && !group && found.length > 1;
    const { id, note } = this.chartFor(measure, group, { pie, table, average });
    const explanation = [
      note,
      groupMissing ? `This survey has no question about “${byMatch?.[2].trim()}”, so the chart shows everyone together.` : "",
      groupNotCategory ? `Only category questions can split a chart, so this shows everyone together.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    this.mapping.push({
      requested: text,
      outcome: !id ? "declined" : explanation ? "adapted" : "fulfilled",
      chart_ids: id ? [id] : [],
      explanation: id ? explanation : "The dashboard already has 8 charts, the most it can hold.",
    });
    if (!id) this.questions.push(`Remove a chart to make room for “${text}”?`);
  }
}

function overview(b: Builder, fields: SchemaField[]) {
  b.add({ title: "Responses", answers_question: "How many people answered", type: "kpi_tile", x: { field: "date", time_grain: "none", sort: "natural" }, measure: { aggregate: "count", field: null }, group_by: null });
  const nps = fields.find((f) => f.type === "nps");
  if (nps) b.chartFor(nps, null, {});
  const rating = fields.find((f) => f.type === "ordinal_scale");
  if (rating) b.add({ title: `Share positive on ${rating.label.toLowerCase()}`, answers_question: `How many rated ${rating.label.toLowerCase()} on the positive side`, type: "kpi_tile", x: { field: rating.field, time_grain: "none", sort: "natural" }, measure: { aggregate: "share", field: rating.field }, group_by: null });
  const group = fields.find((f) => f.type === "nominal" && (f.options?.length ?? 0) > 2) ?? null;
  if (rating) b.chartFor(rating, group, {});
  const first = fields.find((f) => f.type === "nominal");
  if (first) b.chartFor(first, null, {});
  const multi = fields.find((f) => f.type === "multi_choice");
  if (multi) b.chartFor(multi, null, {});
  const themes = fields.find((f) => f.type === "themes");
  if (themes) b.chartFor(themes, null, {});
  b.chartFor(fields.find((f) => f.type === "date") as SchemaField, null, {});
}

export function demoDashboard(req: DashboardRequest): DashboardSpec {
  const fields = req.schema.fields;
  const request = req.request.trim();

  if (req.mode === "edit" && req.current) {
    const b = new Builder(fields, req.schema.date_periods_available, req.current.charts);
    req.current.filters.forEach((f) => b.filters.add(f.field));
    for (const part of splitParts(request)) {
      const t = part.toLowerCase();
      // Edits name a change ("make … a table", "remove …"); anything else asks for a new chart.
      const isEdit = /\b(make|change|turn|switch|convert|remove|delete|drop|hide)\b/.test(t);
      const score = (c: DashChart) => {
        const words = c.title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
        return words.length ? words.filter((w) => t.includes(w)).length / words.length : 0;
      };
      const ranked = b.charts.map((c) => ({ c, s: score(c) })).filter((x) => x.s > 0).sort((a, z) => z.s - a.s);
      const target = isEdit ? ranked[0]?.c : undefined;
      const remove = /\b(remove|delete|drop|hide)\b/.test(t);
      const toTable = /\btable\b/.test(t);
      const toBar = /\bbar\b|\bpie\b/.test(t);
      if (target && (remove || toTable || toBar)) {
        if (remove) b.charts = b.charts.filter((c) => c !== target);
        else target.type = toTable ? "table" : target.type === "table" ? "bar" : target.type;
        const pieNote = /\bpie\b/.test(t) ? "A pie chart isn’t in the library, so it stays a bar chart." : "";
        b.mapping.push({ requested: part, outcome: pieNote ? "adapted" : "fulfilled", chart_ids: remove ? [] : [target.chart_id], explanation: pieNote });
      } else b.part(part);
    }
    return finish(b, req.current.title, req.current.description, fields, "edit");
  }

  const b = new Builder(fields, req.schema.date_periods_available);
  if (!request || /^(overview|summary|everything|default|a dashboard)$/i.test(request)) {
    overview(b, fields);
    b.mapping.push({ requested: request || "An overview", outcome: "fulfilled", chart_ids: b.charts.map((c) => c.chart_id), explanation: "" });
  } else for (const part of splitParts(request)) b.part(part);
  return finish(b, request ? titleCase(request.length > 60 ? `${request.slice(0, 57)}…` : request) : "Survey overview", "A dashboard built from your request; every number on it is computed from the responses.", fields, "create");
}

function finish(b: Builder, title: string, description: string, fields: SchemaField[], mode: "create" | "edit"): DashboardSpec {
  const filters: Dashboard["filters"] = [...b.filters].map((field) => ({ field, control: "dropdown" as const }));
  if (fields.some((f) => f.type === "date")) filters.push({ field: "date", control: "date_range" });
  return {
    mode,
    dashboard: { title, description, filters, charts: b.charts, dashboard_caveats: ["convenience_sample"] },
    request_mapping: b.mapping,
    questions_for_analyst: [...new Set(b.questions)],
    flags: b.flags,
  };
}
