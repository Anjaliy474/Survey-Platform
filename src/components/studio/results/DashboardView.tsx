"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, ChatCircleText, Check, Info, LinkSimple, Sparkle, Table, Warning, X } from "@/components/icons";
import { Badge, ComputedMark } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { buildDashboard } from "@/lib/ai/client";
import type { DashCaveat, DashChart } from "@/lib/ai/types";
import { useNowMinute } from "@/lib/client-hooks";
import { formatCount } from "@/lib/compute";
import { qualityFlags } from "@/lib/results/compute";
import { type FilterState, NO_FILTERS, applyFilters, computeChart, periodsAvailable, smallGroups, tableOf } from "@/lib/results/dashboard";
import { fieldsFor } from "@/lib/results/schema";
import { surveyHref } from "@/lib/studio/sections";
import { studio } from "@/lib/studio/store";
import type { DashboardState, StudioSurvey } from "@/lib/studio/types";
import { ResultsTabs } from "../ResultsTabs";
import { TopBar } from "../TopBar";
import { DashChartBody } from "./dash-charts";
import { useResultsData } from "./ResultsView";

const CAVEAT_TEXT: Record<DashCaveat, string> = {
  few_periods: "Only a few time points",
  small_group: "Small group",
  ordinal_mean: "Average of a rating scale",
  multi_select: "People could pick several",
  flagged_responses_included: "Includes flagged responses",
  convenience_sample: "Self-selected sample",
};
const OUTCOME = { fulfilled: "Done", adapted: "Adapted", declined: "Not possible" } as const;
const span = (c: DashChart) => (c.type === "kpi_tile" ? 3 : c.type === "line" || c.type === "table" || c.type === "grouped_bar" ? 12 : 6);

/**
 * R4 Dashboard (UI_UX_LAYOUT.md): describe it in words, get library charts. The AI writes the
 * spec from the questions' structure; code checks the rules again and computes every value.
 */
