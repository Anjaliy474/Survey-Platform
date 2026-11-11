"use client";

import { ArrowCounterClockwise, ArrowDown, ArrowLeft, CoffeeBean, Leaf, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion, useSpring } from "motion/react";
import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmojiScale, ProgressBar, RemainingPill, TapChipsMulti, ThisOrThat } from "@/components/player/mechanics";
import { submittedPoll, useFinePointer, usePrefersReducedMotion } from "@/lib/client-hooks";
import { formatCount } from "@/lib/compute";
import {
  DEMO_POLL,
  DRINKS,
  EMPTY_ANSWERS,
  FEELINGS,
  SNACKS,
  SNACK_LIMIT,
  SNACK_NONE,
  computeReveal,
  remainingLabel,
  type DemoAnswers,
  type PollStats,
} from "@/lib/demo-poll";

const AUTO_ADVANCE_MS = 400;
const QUESTIONS = DEMO_POLL.questions;
const DRINK_OPTIONS = [
  { label: DRINKS[0], Icon: Leaf, tone: "var(--ps-viz-1)" },
  { label: DRINKS[1], Icon: CoffeeBean, tone: "var(--ps-viz-2)" },
] as const;

/**
 * The live poll card (UI_UX_LAYOUT.md M1): a real Player at Medium playful level with
 * three mechanics. Submit flips the card to the aggregate reveal, computed in code.
 */
