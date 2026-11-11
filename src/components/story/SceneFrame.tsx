"use client";

import type { ReactNode } from "react";
import type { Mood } from "@/lib/survey/types";

/**
 * Full-bleed scene behind the story column. Children of `art` are SVG drawn in a
 * 400×700 portrait box that covers any screen; `children` is the HUD and question card.
 */
export function SceneFrame({
  sceneKey,
  art,
  mood,
  reduced,
  top,
  children,
}: {
  sceneKey: string;
  art: ReactNode;
  mood: Mood;
  reduced: boolean;
  top?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="story__scene" aria-hidden="true">
        <svg key={sceneKey} className="scene-enter" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--st-sky-top)" />
              <stop offset="1" stopColor="var(--st-sky-bottom)" />
            </linearGradient>
            <radialGradient id="gloss" cx="0.3" cy="0.2" r="0.6">
              <stop offset="0" stopColor="var(--story-white)" stopOpacity="0.9" />
              <stop offset="1" stopColor="var(--story-white)" stopOpacity="0" />
            </radialGradient>
            <filter id="grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
          <rect width="400" height="700" fill="url(#sky)" />
          {art}
          {!reduced && <Ambient mood={mood} />}
          <rect className="grain" width="400" height="700" filter="url(#grain)" />
        </svg>
      </div>
      <div className="story__frame">
        <div className="story__top">{top}</div>
        <div />
        <div className="story__body">{children}</div>
      </div>
    </>
  );
}

/** One ambient effect per mood, drawn the same in every template. */
export function Ambient({ mood }: { mood: Mood }) {
  const dots = (n: number, seed: number) =>
    Array.from({ length: n }, (_, i) => ({ x: (i * 97 + seed * 31) % 400, y: (i * 53 + seed * 17) % 320, d: (i % 5) * 0.6 }));
  switch (mood) {
    case "festive":
      return (
        <g>
          <path d="M-10 70 Q 100 120 200 80 T 410 90" fill="none" stroke="var(--st-glow)" strokeOpacity="0.5" strokeWidth="1.5" />
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} className="twinkle" style={{ animationDelay: `${i * 0.27}s` }} cx={i * 36 + 6} cy={70 + Math.sin(i / 1.7) * 24 + 20} r="4" fill={i % 2 ? "var(--st-accent)" : "var(--st-detail)"} />
          ))}
        </g>
      );
    case "space":
    case "retro":
      return (
        <g>
          {dots(34, 3).map((s, i) => (
            <circle key={i} className="twinkle" style={{ animationDelay: `${s.d}s` }} cx={s.x} cy={s.y} r={i % 4 ? 1.2 : 2} fill="var(--st-glow)" />
          ))}
        </g>
      );
    case "nature":
      return (
        <g>
          {dots(14, 7).map((s, i) => (
            <circle key={i} className="twinkle" style={{ animationDelay: `${s.d}s` }} cx={s.x} cy={260 + (s.y % 180)} r="2.2" fill="var(--st-detail)" />
          ))}
        </g>
      );
    case "adventure":
      return (
        <g className="drift">
          <path d="M60 110 q 10 -10 20 0 q 10 -10 20 0" fill="none" stroke="var(--st-near)" strokeWidth="2" />
          <path d="M250 70 q 8 -8 16 0 q 8 -8 16 0" fill="none" stroke="var(--st-near)" strokeWidth="2" />
        </g>
      );
    case "everyday_india":
      return (
        <g className="drift">
          <path d="M300 60 l 22 22 l -22 22 l -22 -22 z" fill="var(--st-detail)" />
          <path d="M300 104 q 10 40 -20 90" fill="none" stroke="var(--st-near)" strokeWidth="1.2" />
        </g>
      );
    case "cosy":
    default:
      return (
        <g>
          {dots(10, 5).map((s, i) => (
            <circle key={i} className="drift" style={{ animationDelay: `${-s.d * 3}s` }} cx={s.x} cy={s.y + 80} r="3" fill="var(--st-glow)" opacity="0.6" />
          ))}
        </g>
      );
  }
}
