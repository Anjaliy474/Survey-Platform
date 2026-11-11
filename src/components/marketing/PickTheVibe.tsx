"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmojiScale, ProgressBar, RemainingPill } from "@/components/player/mechanics";
import { estimateSeconds, formatAbout } from "@/lib/compute";

/**
 * M1 §4 "Pick the vibe": style buttons, a phone preview, the playful dial and theme
 * swatches (DESIGN.md §6.9). Every click re-renders the *same* question: wording,
 * options and scale never change, only how they are shown.
 */

type Style = "one" | "chat" | "pages" | "classic";
type Level = "off" | "light" | "medium";
type Theme = "marigold" | "lagoon" | "night";

const STYLES: { id: Style; label: string; note: string }[] = [
  { id: "one", label: "One per screen", note: "One question at a time" },
  { id: "chat", label: "Chat", note: "Feels like messaging" },
  { id: "pages", label: "Pages", note: "2–4 related questions" },
  { id: "classic", label: "Classic", note: "A plain, tidy form" },
];
const LEVELS: { id: Level; label: string; help: string }[] = [
  { id: "off", label: "Off", help: "Neutral and professional." },
  { id: "light", label: "Light", help: "Friendly lead-ins and milestones." },
  { id: "medium", label: "Medium", help: "Warm, with a neutral “Got it.” after each answer." },
];
const THEMES: { id: Theme; label: string }[] = [
  { id: "marigold", label: "Marigold" },
  { id: "lagoon", label: "Lagoon" },
  { id: "night", label: "Night" },
];

const FACES = [
  { face: "😞", label: "Very unhappy" },
  { face: "🙁", label: "Unhappy" },
  { face: "😐", label: "Neutral" },
  { face: "🙂", label: "Happy" },
  { face: "😄", label: "Very happy" },
] as const;
const QUESTION = "How satisfied were you with the food at the fest?";
const STALLS = ["Chaat", "Momos", "Juice", "Other", "None"];
// The preview shows question 3 of a 6-question survey; time left is worked out in code.
const REMAINING = [{ open: false }, { open: false }, { open: false }, { open: false }];

