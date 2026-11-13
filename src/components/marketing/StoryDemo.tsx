"use client";

import { ArrowCounterClockwise, Clock, LockSimple } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { percentsSummingTo100 } from "@/lib/compute";
import { SceneArt } from "./StoryScene";

/**
 * Hero demo (UI_UX_LAYOUT.md M1): a three-scene Story Mode survey. A day on campus, one tap per
 * scene, then how others answered. Drawn in PlaySurvey's own palette; the results combine a
 * fixed sample group with the visitor's own answers, computed in code.
 */

type Scene = {
  id: "morning" | "lunch" | "night";
  time: string;
  place: string;
  question: string;
  options: readonly string[];
  /** Sample group's answers (fixed), the visitor's answer is added on top. */
  sample: readonly number[];
};

const SCENES: readonly Scene[] = [
  {
    id: "morning",
    time: "7:45 AM",
    place: "Hostel room",
    question: "Be honest. How did the morning start?",
    options: ["Up on time", "Snoozed twice", "Ran to class", "What morning?"],
    sample: [41, 63, 52, 28],
  },
  {
    id: "lunch",
    time: "1:15 PM",
    place: "Canteen",
    question: "Lunch today was…",
    options: ["Really good", "Just fine", "Skipped it", "Instant noodles"],
    sample: [36, 71, 33, 44],
  },
  {
    id: "night",
    time: "10:30 PM",
    place: "Hostel terrace",
    question: "What drained you most today?",
    options: ["Classes", "Assignments", "People", "Nothing, good day"],
    sample: [38, 82, 21, 43],
  },
];
const SAMPLE_SIZE = SCENES[0].sample.reduce((a, b) => a + b, 0);
const ADVANCE_MS = 650;

export function StoryDemo() {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>([null, null, null]);
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    // Move focus to the new question only after the visitor has answered one.
    if (moved.current) headingRef.current?.focus({ preventScroll: true });
  }, [step, done]);

  const scene = SCENES[step];

  function pick(i: number) {
    if (picks[step] !== null && timer.current) return;
    const next = picks.map((p, k) => (k === step ? i : p));
    setPicks(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      moved.current = true;
      if (step < SCENES.length - 1) setStep(step + 1);
      else setDone(true);
    }, ADVANCE_MS);
  }

  function restart() {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    moved.current = true;
    setPicks([null, null, null]);
    setStep(0);
    setDone(false);
  }

  return (
    <div className={`sdemo${done ? " is-done" : ""}`} aria-labelledby="sdemo-title">
      <p className="sr-only" id="sdemo-title">
        Try a three-scene story survey
      </p>
      <div className={`sdemo__scene sdemo__scene--${done ? "night" : scene.id}`} aria-hidden="true">
        <SceneArt scene={done ? "end" : scene.id} key={done ? "end" : scene.id} />
        {!done && (
          <>
            <span className="sdemo__time">
              <Clock weight="bold" /> {scene.time}
            </span>
            <span className="sdemo__place">{scene.place}</span>
          </>
        )}
      </div>

      <div className="sdemo__panel">
        {done ? (
          <div className="sdemo__end" key="end">
            <h3 className="sdemo__q" ref={headingRef} tabIndex={-1}>
              That was a story survey.
            </h3>
            <p className="sdemo__sub">You and {SAMPLE_SIZE} sample students:</p>
            <ul className="sdemo__results">
              {SCENES.map((s, k) => {
                const mine = picks[k];
                const counts = s.sample.map((c, i) => c + (i === mine ? 1 : 0));
                const pcts = percentsSummingTo100(counts);
                const top = counts.indexOf(Math.max(...counts));
                return (
                  <li key={s.id}>
                    <span className="sdemo__rq">{s.question}</span>
                    <span className="sdemo__rbar">
                      <span style={{ width: `${pcts[mine ?? top]}%` }} />
                    </span>
                    <span className="sdemo__rtext">
                      {mine !== null ? (
                        <>
                          <strong>{pcts[mine]}%</strong> also said “{s.options[mine]}”
                          {mine === top ? ", the top answer" : ""}
                        </>
                      ) : (
                        <>
                          Most said “{s.options[top]}” ({pcts[top]}%)
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="sdemo__actions">
              <Link href="/signup" prefetch={false} className="btn btn--md btn--marketing">
                Make one like it
              </Link>
              <button type="button" className="sdemo__again" onClick={restart}>
                <ArrowCounterClockwise weight="bold" aria-hidden="true" /> Play again
              </button>
            </div>
          </div>
        ) : (
          <div className="sdemo__ask" key={scene.id}>
            <p className="sdemo__eyebrow">
              {scene.time} · {scene.place}
            </p>
            <h3 className="sdemo__q" id="sdemo-q" ref={headingRef} tabIndex={-1}>
              {scene.question}
            </h3>
            <div className="sdemo__opts" role="radiogroup" aria-labelledby="sdemo-q">
              {scene.options.map((o, i) => (
                <button key={o} type="button" role="radio" aria-checked={picks[step] === i} className="sdemo__opt" onClick={() => pick(i)}>
                  {o}
                </button>
              ))}
            </div>
            <div className="sdemo__foot">
              <span className="sdemo__dots" aria-label={`Scene ${step + 1} of ${SCENES.length}`}>
                {SCENES.map((s, k) => (
                  <i key={s.id} className={k < step ? "is-done" : k === step ? "is-now" : ""} />
                ))}
              </span>
              <span className="sdemo__note">
                <LockSimple weight="bold" aria-hidden="true" /> Demo only, nothing is stored
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
