"use client";

import { ArrowsClockwise, Info, Warning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StepRail } from "@/components/studio/StepRail";
import { studioApi, surveyName } from "@/components/studio/api";
import { Badge } from "@/components/ui/Badge";
import { formatCount } from "@/lib/compute";
import type { Comparison, ArmStats } from "@/lib/survey/compare";
import { MIN_PER_ARM } from "@/lib/survey/compare";
import { storyAllowed } from "@/lib/survey/public";
import type { Survey } from "@/lib/survey/types";

type Data = { total: number; completed: number; splitAB: boolean; comparison: Comparison };
const POLL_MS = 10_000;

function fmtSeconds(s: number) {
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60}s` : `${s}s`;
}

/** Results: the story vs plain comparison (spec §10). Every number is computed in code. */
export function StoryVsPlain({ id }: { id: string }) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [shown, setShown] = useState<Data | null>(null);
  const [latest, setLatest] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const tick = () =>
      studioApi.results(id).then((r) => {
        if (!r.ok) return setError(r.error);
        setLatest(r.data);
        setShown((cur) => cur ?? r.data);
      });
    void studioApi.get(id).then((r) => (r.ok ? setSurvey(r.data.survey) : setError(r.error)));
    void tick();
    const t = window.setInterval(() => void tick(), POLL_MS);
    return () => window.clearInterval(t);
  }, [id]);

  if (error && !shown) return <p className="banner banner--danger">{error}</p>;
  if (!survey || !shown) return <p className="muted">Loading…</p>;

  const c = shown.comparison;
  const fresh = latest && latest.total !== shown.total ? latest.total - shown.total : 0;
  const byId = new Map((survey.questionSet?.questions ?? []).map((q) => [q.id, q]));
  const rows: { label: string; get: (a: ArmStats) => string }[] = [
    { label: "Started", get: (a) => formatCount(a.n) },
    { label: "Finished", get: (a) => formatCount(a.completed) },
    { label: "Completion", get: (a) => (a.n ? `${a.completionPct}%` : "–") },
    { label: "Median time", get: (a) => (a.completed ? fmtSeconds(a.medianSeconds) : "–") },
    { label: "Enjoyment (0–4)", get: (a) => (a.enjoymentMean === null ? "–" : String(a.enjoymentMean)) },
    { label: "Switched to plain", get: (a) => formatCount(a.switches) },
  ];

  return (
    <>
      <StepRail surveyId={id} current="results" reached="results" storyBlocked={!storyAllowed(survey)} />
      <div className="s-row s-row--between">
        <h1>{surveyName(survey)}</h1>
        <Link className="btn btn--sm btn--secondary" href={`/s/${survey.slug}`} target="_blank">
          Open the survey
        </Link>
      </div>

      <p className="banner banner--info">
        <Info size={18} weight="bold" aria-hidden="true" />
        <span>
          Based on <b>{formatCount(shown.total)}</b> <Badge kind="computed" /> responses from people who chose to answer. This isn&apos;t a representative sample.
        </span>
      </p>

      {fresh > 0 && (
        <button type="button" className="btn btn--sm btn--secondary" style={{ justifySelf: "start" }} onClick={() => setShown(latest)}>
          <ArrowsClockwise size={14} weight="bold" aria-hidden="true" /> {fresh} new response{fresh > 1 ? "s" : ""} · Refresh
        </button>
      )}

      <section className="s-card" aria-labelledby="svp-title">
        <div className="s-row s-row--between">
          <h2 id="svp-title" style={{ fontSize: "1.25rem" }}>
            Story vs plain
          </h2>
          <Badge kind="computed" />
        </div>
        {!shown.splitAB && <p className="s-help">This survey wasn&apos;t split, so everyone got the same version.</p>}
        <div style={{ overflowX: "auto" }}>
          <table className="compare">
            <caption className="sr-only">Story and plain versions compared</caption>
            <thead>
              <tr>
                <th scope="col">Measure</th>
                <th scope="col" className="num">
                  Story
                </th>
                <th scope="col" className="num">
                  Plain
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td className="num">{r.get(c.story)}</td>
                  <td className="num">{r.get(c.plain)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!c.enough ? (
          <p className="banner banner--warning">
            Too few responses to compare answers (story n = {c.story.completed}, plain n = {c.plain.completed}). The check unlocks at {MIN_PER_ARM} finished responses in each.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            <h3>Did the story change what people answered?</h3>
            <ul className="checks">
              {c.shifts.map((s) => {
                const q = byId.get(s.questionId);
                const num = (survey.questionSet?.questions.findIndex((x) => x.id === s.questionId) ?? 0) + 1;
                return (
                  <li key={s.questionId}>
                    {s.differs ? <Warning className="bad" size={20} weight="fill" aria-label="Differs" /> : <span className="ok" aria-hidden="true">✓</span>}
                    <span>
                      {s.differs ? (
                        <>
                          <strong>Answers to Q{num} differ between story and plain.</strong> Review its scene.
                        </>
                      ) : (
                        <>Q{num}: answers look the same.</>
                      )}{" "}
                      <span className="s-help">{q?.text}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="s-help">Chi-square test per question, Holm-corrected across questions. A difference here is a signal to check, not proof.</p>
          </div>
        )}
      </section>
    </>
  );
}
