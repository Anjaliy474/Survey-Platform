"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/client-hooks";
import { DiffSuggestion, DraftSuggestion, NewQuestionSuggestion } from "./StartSuggestions";

/**
 * Start chooser card with a tiny animated example (DESIGN.md §6.1): a typing loop that
 * ends in an AI suggestion. The loop stops as soon as the visitor interacts with the
 * suggestion. Server render and reduced motion show the finished, static example.
 */
export function StartCard({
  icon,
  tone,
  title,
  description,
  typed,
  delay = 0,
  suggestion,
  estimate = "",
}: {
  icon: ReactNode;
  tone: "teal" | "persimmon" | "marigold";
  title: string;
  description: string;
  typed: string;
  delay?: number;
  suggestion: "diff" | "new-question" | "draft";
  estimate?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(typed.length);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || reduce || interacted) return;
    const timers: number[] = [];
    let typing = 0;
    const run = () => {
      setShowSuggestion(false);
      setShown(0);
      let i = 0;
      typing = window.setInterval(() => {
        i += 1;
        setShown(i);
        if (i >= typed.length) {
          window.clearInterval(typing);
          timers.push(window.setTimeout(() => setShowSuggestion(true), 450));
          timers.push(window.setTimeout(run, 6400));
        }
      }, 42);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        timers.push(window.setTimeout(run, delay));
      },
      { threshold: 0.45 },
    );
    io.observe(card);
    return () => {
      io.disconnect();
      window.clearInterval(typing);
      timers.forEach((t) => window.clearTimeout(t));
      setShown(typed.length);
      setShowSuggestion(true);
    };
  }, [reduce, interacted, typed, delay]);

  const typing = shown < typed.length;
  const onInteract = () => setInteracted(true);

  return (
    <article ref={cardRef} className="card start-card" data-reveal style={{ "--reveal-delay": `${delay / 4}ms` } as CSSProperties}>
      <span className={`clay-tile clay-tile--${tone}`} aria-hidden="true">
        {icon}
      </span>
      <h3 className="start-card__title">{title}</h3>
      <p className="start-card__desc">{description}</p>
      <div className="start-card__screen">
        <p className={`typed ${typing ? "is-typing" : ""}`}>
          <span className="sr-only">Example input: {typed}</span>
          <span aria-hidden="true">{typed.slice(0, shown)}</span>
        </p>
        <div className={`suggestion ${showSuggestion ? "" : "is-hidden"}`} inert={!showSuggestion}>
          {suggestion === "diff" && <DiffSuggestion onInteract={onInteract} />}
          {suggestion === "new-question" && <NewQuestionSuggestion onInteract={onInteract} />}
          {suggestion === "draft" && <DraftSuggestion onInteract={onInteract} estimate={estimate} />}
        </div>
      </div>
    </article>
  );
}
