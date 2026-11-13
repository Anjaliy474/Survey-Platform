"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "@/components/icons";
import { useNowMinute } from "@/lib/client-hooks";
import { formatCount, percent, sum } from "@/lib/compute";
import { surveyHref } from "@/lib/studio/sections";
import type { StudioSurvey } from "@/lib/studio/types";
import { useAnalysis } from "./results/useAnalysis";
import { statsFor } from "./SurveyRow";

/** One thin strip of totals across every survey (Computed). */
export function HomeSummary({ surveys }: { surveys: StudioSurvey[] }) {
  const now = useNowMinute();
  const t = useMemo(() => {
    let finished = 0;
    let started = 0;
    let week = 0;
    for (const s of surveys) {
      if (s.status === "draft" || !now) continue;
      const st = statsFor(s, now);
      if (!st) continue;
      finished += st.finished;
      started += st.started;
      week += sum(st.lastSevenDays);
    }
    return { finished, started, week, live: surveys.filter((s) => s.status === "live").length, drafts: surveys.filter((s) => s.status === "draft").length };
  }, [surveys, now]);
  const tiles = [
    { label: "Responses", value: formatCount(t.finished) },
    { label: "This week", value: formatCount(t.week) },
    { label: "Completion", value: t.started ? `${percent(t.finished, t.started)}%` : "–" },
    { label: "Live surveys", value: String(t.live) },
    { label: "Drafts", value: String(t.drafts) },
  ];
  return (
    <dl className="home-sum" aria-label="All surveys at a glance">
      {tiles.map((x) => (
        <div key={x.label}>
          <dt>{x.label}</dt>
          <dd>{x.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The strongest finding from each survey with answers: one line each. */
export function HomeFindings({ surveys }: { surveys: StudioSurvey[] }) {
  const withData = surveys.filter((s) => s.status !== "draft");
  if (!withData.length) return null;
  return (
    <section className="home-find" aria-labelledby="home-find-title">
      <h2 id="home-find-title" className="home-h2">
        Latest findings
      </h2>
      <ul className="home-find__list">
        {withData.map((s) => (
          <Finding key={s.id} survey={s} />
        ))}
      </ul>
    </section>
  );
}

function Finding({ survey }: { survey: StudioSurvey }) {
  const { set } = useAnalysis(survey);
  const top = set?.insights.find((i) => i.kind !== "score");
  if (!top) return null;
  return (
    <li className={`home-find__item home-find__item--${top.tone}`}>
      <span className="home-find__dot" aria-hidden="true" />
      <div className="home-find__text">
        <p>{top.headline}</p>
        <span>
          {survey.title} · {top.confidence === "clear" ? "Clear finding" : top.confidence === "likely" ? "Likely" : "Early signal"}
        </span>
      </div>
      <Link href={surveyHref(survey.id, "results")} className="home-find__go" aria-label={`Open the analysis of ${survey.title}`}>
        <ArrowRight size={18} weight="bold" aria-hidden="true" />
      </Link>
    </li>
  );
}