export function PickTheVibe() {
  const [style, setStyle] = useState<Style>("one");
  const [level, setLevel] = useState<Level>("light");
  const [theme, setTheme] = useState<Theme>("marigold");
  const [answer, setAnswer] = useState<number | null>(null);
  const qId = useId();
  const timeLeft = formatAbout(estimateSeconds(REMAINING));
  const playful = level !== "off" && style !== "classic";
  const feedback = level === "medium" && style !== "classic" && answer !== null ? "Got it." : "";

  return (
    <section className="band vibe" id="vibe" aria-labelledby="vibe-title">
      <div className="wrap">
        <div className="section-head section-head--center" data-reveal>
          <span className="eyebrow">Pick the vibe</span>
          <h2 id="vibe-title" className="section-head__title">
            Same questions. Your style.
          </h2>
          <p className="section-head__intro">Change the look. The question never changes.</p>
        </div>

        <div className="vibe__grid">
          <div className="vibe__ctrl" data-reveal>
            <h3 className="vibe__label" id="style-label">
              Style
            </h3>
            <div className="style-picker" role="group" aria-labelledby="style-label">
              {STYLES.map((s) => (
                <button key={s.id} type="button" aria-pressed={style === s.id} onClick={() => setStyle(s.id)}>
                  <span className="style-picker__name">
                    {s.label}
                    {s.id === "one" && <Badge kind="ai">Suggested</Badge>}
                  </span>
                  <small>{s.note}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="phone" data-reveal>
            <div className={`phone__screen theme-${theme}`} aria-label="Phone preview of the survey" role="region">
              <div key={`${style}-${level}-${theme}`} className="phone__content">
                {style !== "classic" && style !== "chat" && (
                  <>
                    <ProgressBar value={2 / 6} />
                    {style === "one" ? (
                      <RemainingPill>
                        {REMAINING.length} left · {timeLeft}
                      </RemainingPill>
                    ) : (
                      <span className="phone__page">Page 1 of 2 · Food and stalls</span>
                    )}
                    {playful && <p className="pl-lead">Quick one about the food.</p>}
                    <p className="pl-question phone__q" id={qId}>
                      {QUESTION}
                    </p>
                    <EmojiScale points={FACES} value={answer} onChange={setAnswer} labelledBy={qId} size="compact" pop={level === "medium"} />
                    <p className="pl-feedback" aria-live="polite">
                      {feedback}
                    </p>
                    {style === "pages" && (
                      <>
                        <p className="pl-question phone__q phone__q--small">Which stall did you visit most?</p>
                        <div className="phone__chips" aria-hidden="true">
                          {STALLS.map((s) => (
                            <span key={s}>{s}</span>
                          ))}
                        </div>
                      </>
                    )}
                    {style === "one" && playful && <p className="phone__milestone">Halfway there, {timeLeft} to go.</p>}
                    <span className="pl-next phone__next" aria-hidden="true">
                      {style === "pages" ? "Next page" : "Next"}
                    </span>
                  </>
                )}

                {style === "chat" && (
                  <>
                    <ProgressBar value={2 / 6} />
                    {playful && <p className="bubble">Quick one about the food.</p>}
                    <p className="bubble bubble--q" id={qId}>
                      {QUESTION}
                    </p>
                    <div className="replies" role="radiogroup" aria-labelledby={qId}>
                      {FACES.map((f, i) => (
                        <button key={f.label} type="button" role="radio" aria-checked={answer === i} onClick={() => setAnswer(i)}>
                          {f.face} {f.label}
                        </button>
                      ))}
                    </div>
                    <p className="pl-feedback" aria-live="polite">
                      {feedback}
                    </p>
                    <p className="bubble bubble--typing" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </p>
                  </>
                )}

                {style === "classic" && (
                  <>
                    <span className="phone__page">Fest feedback</span>
                    <fieldset className="classic-q">
                      <legend>1. {QUESTION}</legend>
                      {FACES.map((f, i) => (
                        <label key={f.label}>
                          <input type="radio" name={`${qId}-classic`} checked={answer === i} onChange={() => setAnswer(i)} />
                          {f.label}
                        </label>
                      ))}
                    </fieldset>
                    <fieldset className="classic-q" disabled>
                      <legend>2. Which stall did you visit most?</legend>
                      {STALLS.slice(0, 3).map((s) => (
                        <label key={s}>
                          <input type="radio" name={`${qId}-stall`} />
                          {s}
                        </label>
                      ))}
                    </fieldset>
                    <span className="pl-next phone__next" aria-hidden="true">
                      Submit
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="vibe__ctrl" data-reveal>
            <h3 className="vibe__label" id="level-label">
              Playful level
            </h3>
            <div className="dial" role="group" aria-labelledby="level-label">
              {LEVELS.map((l) => (
                <button key={l.id} type="button" aria-pressed={level === l.id} onClick={() => setLevel(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
            <p className="vibe__help" aria-live="polite">
              {LEVELS.find((l) => l.id === level)?.help}
            </p>

            <h3 className="vibe__label" id="theme-label">
              Theme
            </h3>
            <div className="swatches" role="group" aria-labelledby="theme-label">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`swatch theme-${t.id}`}
                  aria-pressed={theme === t.id}
                  aria-label={t.label}
                  onClick={() => setTheme(t.id)}
                />
              ))}
            </div>
            <p className="vibe__help">No points, prizes or timers. They bend answers.</p>
          </div>
        </div>

        <p className="vibe__try" data-reveal>
          Want the whole thing? Try a sample survey: <Link href="/s/cafe-feedback">café feedback (chat style)</Link> or{" "}
          <Link href="/s/volunteer-feedback">volunteer feedback (one per screen)</Link>.
        </p>
      </div>
    </section>
  );
}
