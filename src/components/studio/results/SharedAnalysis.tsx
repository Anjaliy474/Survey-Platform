"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Printer } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { formatCount } from "@/lib/compute";
import { formatSeconds } from "@/lib/results/compute";
import { type Snapshot, type SnapQuestion, decodeSnapshot } from "@/lib/results/snapshot";
import { ChartCard, HBars, KpiTile, LikertBar, NpsChart } from "./charts";
import { KeyInsights } from "./KeyInsights";

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

/** The read-only analysis page a shared link opens (/r#…). Works on any device: the data is in the link. */
export function SharedAnalysis() {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1),
    () => null,
  );
  const [state, setState] = useState<{ for: string; snap: Snapshot | null } | null>(null);

  useEffect(() => {
    if (hash === null) return;
    let alive = true;
    (hash ? decodeSnapshot(hash) : Promise.resolve(null)).then((snap) => {
      if (alive) setState({ for: hash, snap });
    });
    return () => {
      alive = false;
    };
  }, [hash]);

  const ready = state && state.for === hash;
  if (!ready)
    return (
      <main className="shared shared--loading" aria-busy="true">
        <p>Opening the analysis…</p>
      </main>
    );
  const s = state.snap;
  if (!s)
    return (
      <main className="shared">
        <div className="shared__missing">
          <h1>This link doesn’t open an analysis</h1>
          <p>It may have been cut short when it was copied. Ask the person who shared it to send it again.</p>
          <Link href="/" className="btn btn--md btn--secondary">
            Go to PlaySurvey
          </Link>
        </div>
      </main>
    );

  return (
    <main className="shared">
      <header className="shared__head">
        <Link href="/" className="shared__brand">
          PlaySurvey
        </Link>
        <button type="button" className="btn btn--sm btn--secondary shared__print" onClick={() => window.print()}>
          <Printer size={16} weight="regular" aria-hidden="true" /> Print or save as PDF
        </button>
      </header>

      <div className="shared__title">
        <p className="shared__eyebrow">
          Survey analysis · shared by {s.creator} {s.isSample && <Badge kind="sample" />}
        </p>
        <h1>{s.title}</h1>
        <p className="shared__meta">
          As of {dateFmt.format(s.at)} · based on {formatCount(s.base)} {s.base === 1 ? "response" : "responses"} from people who chose to answer
        </p>
      </div>

      <div className="kpis">
        <KpiTile label="Responses" value={s.finished} format={(v) => formatCount(Math.round(v))} how={`${formatCount(s.started)} started`} />
        <KpiTile label="Completion" value={s.completionPct} format={(v) => `${Math.round(v)}%`} how="Of everyone who started" />
        <KpiTile label="Median time" value={s.medianSeconds} format={(v) => formatSeconds(v)} how="Half finished faster" />
      </div>

      <section className="results__insights" aria-labelledby="sh-ins">
        <h2 id="sh-ins" className="results__h2">
          Key insights
        </h2>
        <KeyInsights set={{ insights: s.insights, notes: s.notes, base: s.base }} />
      </section>

      <section aria-labelledby="sh-q">
        <h2 id="sh-q" className="results__h2">
          Question by question
        </h2>
        <div className="results__questions">
          {s.questions.map((q) => (
            <SharedQuestion key={q.title} q={q} />
          ))}
        </div>
      </section>

      <footer className="shared__foot">
        <p>A read-only copy made with PlaySurvey. Numbers are computed from the responses; individual answers and comments are not included.</p>
      </footer>
    </main>
  );
}

function SharedQuestion({ q }: { q: SnapQuestion }) {
  if (q.kind === "open")
    return (
      <section className="chartcard chartcard--open">
        <div className="chartcard__head">
          <h3>{q.title}</h3>
        </div>
        <p className="chartcard__answers">
          {formatCount(q.answered)} written {q.answered === 1 ? "answer" : "answers"}. Comments stay private to the survey owner.
        </p>
      </section>
    );
  if (q.kind === "nps")
    return (
      <ChartCard title={q.title} answers={`Answered by ${formatCount(q.n)} people, on a 0 to 10 scale`} n={q.n} table={{ head: ["Score", "People"], rows: q.dist.map((c, i) => [String(i), c]) }}>
        <NpsChart score={q.score} dist={q.dist} groups={q.groups} />
      </ChartCard>
    );
  if (q.kind === "likert")
    return (
      <ChartCard title={q.title} answers={q.summary} n={q.n} table={{ head: ["Answer", "People", "Share"], rows: q.rows.map((x) => [x.label, x.count, `${x.pct}%`]) }}>
        <LikertBar rows={q.rows} summary={q.summary} />
      </ChartCard>
    );
  return (
    <ChartCard
      title={q.title}
      answers={q.multi ? `Answered by ${formatCount(q.n)} people. Shares are of people, not of picks.` : `Answered by ${formatCount(q.n)} people`}
      n={q.n}
      caveats={q.multi ? ["multi_select"] : []}
      table={{ head: ["Answer", "People", "Share"], rows: q.rows.map((x) => [x.label, x.count, `${x.pct}%`]) }}
    >
      <HBars rows={q.rows} />
    </ChartCard>
  );
}
