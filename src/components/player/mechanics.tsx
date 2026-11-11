"use client";

/**
 * Survey Player mechanics (DESIGN.md §7.2). The Player may only use these seven:
 * tap_chips_single, tap_chips_multi, this_or_that, segmented_scale, emoji_scale,
 * number_row_11, text_box. This file holds the three the landing poll needs; the
 * Player step adds the rest. Wording, options and scale points are rendered exactly
 * as given, never changed.
 */
import { Check } from "@phosphor-icons/react/dist/ssr";
import type { ComponentType, KeyboardEvent, ReactNode } from "react";
import { useRef } from "react";

type Size = "regular" | "compact";

/** Arrow-key movement inside a radio group (roving focus). */
function useRovingKeys(count: number, value: number | null, onChange: (i: number) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(e: KeyboardEvent) {
    const current = value ?? -1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1 + count) % count;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = current <= 0 ? count - 1 : current - 1;
    if (/^[1-9]$/.test(e.key) && Number(e.key) <= count) next = Number(e.key) - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  }
  return { refs, onKeyDown };
}

/* ---------------- this_or_that ---------------- */

export type ThisOrThatOption = {
  label: string;
  Icon: ComponentType<{ size?: number; weight?: "duotone" | "bold" | "regular"; "aria-hidden"?: boolean | "true" }>;
  tone: string; // a token, e.g. var(--ps-viz-1)
};

export function ThisOrThat({
  options,
  value,
  onChange,
  labelledBy,
  pop,
}: {
  options: readonly ThisOrThatOption[];
  value: number | null;
  onChange: (i: number) => void;
  labelledBy: string;
  pop?: boolean;
}) {
  const { refs, onKeyDown } = useRovingKeys(options.length, value, onChange);
  return (
    <div className="pl-tot" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {options.map(({ label, Icon, tone }, i) => {
        const selected = value === i;
        return (
          <button
            key={label}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (value === null && i === 0) ? 0 : -1}
            className={`pl-option pl-tot__option ${selected ? "is-selected" : ""} ${selected && pop ? "is-pop" : ""}`}
            onClick={() => onChange(i)}
          >
            <span className="pl-tot__icon" style={{ backgroundColor: tone }}>
              <Icon size={28} weight="duotone" aria-hidden="true" />
            </span>
            {label}
            <SelectedTick />
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- emoji_scale (satisfaction or feelings only) ---------------- */

export function EmojiScale({
  points,
  value,
  onChange,
  labelledBy,
  pop,
  size = "regular",
}: {
  points: readonly { face: string; label: string }[];
  value: number | null;
  onChange: (i: number) => void;
  labelledBy: string;
  pop?: boolean;
  size?: Size;
}) {
  const { refs, onKeyDown } = useRovingKeys(points.length, value, onChange);
  return (
    <div
      className={`pl-scale ${size === "compact" ? "pl-scale--compact" : ""}`}
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
    >
      {points.map((p, i) => {
        const selected = value === i;
        return (
          <button
            key={p.label}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={p.label}
            tabIndex={selected || (value === null && i === 0) ? 0 : -1}
            className={`pl-option pl-scale__option ${selected ? "is-selected" : ""} ${selected && pop ? "is-pop" : ""}`}
            onClick={() => onChange(i)}
          >
            <span className="pl-scale__face" aria-hidden="true">
              {p.face}
            </span>
            <span aria-hidden="true">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- tap_chips_multi ---------------- */

export function TapChipsMulti({
  options,
  value,
  onToggle,
  labelledBy,
  pop,
}: {
  options: readonly string[];
  value: readonly number[];
  onToggle: (i: number) => void;
  labelledBy: string;
  pop?: boolean;
}) {
  return (
    <div className="pl-chips" role="group" aria-labelledby={labelledBy}>
      {options.map((label, i) => {
        const selected = value.includes(i);
        return (
          <button
            key={label}
            type="button"
            role="checkbox"
            aria-checked={selected}
            className={`pl-option pl-chip ${selected ? "is-selected" : ""} ${selected && pop ? "is-pop" : ""}`}
            onClick={() => onToggle(i)}
          >
            <span className="pl-chip__tick" aria-hidden="true">
              <Check size={12} weight="bold" />
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- shared bits ---------------- */

function SelectedTick() {
  return (
    <span className="pl-option__tick" aria-hidden="true">
      <Check size={12} weight="bold" />
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="pl-progress" aria-hidden="true">
      <i style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

export function RemainingPill({ children }: { children: ReactNode }) {
  return <span className="pl-remaining">{children}</span>;
}
