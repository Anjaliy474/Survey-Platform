"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { studioApi } from "@/components/studio/api";
import { Badge } from "@/components/ui/Badge";
import type { SurveySummary } from "@/lib/survey/public";

const STEP_LABEL = { questions: "Questions", story: "Story", publish: "Publish", results: "Results" } as const;

/** S1 Home: every survey with its status and next step. */
export function StudioHome() {
  const [surveys, setSurveys] = useState<SurveySummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void studioApi.list().then((r) => (r.ok ? setSurveys(r.data.surveys) : setError(r.error)));
  }, []);

  return (
    <>
      <div className="s-row s-row--between">
        <h1>Your surveys</h1>
        <Link className="btn btn--md btn--primary" href="/studio/new">
          New survey
        </Link>
      </div>
      {error && <p className="banner banner--danger">{error}</p>}
      {surveys === null && !error && (
        <div className="s-grid" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="s-card" style={{ height: 140, background: "var(--ps-sand-100)" }} />
          ))}
        </div>
      )}
      {surveys?.length === 0 && (
        <div className="s-card" style={{ justifyItems: "start" }}>
          <h2>Your first survey is a minute away.</h2>
          <p className="muted">Type what it&apos;s about, and we&apos;ll draft the questions and the story world.</p>
          <Link className="btn btn--md btn--primary" href="/studio/new">
            Start a survey
          </Link>
        </div>
      )}
      {surveys && surveys.length > 0 && (
        <div className="s-grid">
          {surveys.map((s) => {
            const step = s.step;
            return (
              <Link key={s.id} href={`/studio/s/${s.id}/${step}`} className="s-card" style={{ color: "inherit", textDecoration: "none" }}>
                <div className="s-row">
                  <span className={`badge ${s.status === "live" ? "badge--success" : "badge--sample"}`}>{s.status === "live" ? "Live" : "Draft"}</span>
                  {s.prepared && <Badge kind="sample">Prepared example</Badge>}
                </div>
                <h3>{s.title}</h3>
                <p className="s-help">
                  {s.questionCount} questions · {s.status === "live" ? "Open results" : `Next: ${STEP_LABEL[step]}`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
