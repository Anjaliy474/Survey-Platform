"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowClockwise, ArrowRight, ArrowUpRight, Info, LinkSimple, LockSimple, Quotes, ShareNetwork, Warning } from "@/components/icons";
import { Badge, ComputedMark } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNowMinute } from "@/lib/client-hooks";
import { MIN_RESPONSES_FOR_REVEAL, formatCount } from "@/lib/compute";
import { getSurvey } from "@/lib/player/samples";
import { useResponses } from "@/lib/player/published-store";
import type { PlayerSurvey } from "@/lib/player/types";
import { FLAG_LABEL, type FlagCode, type QuestionResult, formatSeconds, overview } from "@/lib/results/compute";
import { type ResultResponse, localResponses, sampleResponses } from "@/lib/results/data";
import { computeInsights } from "@/lib/results/insights";
import { buildSnapshot } from "@/lib/results/snapshot";
import { surveyHref } from "@/lib/studio/sections";
import { studio } from "@/lib/studio/store";
import type { StudioSurvey } from "@/lib/studio/types";
import { ResultsTabs } from "../ResultsTabs";
import { TopBar } from "../TopBar";
import { type CaveatCode, ChartCard, Columns, HBars, KpiTile, LikertBar, NpsChart } from "./charts";
import { KeyInsights } from "./KeyInsights";
import { ShareAnalysis } from "./ShareAnalysis";

const NO_REVIEW = {};

/** The Player survey and its responses: the sample set, or what this browser collected. */
export function useResultsData(survey: StudioSurvey): { player: PlayerSurvey | null; rows: ResultResponse[]; isSample: boolean; liveCount: number } {
  const now = useNowMinute();
  const stored = useResponses(survey.player ? survey.slug : null);
  const sample = !survey.player && survey.slug ? getSurvey(survey.slug) : undefined;
  const player = survey.player ?? sample ?? null;
  const deletedAll = survey.responsesDeletedAt;
  const deleted = survey.deletedResponses;
  const rows = useMemo(() => {
    if (sample) {
      // Deletions (Settings → Data and privacy) apply to the sample set too.
      if (deletedAll || !now) return [];
      const all = sampleResponses(sample, now) ?? [];
      return deleted?.length ? all.filter((r) => !deleted.includes(r.id)) : all;
    }
    return localResponses(stored);
  }, [sample, now, stored, deletedAll, deleted]);
  return { player, rows, isSample: !!sample, liveCount: stored.length };
}

/**
 * R1 Results overview (UI_UX_LAYOUT.md): how many joined and where they dropped off, at a
 * glance. Every number here is computed in code from the response rows.
 */