export function DashboardView({ survey }: { survey: StudioSurvey }) {
  const toast = useToast();
  const now = useNowMinute();
  const { player, rows: all } = useResultsData(survey);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<FilterState>(NO_FILTERS);
  const [tables, setTables] = useState<string[]>([]);
  const [mapOpen, setMapOpen] = useState(true);
  const state = survey.dashboard;

  const review = survey.review;
  const rows = useMemo(() => {
    if (!player) return [];
    const flags = qualityFlags(player, all);
    return all.filter((r) => r.submittedAt !== null && review?.[r.id] !== "exclude" && (!flags.has(r.id) || review?.[r.id] === "keep"));
  }, [player, all, review]);
  const themedIds = useMemo(() => new Set(Object.keys(survey.themes ?? {})), [survey.themes]);
  const fields = useMemo(() => (player ? fieldsFor(player, themedIds) : []), [player, themedIds]);
  const periods = periodsAvailable(rows);
  const filtered = useMemo(() => (now ? applyFilters(rows, filters, now) : rows), [rows, filters, now]);

  const examples = useMemo(() => {
    const rating = fields.find((f) => f.type === "ordinal_scale");
    const group = fields.find((f) => f.type === "nominal" && (f.options?.length ?? 0) > 2) ?? fields.find((f) => f.type === "nominal");
    const list: string[] = [];
    if (rating && group) list.push(`${rating.label} by ${group.label.toLowerCase()}`);
    if (fields.some((f) => f.type === "themes")) list.push("Top complaints");
    if (fields.some((f) => f.type === "nps")) list.push("A pie chart of recommendation");
    list.push("Compare first years and final years", "Responses over time");
    return list.slice(0, 4);
  }, [fields]);

  const save = (fn: (prev: DashboardState | undefined) => DashboardState | undefined) =>
    studio.patch(survey.id, (s) => {
      const next = fn(s.dashboard);
      return { dashboard: next };
    });

  async function run(request: string) {
    if (!player || busy) return;
    const mode = state && request.trim() ? "edit" : "create";
    setBusy(true);
    setError(false);
    const res = await buildDashboard({ mode, request: request.trim(), schema: { fields, date_periods_available: periods }, current: mode === "edit" ? state?.spec : undefined });
    setBusy(false);
    if (!res) {
      setError(true);
      return;
    }
    const before = new Map((state?.spec.charts ?? []).map((c) => [c.chart_id, JSON.stringify(c)]));
    const changed = res.spec.dashboard.charts.filter((c) => before.get(c.chart_id) !== JSON.stringify(c)).map((c) => c.chart_id);
    save((prev) => ({
      spec: res.spec.dashboard,
      mapping: res.spec.request_mapping,
      questions: res.spec.questions_for_analyst,
      flags: res.spec.flags,
      codeNotes: res.codeNotes,
      accepted: mode === "edit" ? (prev?.accepted ?? []).filter((id) => !changed.includes(id) && res.spec.dashboard.charts.some((c) => c.chart_id === id)) : [],
      changed,
      requests: [...(mode === "edit" ? (prev?.requests ?? []) : []), request.trim() || "An overview"],
      updatedAt: Date.now(),
      engine: res.engine,
    }));
    setPrompt("");
    setMapOpen(true);
  }

  const accept = (id: string) => save((p) => (p ? { ...p, accepted: [...new Set([...p.accepted, id])], changed: p.changed.filter((x) => x !== id) } : p));
  const remove = (id: string) => {
    const prev = state;
    save((p) => (p ? { ...p, spec: { ...p.spec, charts: p.spec.charts.filter((c) => c.chart_id !== id) } } : p));
    toast({ message: "Chart removed.", action: prev ? { label: "Undo", onClick: () => save(() => prev) } : undefined });
  };

  const top = (
    <>
      <TopBar
        crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
        status={survey.status}
        secondary={survey.slug ? [{ label: "View survey", href: `/s/${survey.slug}`, external: true, Icon: ArrowUpRight }] : []}
        primary={survey.status === "live" ? { label: "Share", Icon: LinkSimple, href: surveyHref(survey.id, "publish") } : undefined}
      />
      <ResultsTabs surveyId={survey.id} current="dashboard" hasResponses={rows.length > 0} />
    </>
  );
  if (!player) return top;

  const filterFields = state?.spec.filters ?? [];
  const charts = state?.spec.charts ?? [];

  return (
    <>
      {top}
      <main className="page dash">
        <h1 className="sr-only">Dashboard: {survey.title}</h1>
        <form
          className="dash__prompt"
          onSubmit={(e) => {
            e.preventDefault();
            void run(prompt);
          }}
        >
          <label className="sr-only" htmlFor="dash-prompt">
            Describe the dashboard you want
          </label>
          <input
            id="dash-prompt"
            className="input dash__input"
            placeholder={state ? "Change it in words, e.g. “make the outlet chart a table”" : "Describe the dashboard you want…"}
            value={prompt}
            maxLength={500}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button type="submit" className="btn btn--md btn--ai" disabled={busy || (!!state && !prompt.trim())}>
            <Sparkle size={18} weight="fill" aria-hidden="true" /> {busy ? "Building…" : state ? "Update" : "Build"}
          </button>
        </form>
        <div className="chips dash__examples" role="group" aria-label="Examples">
          {examples.map((ex) => (
            <button key={ex} type="button" className="chip" onClick={() => setPrompt(ex)}>
              {ex}
            </button>
          ))}
          {!state && (
            <button type="button" className="chip" onClick={() => void run("")}>
              Suggest an overview
            </button>
          )}
        </div>
        {error && (
          <p className="field__error" role="alert">
            We couldn’t build that just now. Try again in a moment.
          </p>
        )}

        <div className="caveat" role="note">
          <Info size={18} weight="regular" aria-hidden="true" />
          <p>
            Based on{" "}
            <strong>
              {formatCount(filtered.length)}
              <ComputedMark />
            </strong>{" "}
            responses from people who chose to answer. This isn’t a representative sample. Flagged responses are left out unless you keep them in Responses.
          </p>
        </div>

        {state && (
          <details className="mapping" open={mapOpen} onToggle={(e) => setMapOpen((e.currentTarget as HTMLDetailsElement).open)}>
            <summary>
              <Badge kind="ai" /> What we did with your request
            </summary>
            <ul className="mapping__rows">
              {state.mapping.map((m, i) => (
                <li key={i} className={`mapping__row is-${m.outcome}`}>
                  <span className="mapping__mark" aria-hidden="true">
                    {m.outcome === "fulfilled" ? <Check size={14} weight="bold" /> : m.outcome === "adapted" ? <Info size={14} weight="bold" /> : <X size={14} weight="bold" />}
                  </span>
                  <span>
                    <strong>
                      “{m.requested}” · {OUTCOME[m.outcome]}
                    </strong>
                    {m.explanation && <span className="mapping__why">{m.explanation}</span>}
                  </span>
                </li>
              ))}
              {state.codeNotes.map((n) => (
                <li key={n} className="mapping__row is-adapted">
                  <span className="mapping__mark" aria-hidden="true">
                    <Info size={14} weight="bold" />
                  </span>
                  <span>
                    <strong>Code check</strong>
                    <span className="mapping__why">{n}</span>
                  </span>
                </li>
              ))}
              {state.flags.map((f) => (
                <li key={f} className="mapping__row is-declined">
                  <span className="mapping__mark" aria-hidden="true">
                    <Warning size={14} weight="bold" />
                  </span>
                  <span className="mapping__why">{f}</span>
                </li>
              ))}
            </ul>
            {state.questions.length > 0 && (
              <div className="mapping__qs">
                <span className="field__label">Questions for you</span>
                <div className="chips">
                  {state.questions.map((q) => (
                    <button key={q} type="button" className="chip" onClick={() => setPrompt(q.replace(/\?$/, "").replace(/^Which question should split the answers instead\? For example /, "Split by "))}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </details>
        )}

        {state && filterFields.length > 0 && (
          <div className="dash__filters" role="group" aria-label="Filters">
            {filterFields.map((f) => {
              if (f.control === "date_range") {
                return (
                  <label key={f.field} className="dash__filter">
                    <span>Date</span>
                    <select className="input" value={filters.date} onChange={(e) => setFilters((s) => ({ ...s, date: e.target.value as FilterState["date"] }))}>
                      <option value="all">All time</option>
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                    </select>
                  </label>
                );
              }
              const field = fields.find((x) => x.field === f.field);
              if (!field?.options) return null;
              const v = filters.fields[f.field] ?? "all";
              return (
                <label key={f.field} className="dash__filter">
                  <span>{field.label}</span>
                  <select
                    className="input"
                    value={String(v)}
                    onChange={(e) => setFilters((s) => ({ ...s, fields: { ...s.fields, [f.field]: e.target.value === "all" ? "all" : Number(e.target.value) } }))}
                  >
                    <option value="all">All</option>
                    {field.options.map((o, i) => (
                      <option key={o} value={i}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        )}

        {!state ? (
          <section className="dash__start">
            <Sparkle size={28} weight="fill" aria-hidden="true" />
            <h2>Describe the dashboard you want</h2>
            <p>Say it in plain words. You get charts from a fixed library; anything that would mislead is adapted, and you’re told why.</p>
          </section>
        ) : (
          <div className="dash__grid">
            {charts.map((c) => {
              const data = computeChart(c, { survey: player, rows: filtered, fields, themes: survey.themes ?? {}, now });
              const small = smallGroups(data);
              const approved = state.accepted.includes(c.chart_id);
              const asTable = c.type === "table" || tables.includes(c.chart_id);
              const table = tableOf(data);
              return (
                <section
                  key={c.chart_id}
                  className={`dcard ${approved ? "" : "is-draft"} ${state.changed.includes(c.chart_id) ? "is-changed" : ""}`}
                  style={{ gridColumn: `span ${span(c)}` }}
                  aria-labelledby={`dc-${c.chart_id}`}
                >
                  <div className="dcard__head">
                    <h3 id={`dc-${c.chart_id}`}>{c.title}</h3>
                    {approved ? (
                      <Badge kind="human">You approved</Badge>
                    ) : (
                      <span className="dcard__actions">
                        <button type="button" className="btn btn--sm btn--primary" onClick={() => accept(c.chart_id)}>
                          Accept
                        </button>
                        <button type="button" className="btn btn--sm btn--secondary" onClick={() => remove(c.chart_id)} aria-label={`Remove ${c.title}`}>
                          Remove
                        </button>
                      </span>
                    )}
                  </div>
                  {c.type !== "kpi_tile" && <p className="chartcard__answers">{c.answers_question}</p>}
                  {asTable ? (
                    <div className="chartcard__table">
                      <table>
                        <thead>
                          <tr>
                            {table.head.map((h, i) => (
                              <th key={h} scope="col" className={i > 0 ? "num" : undefined}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.rows.map((r, i) => (
                            <tr key={i}>{r.map((v, j) => (j === 0 ? <th key={j} scope="row">{v}</th> : <td key={j} className="num">{v}</td>))}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <DashChartBody data={data} />
                  )}
                  <div className="chartcard__foot">
                    {data.kind !== "empty" && data.kind !== "kpi" && (
                      <span className="chartcard__n">
                        n = {formatCount(data.n)}
                        <ComputedMark />
                      </span>
                    )}
                    {data.kind === "kpi" && <ComputedMark />}
                    {c.caveats.map((cv) => (
                      <span key={cv} className="caveat-chip">
                        {CAVEAT_TEXT[cv]}
                      </span>
                    ))}
                    {small.map((g) => (
                      <span key={g.label} className="caveat-chip caveat-chip--warn">
                        Small group: {g.label} (n = {g.n}). Read with care
                      </span>
                    ))}
                    {c.type !== "table" && c.type !== "kpi_tile" && (
                      <button
                        type="button"
                        className="chartcard__toggle"
                        aria-pressed={asTable}
                        onClick={() => setTables((t) => (t.includes(c.chart_id) ? t.filter((x) => x !== c.chart_id) : [...t, c.chart_id]))}
                      >
                        <Table size={16} weight="regular" aria-hidden="true" /> {asTable ? "View as chart" : "View as table"}
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
            {charts.length === 0 && <p className="field__help">No charts left. Describe what you’d like to see above.</p>}
          </div>
        )}

        {state && (
          <div className="dash__foot">
            <button
              type="button"
              className="btn btn--md btn--secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  toast({ message: "Link copied. It opens this dashboard in the Studio; read-only sharing with others arrives with accounts." });
                } catch {
                  toast({ message: `Copy this link: ${window.location.href}` });
                }
              }}
            >
              <LinkSimple size={18} weight="regular" aria-hidden="true" /> Share dashboard
            </button>
            <Link href={`${surveyHref(survey.id, "ask")}?about=dashboard`} className="btn btn--md btn--ai">
              <ChatCircleText size={18} weight="regular" aria-hidden="true" /> Ask about this
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
