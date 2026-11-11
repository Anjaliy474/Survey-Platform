import type { CSSProperties } from "react";

type Cloud = { width: number; top: string; duration: number; delay: number };

const SETS: Record<"hero" | "band" | "final", Cloud[]> = {
  hero: [
    { width: 260, top: "12%", duration: 95, delay: -20 },
    { width: 180, top: "30%", duration: 80, delay: -55 },
    { width: 320, top: "58%", duration: 110, delay: -70 },
    { width: 150, top: "5%", duration: 70, delay: -5 },
    { width: 210, top: "80%", duration: 100, delay: -38 },
  ],
  band: [
    { width: 220, top: "8%", duration: 100, delay: -30 },
    { width: 160, top: "62%", duration: 85, delay: -64 },
  ],
  final: [
    { width: 240, top: "10%", duration: 90, delay: -40 },
    { width: 170, top: "55%", duration: 75, delay: -10 },
    { width: 280, top: "78%", duration: 105, delay: -80 },
  ],
};

/** Drifting clouds for sky bands (DESIGN.md §3.7, §9). Hidden with reduced motion. */
export function Clouds({ set }: { set: keyof typeof SETS }) {
  return (
    <div className="clouds" aria-hidden="true">
      {SETS[set].map((c, i) => (
        <span
          key={i}
          className="cloud"
          style={
            {
              "--cloud-w": `${c.width}px`,
              top: c.top,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