export function ResultsView({ survey }: { survey: StudioSurvey }) {
  const { player, rows, isSample, liveCount } = useResultsData(survey);
  const now = useNowMinute();
  const [includeFlagged, setIncludeFlagged] = useState(false);
  const [caveatOpen, setCaveatOpen] = useState(true);
  // New answers don't re-draw charts mid-read: a pill offers to refresh (UI_UX_LAYOUT.md R1).
  const [seen, setSeen] = useState(liveCount);
  const visibleRows = useMemo(() => (survey.player ? rows.slice(0, Math.max(seen, 0)) : rows), [rows, seen, survey.player]);
  const review = survey.review;
  const data = useMemo(
    () => (player && now ? overview(player, visibleRows, { includeFlagged, review: review ?? NO_REVIEW, now }) : null),
    [player, visibleRows, includeFlagged, review, now],
  );
  const fresh = survey.player ? liveCount - seen : 0;
  const [shareOpen, setShareOpen] = useState(false);
  const insightSet = useMemo(() => (player && data ? computeInsights(player, data.rows, visibleRows) : null), [player, data, visibleRows]);
  const snapshot = useMemo(
    () => (player && data && insightSet && now ? buildSnapshot({ title: survey.title, creator: player.creator.name, isSample, data, set: insightSet, now }) : null),
    [player, data, insightSet, now, survey.title, isSample],
  );

  const top = (
    <>
      <TopBar
        crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
        status={survey.status}
        secondary={survey.slug && !survey.source ? [{ label: "View survey", href: `/s/${survey.slug}`, external: true, Icon: ArrowUpRight }] : []}
        primary={(data?.finished ?? 0) > 0 ? { label: "Share analysis", Icon: ShareNetwork, onClick: () => setShareOpen(true) } : undefined}
      />
      <ResultsTabs surveyId={survey.id} current="results" hasResponses={(data?.finished ?? 0) > 0} />
    </>
  );

  if (!player || !data) {
    return (
      <>
        {top}
        <main className="page">
          <EmptyState symbol="?" title="Results aren’t available" headingLevel={1}>
            We couldn’t load this survey’s questions in this browser.
          </EmptyState>
        </main>
      </>
    );
  }

  if (data.finished === 0) {
    return (
      <>
        {top}
        <main className="page results">
          <h1 className="sr-only">Results overview: {survey.title}</h1>
          {fresh > 0 && <FreshPill count={fresh} onClick={() => setSeen(liveCount)} />}
          <EmptyState
            symbol="0"
            title="No responses yet."
            actions={
              survey.status === "live" ? (
                <Link href={surveyHref(survey.id, "publish")} className="btn btn--md btn--primary">
                  <LinkSimple size={18} weight="regular" aria-hidden="true" /> Share your link
                </Link>
              ) : undefined
            }
          >
            Share your link and the first answers will show up here.
          </EmptyState>
        </main>
      </>
    );
  }

  const n = data.base;
  const few = data.finished < 10;
  const flaggedLeft = data.quality.flagged - data.quality.kept - data.quality.excluded;

  return (
    <>
      {top}
      <main className="page results">
        <div className="results__head">
          <h1>Overview</h1>
          {isSample && <Badge kind="sample" />}
        </div>

        {fresh > 0 && <FreshPill count={fresh} onClick={() => setSeen(liveCount)} />}

        {/* 8.1 Sample caveat banner: can be collapsed, never removed */}
        <div className={`caveat ${caveatOpen ? "" : "is-collapsed"}`} role="note">
          <Info size={18} weight="regular" aria-hidden="true" />
          {caveatOpen ? (
            <p>
              Based on{" "}
              <strong>
                {formatCount(n)}
                <ComputedMark />
              </strong>{" "}
              {n === 1 ? "response" : "responses"} from people who chose to answer. This isn’t a representative sample.
              {n < data.finished && (
                <>
                  {" "}
                  Charts leave out {formatCount(data.finished - n)} flagged {data.finished - n === 1 ? "response" : "responses"}.
                </>
              )}
            </p>
          ) : (
            <p>
              n = {formatCount(n)}, self-selected <ComputedMark />
            </p>
          )}
          <button type="button" className="caveat__toggle" aria-expanded={caveatOpen} onClick={() => setCaveatOpen((v) => !v)}>
            {caveatOpen ? "Collapse" : "Expand"}
          </button>
        </div>

        {n === 0 && (
          <div className="status-banner status-banner--warning" role="status">
            <strong>
              <Warning size={16} weight="bold" aria-hidden="true" /> Every response so far is flagged
            </strong>
            <span>
              The charts stay empty until you keep some in{" "}
              <Link href={`${surveyHref(survey.id, "responses")}?flag=any`} className="link">
                Responses
              </Link>{" "}
              or tick “Include flagged responses” below.
            </span>
          </div>
        )}

        {few ? (
          <div className="status-banner status-banner--warning" role="status">
            <strong>
              <Warning size={16} weight="bold" aria-hidden="true" /> Very few responses
            </strong>
            <span>With fewer than 10 answers, read these as early signals, not results. Breakdowns by group stay hidden until each group has 10.</span>
          </div>
        ) : data.finished < MIN_RESPONSES_FOR_REVEAL ? (
          <p className="results__note">
            <LockSimple size={14} weight="bold" aria-hidden="true" /> Reveal unlocks for respondents at {MIN_RESPONSES_FOR_REVEAL} responses ({data.finished} so far).
          </p>
        ) : null}

        <div className="results__actions">
          <button type="button" className="btn btn--sm btn--secondary" onClick={() => setShareOpen(true)}>
            <ShareNetwork size={16} weight="regular" aria-hidden="true" /> Share analysis
          </button>
        </div>

        <div className="kpis">
          <KpiTile label="Responses" value={data.finished} format={(v) => formatCount(Math.round(v))} how={`Finished and submitted · ${formatCount(data.started)} started`} />
          <KpiTile label="Completion" value={data.completionPct} format={(v) => `${Math.round(v)}%`} how={`${formatCount(data.finished)} of ${formatCount(data.started)} who started`} />
          <KpiTile label="Median time" value={data.medianSeconds} format={(v) => formatSeconds(v)} how="Half of people finished faster than this" />
          <KpiTile
            label="Enjoyed it"
            value={data.enjoyment.n ? data.enjoyment.pct : null}
            format={(v) => `${Math.round(v)}%`}
            how={data.enjoyment.n ? `Picked “Enjoyable” or “Very enjoyable” · n = ${formatCount(data.enjoyment.n)}` : "No one has rated it yet"}
          />
        </div>

        {insightSet && (
          <section className="results__insights" aria-labelledby="insights-title">
            <h2 id="insights-title" className="results__h2">
              Key insights
            </h2>
            <p className="results__sub">Found by comparing groups, time of day, trends and comments, not just counting answers. Every number is computed from the responses.</p>
            <KeyInsights set={insightSet} themesHref={surveyHref(survey.id, "themes")} />
          </section>
        )}

        <h2 className="results__h2">Activity</h2>
        <div className="results__pair">
          <ChartCard
            title="Responses over time"
            answers="Finished responses per day"
            n={data.finished}
            caveats={data.overTime.filter((d) => d.count > 0).length < 5 ? ["few_periods"] : []}
            table={{ head: ["Day", "Responses"], rows: data.overTime.map((d) => [d.full, d.count]) }}
          >
            <Columns
              describe={`Responses per day, ${data.overTime[0]?.label} to ${data.overTime.at(-1)?.label}`}
              bars={data.overTime.map((d) => ({ label: d.label, count: d.count, tip: `${d.full}: ${formatCount(d.count)} ${d.count === 1 ? "response" : "responses"}` }))}
              labelEvery={data.overTime.length > 10 ? 3 : 1}
            />
          </ChartCard>
          <ChartCard
            title="Drop-off by question"
            answers={
              <>
                {data.dropSentence}{" "}
                {data.left > 0 && (
                  <span className="muted">
                    {formatCount(data.left)} left part-way <ComputedMark />
                  </span>
                )}
              </>
            }
            n={data.started}
            table={{ head: ["Question", "People who left here"], rows: data.dropOff.map((d) => [`${d.label} · ${d.text}`, d.count]) }}
          >
            <Columns
              describe="People who left at each question"
              highlight={data.dropTop}
              bars={data.dropOff.map((d) => ({ label: d.label, count: d.count, tip: `${d.label}: ${formatCount(d.count)} left here` }))}
            />
          </ChartCard>
        </div>

        <h2 className="results__h2">Question by question</h2>
        <div className="results__questions">
          {data.questions.map((r, i) => (
            <QuestionCard key={r.q.id} result={r} index={i} surveyId={survey.id} flaggedIncluded={includeFlagged && flaggedLeft > 0} />
          ))}
        </div>

        {/* Data quality strip */}
        <section className="quality" aria-labelledby="quality-title">
          <div className="quality__head">
            <h2 id="quality-title">Data quality</h2>
            <label className="quality__toggle">
              <input type="checkbox" checked={includeFlagged} onChange={(e) => setIncludeFlagged(e.target.checked)} disabled={flaggedLeft <= 0} />
              Include flagged responses in charts
            </label>
          </div>
          <ul className="quality__list">
            {(Object.keys(FLAG_LABEL) as FlagCode[]).map((code) => (
              <li key={code}>
                <Link href={`${surveyHref(survey.id, "responses")}?flag=${code}`} className="quality__item">
                  <span className="quality__num">
                    {formatCount(data.quality.byCode[code])}
                    <ComputedMark />
                  </span>
                  <span>{FLAG_LABEL[code]}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href={`${surveyHref(survey.id, "responses")}?flag=any`} className="quality__item quality__item--total">
                <span className="quality__num">
                  {formatCount(data.quality.flagged)}
                  <ComputedMark />
                </span>
                <span>Flagged in total</span>
              </Link>
            </li>
          </ul>
          <p className="field__help">
            Code flags responses; you decide. {data.quality.kept > 0 && `${data.quality.kept} kept · `}
            {data.quality.excluded > 0 && `${data.quality.excluded} excluded · `}
            Flagged responses stay out of the charts unless you keep them in Responses or tick the box above.
          </p>
        </section>
      </main>
      <ShareAnalysis open={shareOpen} onClose={() => setShareOpen(false)} snapshot={snapshot} />
    </>
  );
}

function FreshPill({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" className="fresh-pill" onClick={onClick}>
      <ArrowClockwise size={16} weight="regular" aria-hidden="true" /> {count} new {count === 1 ? "response" : "responses"} · Refresh charts
    </button>
  );
}

function QuestionCard({ result: r, index, surveyId, flaggedIncluded }: { result: QuestionResult; index: number; surveyId: string; flaggedIncluded: boolean }) {
  const title = `Q${index + 1}. ${r.q.text}`;
  const extra: CaveatCode[] = flaggedIncluded ? ["flagged_responses_included"] : [];
  if (r.n > 0 && r.kind !== "open" && r.kind !== "personal" && r.n < 10) extra.push("small_base");

  if (r.kind === "open") {
    return (
      <section className="chartcard chartcard--open">
        <div className="chartcard__head">
          <h3>{title}</h3>
        </div>
        <p className="chartcard__answers">
          <Quotes size={18} weight="fill" aria-hidden="true" /> {formatCount(r.answered)} written {r.answered === 1 ? "answer" : "answers"} from {formatCount(r.n)} people
          <ComputedMark />
        </p>
        <Link href={surveyHref(surveyId, "themes")} className="btn btn--sm btn--secondary">
          See themes <ArrowRight size={16} weight="bold" aria-hidden="true" />
        </Link>
      </section>
    );
  }
  if (r.kind === "personal") {
    return (
      <section className="chartcard chartcard--open">
        <div className="chartcard__head">
          <h3>{title}</h3>
          <Badge kind="dpdp" />
        </div>
        <p className="chartcard__answers">
          Personal data is never charted. {formatCount(r.answered)} {r.answered === 1 ? "person" : "people"} left one <ComputedMark />. It’s kept out of AI features and visible only in Responses.
        </p>
      </section>
    );
  }
  if (r.n === 0) {
    return (
      <section className="chartcard chartcard--open">
        <div className="chartcard__head">
          <h3>{title}</h3>
        </div>
        <p className="chartcard__answers">No answers to chart yet.</p>
      </section>
    );
  }
  if (r.kind === "nps") {
    return (
      <ChartCard
        title={title}
        answers={`Answered by ${formatCount(r.n)} people, on a 0 to 10 scale`}
        n={r.n}
        caveats={extra}
        table={{
          head: ["Score", "People"],
          rows: [...r.dist.map((c, i) => [String(i), c] as (string | number)[]), ["Net Promoter Score", r.score]],
        }}
      >
        <NpsChart score={r.score} dist={r.dist} groups={[r.detractors, r.passives, r.promoters]} />
      </ChartCard>
    );
  }
  if (r.kind === "likert") {
    const summary = `${r.pos}% positive${r.hasNeutral ? ` · ${r.neutral}% in the middle` : ""} · ${r.neg}% negative`;
    return (
      <ChartCard
        title={title}
        answers={
          <>
            {summary} <ComputedMark />
          </>
        }
        n={r.n}
        caveats={extra}
        table={{ head: ["Answer", "People", "Share"], rows: r.rows.map((x) => [x.label, x.count, `${x.pct}%`]) }}
      >
        <LikertBar rows={r.rows} summary={summary} />
      </ChartCard>
    );
  }
  return (
    <ChartCard
      title={title}
      answers={r.multi ? `Answered by ${formatCount(r.n)} people. Shares are of people, not of picks.` : `Answered by ${formatCount(r.n)} people`}
      n={r.n}
      caveats={r.multi ? ["multi_select", ...extra] : extra}
      table={{ head: ["Answer", "People", "Share"], rows: r.rows.map((x) => [x.label, x.count, `${x.pct}%`]) }}
    >
      <HBars rows={r.rows} />
    </ChartCard>
  );
}

/** Keep / Exclude decisions live on the survey (Responses, build step 13). */
export function setReview(surveyId: string, responseId: string, decision: "keep" | "exclude" | null) {
  studio.patch(surveyId, (s) => {
    const next = { ...(s.review ?? {}) };
    if (decision) next[responseId] = decision;
    else delete next[responseId];
    return { review: next };
  });
}
