import Link from "next/link";
import type { CSSProperties } from "react";
import { Check, LockSimple } from "@/components/icons";
import { STEPS, surveyHref } from "@/lib/studio/sections";
import type { CreateStep, Section } from "@/lib/studio/types";

/**
 * Step rail (DESIGN.md §5.11): Questions → Style → Publish → Results. Done steps are teal with a
 * tick and link back; the current step is persimmon with a white ring; Results stays locked until
 * the survey is published. On phones it collapses to "Step 2 of 4 · Style".
 */
export function StepRail({ surveyId, reached, current }: { surveyId: string; reached: CreateStep; current: Section }) {
  const reachedIndex = STEPS.findIndex((s) => s.section === reached);
  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.section === current));

  return (
    <nav className="steprail" aria-label="Survey steps">
      <p className="steprail__compact">
        Step {currentIndex + 1} of {STEPS.length} · {STEPS[currentIndex].label}
      </p>
      <ol className="steprail__list" style={{ "--fill": `${(reachedIndex / (STEPS.length - 1)) * 100}%` } as CSSProperties}>
        {STEPS.map((step, i) => {
          const isCurrent = i === currentIndex;
          const locked = step.section === "results";
          const reachable = !locked && i <= reachedIndex;
          const state = isCurrent ? "current" : reachable ? "done" : "upcoming";
          const dot = (
            <span className="steprail__dot" aria-hidden="true">
              {state === "done" && <Check size={14} />}
              {locked && !isCurrent && <LockSimple size={12} weight="bold" />}
            </span>
          );
          return (
            <li key={step.section} className={`steprail__step is-${state}`}>
              {reachable && !isCurrent ? (
                <Link href={surveyHref(surveyId, step.section)}>
                  {dot}
                  <span>{step.label}</span>
                </Link>
              ) : (
                <span aria-current={isCurrent ? "step" : undefined} aria-disabled={!isCurrent || undefined}>
                  {dot}
                  <span>
                    {step.label}
                    {locked && !isCurrent && <span className="sr-only"> (unlocks after publishing)</span>}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
