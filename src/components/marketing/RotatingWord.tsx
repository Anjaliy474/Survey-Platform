"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/client-hooks";

/**
 * Rotating headline word (DESIGN.md §9): stacked in one grid cell so the line never
 * shifts, swaps every 2.4s, with a marigold highlight bar. Fixed on reduced motion.
 * Decorative: the h1 carries the static sentence for screen readers.
 */
export function RotatingWord({ words, interval = 2400 }: { words: readonly string[]; interval?: number }) {
  const reduce = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => window.clearInterval(id);
  }, [reduce, words.length, interval]);

  const current = reduce ? 0 : index;
  const leaving = (current - 1 + words.length) % words.length;

  return (
    <span className="rotor">
      {words.map((word, i) => (
        <span
          key={word}
          className={`rotor__word ${i === current ? "is-on" : ""} ${i === leaving && !reduce ? "is-out" : ""}`}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
