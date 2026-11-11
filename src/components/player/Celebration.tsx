import type { CSSProperties } from "react";

const BURST_COLORS = ["var(--ps-persimmon-400)", "var(--ps-marigold-400)", "var(--ps-viz-2)", "var(--ps-sky-accent)"];

/** One celebration burst (DESIGN.md §7.3): 26 squares, 1s, once. Deterministic layout. */
export function Burst() {
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
                "--x": `${Math.round(Math.cos(angle) * radius)}px`,
                "--y": `${Math.round(Math.sin(angle) * radius)}px`,
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

/** One bar in a results reveal, with a "You" tag on the respondent's own answer. */
export function RevealRow({ label, pct, you }: { label: string; pct: number; you: boolean }) {
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
