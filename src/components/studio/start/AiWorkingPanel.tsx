"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowClockwise, ArrowRight, Check, Warning } from "@/components/icons";
import { Badge, ComputedMark } from "@/components/ui/Badge";
import { formatAbout } from "@/lib/compute";
import type { ShapeStage } from "@/lib/ai/types";
import type { ShapeState } from "./useShape";

const STAGES: { stage: ShapeStage; label: string }[] = [
  { stage: "reading", label: "Reading your brief" },
  { stage: "shaping", label: "Shaping questions" },
  { stage: "bias", label: "Checking for bias" },
  { stage: "rules", label: "Applying length and privacy rules" },
];

const STATUS_NOTE: Record<string, string> = {
  needs_clarification: "A few details would make this better. We still wrote a starter draft for you.",
  conflict: "Your questions don’t all fit. We suggest a core set and list the rest for you to decide.",
  declined_with_alternative: "We didn’t write questions that push one answer. You’ll find a neutral version instead.",
};

/**
 * AI working panel (DESIGN.md §5.10): AI badge, progress bar and a step list that ticks only
 * when the server reports each real stage. Announced politely to screen readers.
 */
export function AiWorkingPanel({
  state,
  draftHref,
  onRetry,
  onEdit,
}: {
  state: ShapeState;
  draftHref: string | null;
  onRetry: () => void;
  onEdit: () => void;
}) {
  const openRef = useRef<HTMLAnchorElement>(null);
  const done = state.phase === "working" || state.phase === "done" ? state.done : [];
  const progress = state.phase === "done" ? 1 : done.length / (STAGES.length + 1);

  useEffect(() => {
    if (state.phase === "done" && draftHref) openRef.current?.focus();
  }, [state.phase, draftHref]);

  return (
    <section className="ai-panel" aria-labelledby="ai-panel-title" aria-busy={state.phase === "working"}>
      <div className="ai-panel__head">
        <Badge kind="ai" />
        <h2 id="ai-panel-title">{state.phase === "done" ? "Your draft is ready" : state.phase === "error" ? "That didn’t work" : "Working on your draft"}</h2>
      </div>

      {state.phase !== "error" && (
        <div className="ai-panel__bar" aria-hidden="true">
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}

      <ol className="ai-panel__steps" aria-live="polite">
        {STAGES.map(({ stage, label }, i) => {
          const isDone = done.includes(stage);
          const isActive = state.phase === "working" && !isDone && i === done.length;
          // Steps appear only once the server has reported them (or as the one in progress).
          if (!isDone && !isActive) return null;
          return (
            <li key={stage} className={isDone ? "is-done" : "is-active"}>
              <span className="ai-panel__icon" aria-hidden="true">
                {isDone ? <Check size={14} /> : <i className="ai-panel__spinner" />}
              </span>
              {label}
              {isDone && <span className="sr-only"> (done)</span>}
            </li>
          );
        })}
      </ol>

      {state.phase === "done" && (
        <div className="ai-panel__result">
          <p className="ai-panel__stats">
            {state.ai.rules.questionCount} questions · {formatAbout(state.ai.rules.seconds)}
            <ComputedMark />
            {state.ai.bias.findings.length > 0 && (
              <span className="badge badge--warning">
                <Warning size={12} weight="bold" /> {state.ai.bias.findings.length} to review
              </span>
            )}
          </p>
          <p>{state.ai.shaper.summary_for_creator}</p>
          {STATUS_NOTE[state.ai.shaper.status] && <p className="ai-panel__status">{STATUS_NOTE[state.ai.shaper.status]}</p>}
          {draftHref && (
            <Link ref={openRef} href={draftHref} className="btn btn--md btn--primary">
              Review your draft <ArrowRight size={16} />
            </Link>
          )}
        </div>
      )}

      {state.phase === "error" && (
        <div className="ai-panel__result" role="alert">
          <p>{state.message}</p>
          <div className="ai-panel__actions">
            <button type="button" className="btn btn--md btn--primary" onClick={onRetry}>
              <ArrowClockwise size={16} weight="regular" /> Try again
            </button>
            <button type="button" className="btn btn--md btn--secondary" onClick={onEdit}>
              Edit what I wrote
            </button>
          </div>
        </div>
      )}

      {state.phase === "done" && (
        <button type="button" className="btn btn--ghost ai-panel__edit" onClick={onEdit}>
          Change what I wrote and draft again
        </button>
      )}

      <p className="ai-panel__note">
        Demo mode: until the Claude connection is added, a built-in stand-in writes these suggestions in the same format.
      </p>
    </section>
  );
}
