"use client";

import { ChartBar, HandHeart, Rocket, Student } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import type { KeyboardEvent } from "react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { usePrefersReducedMotion } from "@/lib/client-hooks";

const AUDIENCES = [
  {
    id: "startup",
    tab: "Startups",
    Icon: Rocket,
    title: "Customer discovery in a day",
    listLabel: "Sample survey",
    items: [
      "Which days do you usually visit cafés near campus?",
      "What would make you visit on a Sunday?",
      "How likely are you to recommend us to a friend? (0–10)",
    ],
    insight: "Brunch and a quiet study spot came up most for Sundays.",
  },
  {
    id: "research",
    tab: "Researchers",
    Icon: Student,
    title: "Questions you can defend",
    listLabel: "Sample survey",
    items: [
      "How many hours a week do you spend on coursework outside class?",
      "How manageable does your workload feel?",
      "What, if anything, would help most?",
    ],
    insight: "Every theme traces back to quotes and response IDs.",
  },
  {
    id: "org",
    tab: "Colleges & NGOs",
    Icon: HandHeart,
    title: "A quick pulse people actually answer",
    listLabel: "Sample survey",
    items: [
      "How did you hear about the event?",
      "How satisfied were you with the event overall?",
      "Anything we should do differently next time? (optional)",
    ],
    insight: "Most drop-off came at the open question, so it moves last.",
  },
  {
    id: "analyst",
    tab: "Analysts",
    Icon: ChartBar,
    title: "Dashboards from a sentence",
    listLabel: "Sample requests",
    items: [
      "“Show satisfaction by city, and the most common complaints”",
      "“Compare first-year and final-year students”",
      "“Did satisfaction change after week 2?”",
    ],
    insight: "Charts checked, small groups flagged, every number computed.",
  },
] as const;

/** M1 §7 Who it's for: tabs with a sample survey and a sample insight per audience. */
export function WhoItsFor() {
  const [active, setActive] = useState(0);
  const reduce = usePrefersReducedMotion();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const a = AUDIENCES[active];

  function onKeyDown(e: KeyboardEvent, i: number) {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % AUDIENCES.length;
    if (e.key === "ArrowLeft") next = (i - 1 + AUDIENCES.length) % AUDIENCES.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = AUDIENCES.length - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <section className="band who" id="who" aria-labelledby="who-title">
      <div className="wrap">
        <div className="section-head section-head--center" data-reveal>
          <span className="eyebrow">Who it’s for</span>
          <h2 id="who-title" className="section-head__title">
            Short surveys, for people who need answers
          </h2>
        </div>

        <div className="who__tabs" role="tablist" aria-label="Audience" data-reveal>
          {AUDIENCES.map((aud, i) => (
            <button
              key={aud.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`tab-${aud.id}`}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-controls="who-panel"
              tabIndex={active === i ? 0 : -1}
              className="who__tab"
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {active === i && (
                <motion.span
                  layoutId="who-pill"
                  className="who__pill"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <aud.Icon size={18} weight={active === i ? "fill" : "regular"} aria-hidden="true" />
              <span>{aud.tab}</span>
            </button>
          ))}
        </div>

        <div id="who-panel" role="tabpanel" aria-labelledby={`tab-${a.id}`} className="who__panel">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={a.id}
              className="who__cards"
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -8 }}
              transition={{ duration: reduce ? 0.1 : 0.22 }}
            >
              <div className="card who__card">
                <Badge kind="ai">{a.listLabel}</Badge>
                <h3>{a.title}</h3>
                <ol>
                  {a.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>
              <div className="card who__card who__card--insight">
                <Badge kind="sample">Sample insight</Badge>
                <p>{a.insight}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
