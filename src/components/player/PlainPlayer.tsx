"use client";

import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/client-hooks";
import { hasAnswer } from "@/lib/survey/answers";
import { isOpen } from "@/lib/survey/mechanics";
import { plainSeconds, formatAbout } from "@/lib/survey/timing";
import type { PublicSurvey } from "@/lib/survey/public";
import { Mechanic } from "./Mechanic";
import { ProgressBar, RemainingPill } from "./mechanics";
import type { PlayerSession } from "./usePlayerSession";

const AUTO_ADVANCE_MS = 400;
const SINGLE = new Set(["tap_chips_single", "this_or_that", "segmented_scale", "emoji_scale", "number_row_11"]);

/**
 * One question per screen (DESIGN.md §7.1): progress, remaining pill, lead-in, question,
 * mechanic, the same feedback for every answer, Back / Next. Used for the plain arm,
 * "Prefer a plain form?" and every fallback.
 */
export function PlainPlayer({
  survey,
  session,
  onDone,
  startAt = 0,
}: {
  survey: PublicSurvey;
  session: PlayerSession;
  onDone: () => void;
  startAt?: number;
}) {
  const reduce = usePrefersReducedMotion();
  const [step, setStep] = useState(startAt);
  const [limitNote, setLimitNote] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const questions = survey.questions;
  const q = questions[step];
  const item = survey.gamifier.items.find((i) => i.question_id === q.id)!;
  const answers = session.response?.answers ?? {};
  const value = answers[q.id];
  const level = survey.picks.level;
  const showFeedback = level !== "light" && hasAnswer(value);
  const rest = questions.slice(step);
  const milestone = survey.gamifier.milestones.find((m) => m.after_question_id === questions[step - 1]?.id);
  const canNext = hasAnswer(value) || isOpen(q) || !q.required;
  const last = step === questions.length - 1;

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  function go(next: number) {
    window.clearTimeout(timer.current);
    setLimitNote("");
    if (next >= questions.length) return onDone();
    setStep(Math.max(0, next));
  }

  const timeLeft = formatAbout(plainSeconds(rest));
  const qId = `q-${q.id}`;

  return (
    <div className="splayer__col">
      <div className="splayer__top">
        <ProgressBar value={step / questions.length} />
        <div className="splayer__row">
          <RemainingPill>
            {rest.length} left · {timeLeft}
          </RemainingPill>
        </div>
        <p className="sr-only" aria-live="polite">
          Question {step + 1} of {questions.length}
        </p>
      </div>

      <div className="splayer__body" key={q.id} style={reduce ? undefined : { animation: "phone-in 280ms var(--ps-ease-out)" }}>
        {milestone && <p className="splayer__milestone">{milestone.copy.replace("{{time_left}}", timeLeft).replace("{{questions_left}}", String(rest.length))}</p>}
        {item.lead_in && <p className="pl-lead">{item.lead_in}</p>}
        <h2 id={qId} ref={headingRef} tabIndex={-1} className="pl-question">
          {q.text}
        </h2>
        {item.helper_text && <p className="pl-helper">{item.helper_text}</p>}
        <Mechanic
          question={q}
          item={item}
          value={value}
          labelledBy={qId}
          pop={!reduce && level !== "light"}
          onLimit={(max) => setLimitNote(`You can pick up to ${max}. Untick one to swap.`)}
          onChange={(a) => {
            session.answer(q.id, a);
            if (SINGLE.has(item.mechanic)) {
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => go(step + 1), AUTO_ADVANCE_MS);
            }
          }}
        />
        <p className="pl-feedback" aria-live="polite">
          {limitNote || (showFeedback ? item.feedback_after_answer : "")}
        </p>
      </div>

      <div className="splayer__bar">
        <div className="pl-nav">
          <button type="button" className="pl-back" aria-label="Previous question" disabled={step === 0} onClick={() => go(step - 1)}>
            <ArrowLeft size={20} weight="bold" />
          </button>
          <button type="button" className="pl-next" disabled={!canNext} onClick={() => go(step + 1)}>
            {isOpen(q) && !hasAnswer(value) ? (last ? "Skip and submit" : "Skip") : last ? "Submit" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
