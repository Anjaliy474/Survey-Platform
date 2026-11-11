"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";

export type DecisionsData = {
  title: string;
  started: number;
  finished: number;
  completion: number;
  leftAt: number[];
  maxLeft: number;
  dropSentence: string;
  highest: number | null;
  themeQuestion: string;
  answersWithContent: number;
  themes: { label: string; count: number; pct: number }[];
  minority: { quote: string; responseId: string };
  answer: { overall: number; overallN: number; onCampus: number; onCampusN: number; dayScholars: number; dayScholarsN: number };
};

const STEPS = [
  {
    kicker: "How many?",
    title: "See who took part and where they left",
    body: "Starts, finishes and the exact drop-off point.",
  },
  {
    kicker: "What did they say?",
    title: "Open answers, grouped for you",
    body: "Themes backed by real quotes. Code does the counting.",
  },
  {
    kicker: "So what?",
    title: "Ask your data in plain words",
    body: "Short answers, with the maths one tap away.",
  },
];

/**
 * M1 §5 "From answers to decisions": three steps on the left, a sticky dashboard on the
 * right whose panel lights up as each step scrolls into view (DESIGN.md §8.1–8.5).
 */
export function AnswersToDecisions({ data }: { data: DecisionsData }) {
  const [active, setActive] = useState(0);
  const [showHow, setShowHow] = useState(false);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="band band--mist decide" id="decide" aria-labelledby="decide-title">
      <div className="wrap">
        <div className="section-head" data-reveal>
          <span className="eyebrow">From answers to decisions</span>
          <h2 id="decide-title" className="section-head__title">
            Three questions every survey owner asks
          </h2>
        </div>

        <div className="decide__grid">
          <ol className="decide__steps">
            {STEPS.map((s, i) => (
              <li
                key={s.kicker}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                data-step={i}
                className={`decide__step ${active === i ? "is-active" : ""}`}
              >
                <button type="button" className="decide__step-btn" aria-pressed={active === i} onClick={() => setActive(i)}>
                  <span className="decide__kicker">
                    <span className="decide__num">{i + 1}</span>
                    {s.kicker}
                  </span>
                  <span className="decide__title">{s.title}</span>
                </button>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="dash">
            {/* Panel 1: participation and drop-off */}
            <div className={`card dash__panel ${active === 0 ? "is-lit" : ""}`}>
              <div className="dash__head">
                <h3>{data.title}</h3>
                <Badge kind="computed" />
              </div>
              <dl className="funnel">
                <div>
                  <dt>Started</dt>
                  <dd className="tabular">{data.started}</dd>
                </div>
                <div>
                  <dt>Finished</dt>
                  <dd className="tabular">{data.finished}</dd>
                </div>
                <div>
                  <dt>Completion</dt>
                  <dd className="tabular">{data.completion}%</dd>
                </div>
              </dl>
              <p className="dash__sub">People who left, by the question they stopped at</p>
              <div className="drop" role="img" aria-label={`Drop-off by question. ${data.dropSentence}`}>
                {data.leftAt.map((n, i) => (
                  <span key={i} className={`drop__col ${i === data.highest ? "is-hot" : ""}`}>
                    <span className="drop__val tabular">{n}</span>
                    <i style={{ "--h": `${Math.max(6, (n / data.maxLeft) * 100)}%` } as CSSProperties} />
                    <span className="drop__q">Q{i + 1}</span>
                  </span>
                ))}
              </div>
              <p className="dash__note">{data.dropSentence}</p>
            </div>

            {/* Panel 2: themes */}
            <div className={`card dash__panel ${active === 1 ? "is-lit" : ""}`}>
              <div className="dash__head">
                <h3>“{data.themeQuestion}”</h3>
                <Badge kind="ai">AI themes</Badge>
              </div>
              <ul className="themes">
                {data.themes.map((t) => (
                  <li key={t.label}>
                    <span>{t.label}</span>
                    <span className="mono tabular">
                      {t.count} · {t.pct}%
                    </span>
                    <span className="themes__bar" aria-hidden="true">
                      <i className="grow-x" style={{ "--v": `${t.pct}%` } as CSSProperties} />
                    </span>
                  </li>
                ))}
                <li className="themes__minority">
                  <span>
                    Said by one person: “{data.minority.quote}”
                  </span>
                  <span className="mono">{data.minority.responseId}</span>
                </li>
              </ul>
              <p className="dash__note">
                <Badge kind="computed" /> Counts and shares out of {data.answersWithContent} written answers.
              </p>
            </div>

            {/* Panel 3: ask your data */}
            <div className={`card dash__panel ${active === 2 ? "is-lit" : ""}`}>
              <div className="chat">
                <p className="chat__user">Should we open on Sundays?</p>
                <div className="chat__ai">
                  <span className="chat__interp">I read this as: how many respondents say they’d likely visit on a Sunday.</span>
                  <p>
                    <span className="num-chip">{data.answer.overall}%</span> of{" "}
                    <span className="num-chip">{data.answer.overallN}</span> respondents said they’d likely visit on a
                    Sunday. Students living on campus said this more often than day scholars (
                    <span className="num-chip">{data.answer.onCampus}%</span> vs{" "}
                    <span className="num-chip">{data.answer.dayScholars}%</span>).
                  </p>
                  <div className="chat__caveats">
                    <Badge kind="warning">Link, not cause</Badge>
                    <Badge kind="sample">Convenience sample</Badge>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    aria-expanded={showHow}
                    aria-controls="how-calculated"
                    onClick={() => setShowHow((v) => !v)}
                  >
                    {showHow ? "Hide calculation" : "Show how this was calculated"}
                  </button>
                  <pre id="how-calculated" className="how-box" hidden={!showHow}>
                    {`run_query(measure = share,
          field = Q5 "likely_sunday_visit",
          group_by = Q2 "lives_on_campus")
→ all n = ${data.answer.overallN} · on campus n = ${data.answer.onCampusN} · day scholars n = ${data.answer.dayScholarsN}`}
                  </pre>
                </div>
              </div>
            </div>
            <p className="sample-note">
              <Badge kind="sample" /> Example survey with sample numbers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
