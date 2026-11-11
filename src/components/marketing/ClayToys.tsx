"use client";

import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useFinePointer, usePrefersReducedMotion } from "@/lib/client-hooks";

/**
 * Floating clay survey pieces (DESIGN.md §4, §9). Glossy pastel objects built from
 * HTML/CSS/SVG, no mascot. On a mouse they can be flung around and spring back, and they
 * drift with the cursor; four of them can be tapped: stars fill, the smiley changes,
 * the checkbox ticks and the bars regrow.
 */

type ToyProps = {
  name: string;
  depth: number;
  float: number;
  delay: number;
  rotate: number;
  mobile?: boolean;
  children: ReactNode;
};

function Toy({ name, depth, float, delay, rotate, mobile = false, children }: ToyProps) {
  const fine = useFinePointer();
  const reduce = usePrefersReducedMotion();
  const dragged = useRef(false);
  const canDrag = fine && !reduce;

  return (
    <div
      className={`toy toy--${name} ${mobile ? "" : "toy--desktop"}`}
      style={{ "--depth": depth } as CSSProperties}
    >
      <motion.div
        className="toy__drag"
        drag={canDrag}
        dragSnapToOrigin
        dragElastic={0.6}
        dragTransition={{ bounceStiffness: 260, bounceDamping: 12 }}
        whileHover={canDrag ? { scale: 1.07 } : undefined}
        whileDrag={{ scale: 1.12, rotate: -8, cursor: "grabbing" }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={() => {
          window.setTimeout(() => {
            dragged.current = false;
          }, 0);
        }}
        // A drag ends with a click on the same element; swallow that one click.
        onClickCapture={(e) => {
          if (!dragged.current) return;
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <div
          className="toy__float"
          style={
            {
              "--float-dur": `${float}s`,
              "--float-delay": `${-delay}s`,
              "--rot": `${rotate}deg`,
            } as CSSProperties
          }
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function StarsToy() {
  const [filled, setFilled] = useState(3);
  return (
    <button
      type="button"
      className="clay toy-stars"
      aria-label={`Star rating toy, ${filled} of 5 stars. Tap to fill.`}
      onClick={() => setFilled((f) => (f >= 5 ? 0 : f + 1))}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} className={i < filled ? "is-on" : ""} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />
        </svg>
      ))}
    </button>
  );
}

const MOUTHS = [
  { d: "M17 34 Q28 45 39 34", label: "happy" },
  { d: "M18 37 L38 37", label: "neutral" },
  { d: "M17 40 Q28 30 39 40", label: "unhappy" },
  { d: "M16 32 Q28 50 40 32", label: "delighted" },
];

function FaceToy() {
  const [m, setM] = useState(0);
  return (
    <button
      type="button"
      className="clay toy-face"
      aria-label={`Smiley toy, looking ${MOUTHS[m].label}. Tap to change the face.`}
      onClick={() => setM((v) => (v + 1) % MOUTHS.length)}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="19" cy="22" r="4" />
        <circle cx="37" cy="22" r="4" />
        <path d={MOUTHS[m].d} />
      </svg>
    </button>
  );
}

function CheckToy() {
  const [on, setOn] = useState(true);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      className={`clay toy-check ${on ? "" : "is-off"}`}
      aria-label="Checkbox toy"
      onClick={() => setOn((v) => !v)}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M9 21 L17 29 L31 12" />
      </svg>
    </button>
  );
}

const BAR_SETS = [
  [45, 80, 60, 30],
  [70, 40, 85, 55],
  [35, 65, 50, 90],
];

function BarsToy() {
  const [round, setRound] = useState(0);
  const heights = BAR_SETS[round % BAR_SETS.length];
  return (
    <button
      type="button"
      className="clay toy-bars"
      aria-label="Bar chart toy. Tap to regrow the bars."
      onClick={() => setRound((r) => r + 1)}
    >
      {heights.map((h, i) => (
        <i key={`${round}-${i}`} style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
      ))}
    </button>
  );
}

export function ClayToys() {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduce = usePrefersReducedMotion();

  // Cursor parallax (fine pointers only): one CSS variable pair, updated once per frame.
  useEffect(() => {
    const layer = ref.current;
    const hero = layer?.closest("section");
    if (!layer || !hero || !fine || reduce) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        layer.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        layer.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    };
    hero.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", onMove);
    };
  }, [fine, reduce]);

  return (
    <div ref={ref} className="toys" role="group" aria-label="Playful survey pieces you can tap">
      <Toy name="stars" depth={0.05} float={9} delay={0} rotate={-6} mobile>
        <StarsToy />
      </Toy>
      <Toy name="face" depth={0.04} float={11} delay={3} rotate={8} mobile>
        <FaceToy />
      </Toy>
      <Toy name="pair" depth={0.06} float={12} delay={6} rotate={0}>
        <div className="toy-pair" aria-hidden="true">
          <span className="clay">A</span>
          <span className="clay">B</span>
        </div>
      </Toy>
      <Toy name="check" depth={0.03} float={10} delay={2} rotate={-8} mobile>
        <CheckToy />
      </Toy>
      <Toy name="nps" depth={0.05} float={13} delay={8} rotate={4}>
        <div className="clay toy-nps" aria-hidden="true">
          {Array.from({ length: 11 }, (_, n) => (
            <span key={n} className={n === 9 ? "is-hi" : ""}>
              {n}
            </span>
          ))}
        </div>
      </Toy>
      <Toy name="bars" depth={0.04} float={9.5} delay={4} rotate={6} mobile>
        <BarsToy />
      </Toy>
      <Toy name="quote" depth={0.07} float={8} delay={1} rotate={-4}>
        <div className="clay toy-quote" aria-hidden="true">
          “ ”
        </div>
      </Toy>
      <Toy name="progress" depth={0.03} float={14} delay={9} rotate={5}>
        <div className="clay toy-progress" aria-hidden="true">
          <i />
        </div>
      </Toy>
    </div>
  );
}