export function LivePoll({ stats }: { stats: PollStats }) {
  const reduce = usePrefersReducedMotion();
  const fine = useFinePointer();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<DemoAnswers>(EMPTY_ANSWERS);
  const [answeredStep, setAnsweredStep] = useState<number | null>(null);
  const [limitNote, setLimitNote] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [burst, setBurst] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const focusNext = useRef(false);

  // Gentle 3D tilt toward the cursor (mouse only, never with reduced motion).
  const rotateX = useSpring(0, { stiffness: 140, damping: 16 });
  const rotateY = useSpring(0, { stiffness: 140, damping: 16 });

  const q = QUESTIONS[step];
  const qId = `poll-q-${q.id}`;
  const reveal = useMemo(() => (flipped ? computeReveal(stats, answers) : null), [flipped, stats, answers]);
  const canContinue = step === 0 ? answers.drink !== null : step === 1 ? answers.feel !== null : answers.snacks.length > 0;

  function goTo(next: number) {
    window.clearTimeout(timer.current);
    focusNext.current = !!cardRef.current?.contains(document.activeElement);
    setLimitNote("");
    if (next >= QUESTIONS.length) {
      submit();
      return;
    }
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function pickSingle(key: "drink" | "feel", value: number) {
    setAnswers((a) => ({ ...a, [key]: value }));
    setAnsweredStep(step);
    window.clearTimeout(timer.current);
    const from = step;
    timer.current = window.setTimeout(() => goTo(from + 1), AUTO_ADVANCE_MS);
  }

  function toggleSnack(i: number) {
    const current = answers.snacks;
    let next: number[];
    if (i === SNACK_NONE) next = current.includes(SNACK_NONE) ? [] : [SNACK_NONE];
    else if (current.includes(i)) next = current.filter((x) => x !== i);
    else if (current.filter((x) => x !== SNACK_NONE).length >= SNACK_LIMIT) {
      setLimitNote(`You can pick up to ${SNACK_LIMIT}. Untick one to swap.`);
      return;
    } else next = [...current.filter((x) => x !== SNACK_NONE), i];
    setLimitNote("");
    setAnswers((a) => ({ ...a, snacks: next }));
    setAnsweredStep(next.length > 0 ? step : null);
  }

  function submit() {
    setFlipped(true);
    submittedPoll.set(answers);
    if (!reduce) setBurst(true);
  }

  function replay() {
    window.clearTimeout(timer.current);
    setAnswers(EMPTY_ANSWERS);
    setAnsweredStep(null);
    setStep(0);
    setDirection(-1);
    setFlipped(false);
    submittedPoll.set(null);
    window.setTimeout(() => questionRef.current?.focus({ preventScroll: true }), 50);
  }

  const slide = reduce ? 0 : 28;
  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * slide }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -slide }),
  };

  return (
    <motion.div
      className="poll-tilt"
      style={{ rotateX, rotateY }}
      onPointerMove={(e) => {
        if (!fine || reduce) return;
        const r = e.currentTarget.getBoundingClientRect();
        rotateY.set(((e.clientX - r.left) / r.width - 0.5) * 7);
        rotateX.set(-((e.clientY - r.top) / r.height - 0.5) * 5);
      }}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
    >
      {burst && <Burst />}
      <div ref={cardRef} className={`poll-card theme-marigold ${flipped ? "is-flipped" : ""}`}>

        {/* ---------- Front: the poll ---------- */}
        <section className="poll-face poll-face--front" aria-label="Live demo poll" inert={flipped}>
          <div className="poll-top">
            <span className="poll-live">
              <i aria-hidden="true" /> Live demo poll
            </span>
            <RemainingPill>{remainingLabel(step)}</RemainingPill>
          </div>
          <ProgressBar value={step / QUESTIONS.length} />
          <p className="poll-purpose">
            <LockSimple size={14} weight="bold" aria-hidden="true" />
            <span>{DEMO_POLL.purposeLine}</span>
          </p>
          <p className="sr-only" aria-live="polite">
            Question {step + 1} of {QUESTIONS.length}
          </p>

          <div className="poll-body">
            <AnimatePresence
              mode="wait"
              initial={false}
              custom={direction}
              onExitComplete={() => {
                if (focusNext.current) questionRef.current?.focus({ preventScroll: true });
                focusNext.current = false;
              }}
            >
              <motion.div
                key={step}
                className="poll-q"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduce ? 0.12 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <p className="pl-lead">{q.leadIn}</p>
                <h2 id={qId} ref={questionRef} tabIndex={-1} className="pl-question">
                  {q.text}
                </h2>
                {"helper" in q && <p className="pl-helper">{q.helper}</p>}

                {step === 0 && (
                  <ThisOrThat
                    options={DRINK_OPTIONS}
                    value={answers.drink}
                    onChange={(i) => pickSingle("drink", i)}
                    labelledBy={qId}
                    pop={!reduce}
                  />
                )}
                {step === 1 && (
                  <>
                    <EmojiScale
                      points={FEELINGS}
                      value={answers.feel}
                      onChange={(i) => pickSingle("feel", i)}
                      labelledBy={qId}
                      pop={!reduce}
                    />
                    {fine && (
                      <p className="pl-keyhint">
                        Tip: press <kbd>1</kbd>–<kbd>5</kbd>
                      </p>
                    )}
                  </>
                )}
                {step === 2 && (
                  <TapChipsMulti
                    options={SNACKS}
                    value={answers.snacks}
                    onToggle={toggleSnack}
                    labelledBy={qId}
                    pop={!reduce}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="pl-feedback" aria-live="polite">
            {limitNote || (answeredStep === step ? DEMO_POLL.feedback : "")}
          </p>
          <div className="pl-nav">
            <button
              type="button"
              className="pl-back"
              aria-label="Previous question"
              disabled={step === 0}
              onClick={() => goTo(step - 1)}
            >
              <ArrowLeft size={20} weight="bold" />
            </button>
            <button type="button" className="pl-next" disabled={!canContinue} onClick={() => goTo(step + 1)}>
              {step === QUESTIONS.length - 1 ? "Submit" : "Next"}
            </button>
          </div>
        </section>

        {/* ---------- Back: the reveal ---------- */}
        <section className="poll-face poll-face--back" aria-label="Poll results" inert={!flipped}>
          <div className="poll-top">
            <Badge kind="sample" />
            <Badge kind="computed" />
          </div>
          {reveal?.kind === "reveal" && (
            <>
              <h2 className="reveal-title">
                Here’s how {formatCount(reveal.respondentCount)} people answered
              </h2>
              <div className="reveal-block">
                <p className="reveal-q">Chai or coffee?</p>
                {reveal.drink.map((r) => (
                  <RevealRow key={r.label} label={r.label} pct={r.pct} you={r.you} />
                ))}
              </div>
              <div className="reveal-block">
                <p className="reveal-q">Long online forms</p>
                {reveal.feel.map((r) => (
                  <RevealRow key={r.label} label={`${r.face} ${r.label}`} pct={r.pct} you={r.you} />
                ))}
              </div>
              {reveal.snacks.length > 0 && (
                <div className="reveal-block">
                  <p className="reveal-q">Your snacks, and how many others picked them</p>
                  <div className="reveal-snacks">
                    {reveal.snacks.map((s) => (
                      <span key={s.label} className="reveal-snack">
                        {s.label} <b className="tabular">{s.pct}%</b>
                      </span>
                    ))}
                  </div>
                  <p className="reveal-caveat">Multi-select, so these don’t add up to 100%.</p>
                </div>
              )}
            </>
          )}
          {reveal?.kind === "teaser" && (
            <p className="reveal-title">Results appear here once 20 people have answered. Thanks for being early!</p>
          )}
          <p className="reveal-foot">
            In the product: shown after 20+ responses, as group totals only.
          </p>
          <div className="pl-nav">
            <button type="button" className="pl-back" aria-label="Play the poll again" onClick={replay}>
              <ArrowCounterClockwise size={20} weight="bold" />
            </button>
            <a className="pl-next" href="#creator">
              See the creator view <ArrowDown size={16} weight="bold" aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function RevealRow({ label, pct, you }: { label: string; pct: number; you: boolean }) {
  return (
    <div className={`reveal-row ${you ? "is-you" : ""}`}>
      <span className="reveal-row__label">
        {label}
        {you && <span className="you-tag">You</span>}
      </span>
      <span className="reveal-row__bar" aria-hidden="true">
        <i style={{ "--v": `${pct}%` } as CSSProperties} />
      </span>
      <span className="reveal-row__val tabular">{pct}%</span>
    </div>
  );
}

const BURST_COLORS = ["var(--ps-persimmon-400)", "var(--ps-marigold-400)", "var(--ps-viz-2)", "var(--ps-sky-accent)"];

/** One celebration burst (DESIGN.md §7.3): 26 squares, 1s, only the first time. Deterministic layout. */
function Burst() {
  return (
    <div className="burst" aria-hidden="true">
      {Array.from({ length: 26 }, (_, k) => {
        const angle = (k * 137.508 * Math.PI) / 180;
        const radius = 120 + ((k * 53) % 130);
        return (
          <i
            key={k}
            style={
              {
                background: BURST_COLORS[k % BURST_COLORS.length],
                "--x": `${Math.cos(angle) * radius}px`,
                "--y": `${Math.sin(angle) * radius}px`,
                "--r": `${(k * 71) % 360}deg`,
                animationDelay: `${(k % 5) * 30}ms`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
