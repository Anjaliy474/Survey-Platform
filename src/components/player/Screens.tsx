"use client";

import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { RevealData } from "@/lib/survey/public";

/** Title card: title, purpose and consent word for word, effort, Start. */
export function TitleCard({
  title,
  purposeLine,
  consentLine,
  meta,
  startLabel,
  onStart,
  onPlain,
  logo,
  children,
}: {
  title: string;
  purposeLine: string;
  consentLine: string;
  meta: string;
  startLabel: string;
  onStart: () => void;
  onPlain?: () => void;
  logo?: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="splayer__col">
      <div className="splayer__top">{logo && (
          // The creator's logo is a small data URL, so next/image adds nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="splayer__logo" src={logo} alt="" />
        )}</div>
      <div className="splayer__center">
        {children}
        <h1 className="splayer__title">{title}</h1>
        <p className="splayer__consent">
          <LockSimple size={16} weight="bold" aria-hidden="true" />
          <span>
            {purposeLine}
            {consentLine && <> {consentLine}</>}
          </span>
        </p>
        <span className="pl-remaining">{meta}</span>
      </div>
      <div className="splayer__bar">
        <button type="button" className="pl-next" onClick={onStart} style={{ width: "100%" }}>
          {startLabel}
        </button>
        {onPlain && (
          <p style={{ textAlign: "center" }}>
            <button type="button" className="splayer__plain-link" onClick={onPlain}>
              Prefer a plain form?
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

const JOY = [
  { face: "😞", label: "Very dull" },
  { face: "🙁", label: "Dull" },
  { face: "😐", label: "Okay" },
  { face: "🙂", label: "Enjoyable" },
  { face: "😄", label: "Very enjoyable" },
];

/** Thank-you with the optional one-tap enjoyment prompt. */
export function ThankYou({
  thankYou,
  prompt,
  onEnjoyment,
  children,
}: {
  thankYou: string;
  prompt: string;
  onEnjoyment: (i: number) => void;
  children?: ReactNode;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="splayer__center" style={{ width: "100%" }}>
      <h1 className="splayer__title">{thankYou}</h1>
      <p className="splayer__text" id="joy-label">
        {prompt} <span style={{ opacity: 0.7 }}>(optional)</span>
      </p>
      <div className="pl-joy" role="radiogroup" aria-labelledby="joy-label">
        {JOY.map((j, i) => (
          <button
            key={j.label}
            type="button"
            role="radio"
            aria-checked={picked === i}
            className={`pl-option pl-joy__face ${picked === i ? "is-selected" : ""}`}
            disabled={picked !== null}
            onClick={() => {
              setPicked(i);
              onEnjoyment(i);
            }}
          >
            <b aria-hidden="true">{j.face}</b>
            {j.label}
          </button>
        ))}
      </div>
      <p className="pl-feedback" aria-live="polite">
        {picked !== null ? "Got it, thanks." : ""}
      </p>
      {children}
      <p className="splayer__made">
        Made with <Link href="/">PlaySurvey</Link>
      </p>
    </div>
  );
}

/** Aggregate reveal (20+ responses), or the teaser below that. */
export function Reveal({ data, teaser }: { data: RevealData | null; teaser: string }) {
  if (!data || data.questions.length === 0) {
    return <p className="splayer__milestone">{teaser}</p>;
  }
  return (
    <section className="reveal-card" aria-label="How others answered">
      <p style={{ fontWeight: 700 }}>{data.introCopy}</p>
      {data.questions.map((q) => (
        <div key={q.questionId} style={{ display: "grid", gap: 6 }}>
          <h3>{q.text}</h3>
          {q.options.map((o) => (
            <div key={o.label} className="reveal-bar">
              <span>
                {o.label}
                {o.you && <span className="you-tag">You</span>}
              </span>
              <span className="reveal-bar__track" aria-hidden="true">
                <i style={{ width: `${o.pct}%` }} />
              </span>
              <span className="reveal-bar__val">{o.pct}%</span>
            </div>
          ))}
          {q.multi && <p className="splayer__made">People could pick several, so these don’t add up to 100%.</p>}
        </div>
      ))}
    </section>
  );
}

/** Shown when the answers haven't reached the server yet. They stay saved on the device. */
export function SendRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="player-offline" role="alert" style={{ display: "grid", gap: 8, width: "100%" }}>
      <span>We couldn&apos;t send your answers yet. They&apos;re saved on this device.</span>
      <button type="button" className="pl-next" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function StateScreen({ title, body }: { title: string; body: string }) {
  return (
    <main className="player-state theme-marigold">
      <div>
        <h1 className="splayer__title">{title}</h1>
        <p className="splayer__text">{body}</p>
        <Link className="splayer__made" href="/">
          PlaySurvey
        </Link>
      </div>
    </main>
  );
}
