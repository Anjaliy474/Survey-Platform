"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowClockwise, ArrowUpRight, Check, DownloadSimple, LinkSimple, Sparkle } from "@/components/icons";
import { Badge, ComputedMark } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { generateReport } from "@/lib/ai/client";
import type { Finding, Level, Reader, ReportOutput } from "@/lib/ai/types";
import { type AnalysisPack, buildPack } from "@/lib/results/pack";
import { surveyHref } from "@/lib/studio/sections";
import { studio } from "@/lib/studio/store";
import type { StudioSurvey } from "@/lib/studio/types";
import { ResultsTabs } from "../ResultsTabs";
import { TopBar } from "../TopBar";
import { useResultsData } from "./ResultsView";
import { MaskedText } from "./ThemesView";

const READERS: { value: Reader; label: string }[] = [
  { value: "creator", label: "Creator" },
  { value: "analyst", label: "Analyst" },
  { value: "leadership", label: "Leadership" },
];
/** Decisions the sample surveys were built to inform (a real survey's come from its brief). */
const SAMPLE_DECISIONS: Record<string, string[]> = {
  "cafe-feedback": ["Which outlet needs attention on coffee first", "Which new menu item to add first"],
  "volunteer-feedback": ["Whether to change how the next drive is run", "How to make instructions clearer"],
  "canteen-menu-poll": ["Which outlet needs attention on coffee first", "Which new menu item to add first"],
};
const TAG: Record<Finding["evidence_type"], string> = { observed: "Observed", association: "Linked (association)", model_based: "Model" };
const STEPS = ["Counting answers and checking data quality", "Testing differences between groups", "Reading themes", "Writing the report", "Checking every number against the evidence"];

function Meter({ level, reason }: { level: Level; reason?: string }) {
  const n = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <span className="meter" title={reason}>
      <span className="meter__dots" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= n ? "is-on" : ""} />
        ))}
      </span>
      <span>{level[0].toUpperCase() + level.slice(1)} confidence</span>
      {reason && <span className="sr-only">: {reason}</span>}
    </span>
  );
}

