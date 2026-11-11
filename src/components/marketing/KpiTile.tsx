"use client";

import type { CSSProperties } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { usePrefersReducedMotion } from "@/lib/client-hooks";
import { formatCount } from "@/lib/compute";

/**
 * KPI tile (DESIGN.md §8.2): caption label, big Computed number with a one-time
 * 800ms count-up, and a "How?" link that shows the formula.
 * The final value is rendered on the server, so it reads correctly without JS.
 */
export function KpiTile({
  label,
  value,
  suffix = "",
  sub,
  how,
  delay = 0,
}: {
  label: string;
  value: number;
  suffix?: string;
  sub: string;
  how: string;
  delay?: number;
}) {
  const reduce = usePrefersReducedMotion();
  const numberRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const howId = useId();

  useEffect(() => {
    const el = numberRef.current;
    if (!el || reduce) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // already visible: leave it
    el.textContent = `0${suffix}`;
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / 800);
          el.textContent = `${formatCount(Math.round(value * (1 - Math.pow(1 - p, 3))))}${suffix}`;
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = `${formatCount(value)}${suffix}`;
    };
  }, [value, suffix, reduce]);

  return (
    <div className="card kpi" data-reveal style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        <Badge kind="computed" />
      </div>
      <span ref={numberRef} className="kpi__num tabular">
        {`${formatCount(value)}${suffix}`}
      </span>
      <span className="kpi__sub">{sub}</span>
      <button type="button" className="btn btn--ghost kpi__how" aria-expanded={open} aria-controls={howId} onClick={() => setOpen((v) => !v)}>
        {open ? "Hide" : "How?"}
      </button>
      <p id={howId} className="kpi__formula mono" hidden={!open}>
        {how}
      </p>
    </div>
  );
}