/** Numbers show as Computed chips; hovering names the pack entries they came from. */
function Evidenced({ text, ids, pack }: { text: string; ids: string[]; pack: AnalysisPack }) {
  const source = pack.entries
    .filter((e) => ids.includes(e.id))
    .map((e) => `${e.id} · ${e.label}: ${e.display}`)
    .join("\n");
  return (
    <>
      {text.split(/((?<![\w-])[+-]?\d+(?:\.\d+)?%?)/g).map((p, i) =>
        /^[+-]?\d/.test(p) ? (
          <span key={i} className="num-chip" title={source}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/**
 * R6 Insight report (UI_UX_LAYOUT.md): code builds the analysis pack, the AI writes the story,
 * code checks every number. Data quality first; hypotheses always marked "not proven".
 */
export function ReportView({ survey }: { survey: StudioSurvey }) {
  const toast = useToast();
  const { player, rows } = useResultsData(survey);
  const [reader, setReader] = useState<Reader>("creator");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(false);
  const started = useRef<string | null>(null);
  const stored = survey.report?.[reader];

  const pack = useMemo(() => {
    if (!player || !rows.some((r) => r.submittedAt !== null)) return null;
    const decisions = survey.ai?.shaper.decisions_informed ?? SAMPLE_DECISIONS[survey.slug ?? ""] ?? [];
    return buildPack({ survey: player, rows, review: survey.review ?? {}, themes: survey.themes ?? {}, decisions });
  }, [player, rows, survey.review, survey.themes, survey.ai, survey.slug]);

  async function run(r: Reader) {
    if (!pack) return;
    setBusy(true);
    setError(false);
    // The pack is already computed in code (steps 1–3 are done); the AI is writing now. No fake progress.
    setStep(3);
    const res = await generateReport(r, pack);
    setStep(STEPS.length);
    setBusy(false);
    if (!res) {
      setError(true);
      return;
    }
    studio.patch(survey.id, (s) => ({ report: { ...(s.report ?? {}), [r]: { output: res.report, generatedAt: Date.now(), dropped: res.dropped } } }));
  }

  // Write the report the first time each reader's version is opened.
  useEffect(() => {
    if (!pack || stored || busy || started.current === reader) return;
    started.current = reader;
    void run(reader);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, stored, reader]);

  const top = (
    <>
      <TopBar
        crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
        status={survey.status}
        secondary={survey.slug && !survey.source ? [{ label: "View survey", href: `/s/${survey.slug}`, external: true, Icon: ArrowUpRight }] : []}
        primary={survey.status === "live" ? { label: "Share", Icon: LinkSimple, href: surveyHref(survey.id, "publish") } : undefined}
      />
      <ResultsTabs surveyId={survey.id} current="report" hasResponses={rows.length > 0} />
    </>
  );
  if (!player) return top;
  if (!pack) {
    return (
      <>
        {top}
        <main className="page">
          <h1 className="sr-only">Insight report</h1>
          <p className="dash-empty">The report appears once people have answered.</p>
        </main>
      </>
    );
  }

  const r = stored?.output;
  const toc = r
    ? [
        ["quality", "Data quality"],
        ["summary", "Summary"],
        ...(r.decision_answers.length ? [["decisions", "Decisions"]] : []),
        ...(r.findings.length ? [["findings", "Findings"]] : []),
        ...(r.priorities.length ? [["priorities", "Priorities"]] : []),
        ...(r.recommendations.length ? [["recommendations", "What to do"]] : []),
        ["also", "Also worth knowing"],
        ["limits", "Limitations"],
      ]
    : [];

  return (
    <>
      {top}
      <div className="report">
        {r && (
          <nav className="report__toc" aria-label="In this report">
            <ol>
              {toc.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <main className="report__col">
          <div className="report__actions">
            <div className="segmented" role="group" aria-label="Written for">
              {READERS.map((x) => (
                <button key={x.value} type="button" aria-pressed={reader === x.value} onClick={() => setReader(x.value)} disabled={busy}>
                  {x.label}
                </button>
              ))}
            </div>
            <div className="report__buttons">
              <button type="button" className="btn btn--sm btn--ai" onClick={() => void run(reader)} disabled={busy}>
                <ArrowClockwise size={16} weight="regular" aria-hidden="true" /> Regenerate
              </button>
              <button
                type="button"
                className="btn btn--sm btn--secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    toast({ message: "Link copied. It opens this report in the Studio." });
                  } catch {
                    toast({ message: `Copy this link: ${window.location.href}` });
                  }
                }}
              >
                <LinkSimple size={16} weight="regular" aria-hidden="true" /> Share link
              </button>
              <button type="button" className="btn btn--sm btn--secondary" onClick={() => window.print()} disabled={!r}>
                <DownloadSimple size={16} weight="regular" aria-hidden="true" /> Download PDF
              </button>
            </div>
          </div>

          {(busy || (!r && !error)) && (
            <section className="ai-panel-lite" role="status" aria-live="polite">
              <p>
                <Badge kind="ai" /> Writing your report…
              </p>
              <ol>
                {STEPS.map((s, i) => (
                  <li key={s} className={i < step ? "is-done" : i === step ? "is-on" : ""}>
                    {i < step ? <Check size={14} weight="bold" aria-hidden="true" /> : <span aria-hidden="true">·</span>} {s}
                    {i === 3 ? " (AI)" : " (code)"}
                  </li>
                ))}
              </ol>
            </section>
          )}
          {error && (
            <div className="status-banner status-banner--warning" role="alert">
              <strong>We couldn’t write the report just now.</strong>
              <button type="button" className="btn btn--sm btn--secondary" onClick={() => void run(reader)}>
                Try again
              </button>
            </div>
          )}

          {r && !busy && <Report r={r} pack={pack} surveyId={survey.id} dropped={stored?.dropped ?? []} />}
        </main>
      </div>
    </>
  );
}

function Report({ r, pack, surveyId, dropped }: { r: ReportOutput; pack: AnalysisPack; surveyId: string; dropped: string[] }) {
  const q0 = pack.entries.find((e) => e.id === "Q0");
  const byId = new Map(r.findings.map((f) => [f.finding_id, f]));
  return (
    <article className="report__body">
      <div className="report__badges">
        <Badge kind="ai" />
        <Badge kind="computed">Numbers checked against the analysis</Badge>
        <span className="caveat-chip">Self-selected sample</span>
      </div>
      <h1 className="report__headline">
        <Evidenced text={r.headline} ids={r.findings[0]?.evidence_ids ?? []} pack={pack} />
      </h1>
      {dropped.length > 0 && <p className="field__help">{dropped.length} finding(s) were left out because a number in them couldn’t be traced to the analysis.</p>}

      <section id="quality" className="rcard-q">
        <h2>Data quality</h2>
        <p>
          <Evidenced text={r.data_quality.summary} ids={["Q0"]} pack={pack} />
        </p>
        {q0 && (
          <p className="field__help">
            Base: {q0.base} people started <ComputedMark />
          </p>
        )}
        {r.data_quality.could_change_conclusions && <p>{r.data_quality.could_change_conclusions}</p>}
      </section>

      <section id="summary" className="report__sec">
        <h2>Summary</h2>
        <ul className="report__summary">
          {r.executive_summary.map((s) => (
            <li key={s.finding_id}>
              <a href={`#${s.finding_id}`}>
                <Evidenced text={s.statement} ids={s.evidence_ids} pack={pack} />
              </a>
            </li>
          ))}
        </ul>
      </section>

      {r.decision_answers.length > 0 && (
        <section id="decisions" className="report__sec">
          <h2>Your decisions</h2>
          <div className="report__decisions">
            {r.decision_answers.map((d) => (
              <div key={d.decision} className="decision">
                <h3>{d.decision}</h3>
                <p>{d.what_the_data_says.replace(/ See F\d+\./, "")}</p>
                <div className="decision__foot">
                  <Meter level={d.confidence} />
                  {d.finding_ids.map((id) => (
                    <a key={id} href={`#${id}`} className="link">
                      See finding
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {r.findings.length > 0 && (
        <section id="findings" className="report__sec">
          <h2>Findings</h2>
          {r.findings.map((f) => (
            <article key={f.finding_id} id={f.finding_id} className="finding-card">
              <span className={`etag etag--${f.evidence_type}`}>{TAG[f.evidence_type]}</span>
              <h3>
                <Evidenced text={f.title} ids={f.evidence_ids} pack={pack} />
              </h3>
              <p>
                <Evidenced text={f.statement} ids={f.evidence_ids} pack={pack} />
              </p>
              <dl className="finding-card__facts">
                <div>
                  <dt>Who it affects</dt>
                  <dd>{f.who_it_affects}</dd>
                </div>
                {f.counter_evidence && (
                  <div>
                    <dt>Against this</dt>
                    <dd>{f.counter_evidence}</dd>
                  </div>
                )}
                <div>
                  <dt>Does the size matter?</dt>
                  <dd>{f.practical_importance}</dd>
                </div>
                <div>
                  <dt>What it means</dt>
                  <dd>{f.implication}</dd>
                </div>
              </dl>
              {f.interpretation.hypothesis && (
                <aside className="hypothesis">
                  <strong>Possible reason · Not proven</strong>
                  <p>{f.interpretation.hypothesis}</p>
                  <p>
                    <em>How to test:</em> {f.interpretation.how_to_test}
                  </p>
                </aside>
              )}
              <Meter level={f.confidence} reason={f.confidence_reason} />
              <p className="field__help">{f.confidence_reason}</p>
            </article>
          ))}
        </section>
      )}

      {r.priorities.length > 0 && (
        <section id="priorities" className="report__sec">
          <h2>Priorities</h2>
          <div className="chartcard__table">
            <table>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Finding</th>
                  <th scope="col">How many</th>
                  <th scope="col">How serious</th>
                  <th scope="col">Evidence</th>
                  <th scope="col">Doable</th>
                </tr>
              </thead>
              <tbody>
                {r.priorities.map((p, i) => (
                  <tr key={p.finding_id}>
                    <td>{i + 1}</td>
                    <th scope="row" title={p.why_this_rank}>
                      {byId.get(p.finding_id)?.title}
                    </th>
                    {[p.frequency, p.severity, p.evidence_strength, p.feasibility].map((l, j) => (
                      <td key={j}>{l === "unknown" ? "Unknown" : <Dots level={l} />}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {r.recommendations.length > 0 && (
        <section id="recommendations" className="report__sec">
          <h2>What to do</h2>
          <div className="board">
            {(["now", "next", "later"] as const).map((h) => (
              <div key={h} className="board__col">
                <h3>{h === "now" ? "Now" : h === "next" ? "Next" : "Later"}</h3>
                {r.recommendations
                  .filter((x) => x.horizon === h)
                  .map((x) => (
                    <div key={x.action} className="board__card">
                      <p>{x.action}</p>
                      <p className="field__help">Watch: {x.metric_to_watch}</p>
                    </div>
                  ))}
                {!r.recommendations.some((x) => x.horizon === h) && <p className="field__help">Nothing here from this data.</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="also" className="report__sec">
        <h2>Also worth knowing</h2>
        {r.contradictions_and_surprises.map((c) => (
          <p key={c.statement} className="also">
            <strong>Surprise:</strong> <Evidenced text={c.statement} ids={c.evidence_ids} pack={pack} />
          </p>
        ))}
        {r.say_vs_do_gaps.map((c) => (
          <p key={c.statement} className="also">
            <strong>Say vs do:</strong> {c.statement}
          </p>
        ))}
        {r.minority_views.map((m) => (
          <div key={m.quote.response_id} className="also">
            <strong>Minority view:</strong> {m.statement}
            <ul className="quotes">
              <li>
                <blockquote>
                  “<MaskedText text={m.quote.text} />”
                </blockquote>
                <span className="rid">{m.quote.response_id}</span>
              </li>
            </ul>
          </div>
        ))}
        <p className="also">
          <strong>Segments:</strong> {r.segments.status === "not_run" ? `Not run. ${r.segments.note}` : r.segments.note}
        </p>
      </section>

      <section id="limits" className="report__sec">
        <h2>Limitations</h2>
        <ul>
          {r.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        {r.unanswered_questions.length > 0 && (
          <>
            <h3>Questions this survey couldn’t answer</h3>
            {r.unanswered_questions.map((u) => (
              <div key={u.question} className="unanswered">
                <p>
                  <strong>{u.question}</strong> {u.why_it_matters}
                </p>
                <p className="field__help">Suggested question: “{u.suggested_survey_question}”</p>
                <Link href={`/app/new/prompt?q=${encodeURIComponent(u.suggested_survey_question)}`} className="btn btn--sm btn--secondary">
                  <Sparkle size={14} weight="fill" aria-hidden="true" /> Add to a new survey
                </Link>
              </div>
            ))}
          </>
        )}
        <p className="field__help">
          Methods: {pack.methods.join(" · ")}. Full figures are in <Link href={surveyHref(surveyId, "results")}>Overview</Link>.
        </p>
      </section>
    </article>
  );
}

function Dots({ level }: { level: Level }) {
  const n = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <span className="meter__dots" aria-label={level}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? "is-on" : ""} />
      ))}
    </span>
  );
}
