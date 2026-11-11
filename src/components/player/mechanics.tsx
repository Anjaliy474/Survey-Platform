"use client";

/**
 * Survey Player mechanics (DESIGN.md §7.2). The Player may only use these seven:
 * tap_chips_single, tap_chips_multi, this_or_that, segmented_scale, emoji_scale,
 * number_row_11, text_box. Wording, options and scale points are rendered exactly as
 * given; a mechanic changes how a question looks, never what it measures.
 */
import { Check } from "@/components/icons";
import type { ComponentType, KeyboardEvent, ReactNode } from "react";
import { useRef } from "react";

type Size = "regular" | "compact";
type IconProps = { size?: number; weight?: "duotone" | "bold" | "regular" | "fill"; "aria-hidden"?: boolean | "true" };

/** Five labelled faces for emoji_scale (satisfaction or feelings questions only). */
export const FACES_5 = ["😞", "🙁", "😐", "🙂", "😄"] as const;

/**
 * Arrow-key movement inside a radio group (roving focus), plus number keys:
 * `digitBase` 1 means key "1" picks the first option; 0 means key "0" picks the first (0–10 row).
 */
function useRovingKeys(count: number, value: number | null, onChange: (i: number) => void, digitBase = 1) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKeyDown(e: KeyboardEvent) {
    const current = value ?? -1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (current + 1 + count) % count;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = current <= 0 ? count - 1 : current - 1;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = count - 1;
    if (/^[0-9]$/.test(e.key)) {
      const i = Number(e.key) - digitBase;
      if (i >= 0 && i < count) next = i;
    }
    if (next === null) return;
    e.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  }
  const setRef = (i: number) => (el: HTMLButtonElement | null) => {
    refs.current[i] = el;
  };
  const tabIndex = (i: number) => (value === i || (value === null && i === 0) ? 0 : -1);
  return { setRef, onKeyDown, tabIndex };
}

const selectedClass = (selected: boolean, pop?: boolean) => `${selected ? "is-selected" : ""} ${selected && pop ? "is-pop" : ""}`;

/* ---------------- tap_chips_single ---------------- */

export function TapChipsSingle({
  options,
  value,
  onChange,
  labelledBy,
  pop,
}: {
  options: readonly string[];
  value: number | null;
  onChange: (i: number) => void;
  labelledBy: string;
  pop?: boolean;
}) {
  const { setRef, onKeyDown, tabIndex } = useRovingKeys(options.length, value, onChange);
  // Long labels read better as full-width 56px tiles (DESIGN.md §7.2).
  const tiles = options.some((o) => o.length > 22);
  return (
    <div className={tiles ? "pl-tiles" : "pl-chips"} role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {options.map((label, i) => (
        <button
          key={label}
          ref={setRef(i)}
          type="button"
          role="radio"
          aria-checked={value === i}
          tabIndex={tabIndex(i)}
          className={`pl-option ${tiles ? "pl-tile" : "pl-chip"} ${selectedClass(value === i, pop)}`}
          onClick={() => onChange(i)}
        >
          {!tiles && <ChipTick />}
          {label}
          {tiles && <ChipTick />}
        </button>
      ))}
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
  const tiles = options.some((o) => o.length > 22);
  return (
    <div className={tiles ? "pl-tiles" : "pl-chips"} role="group" aria-labelledby={labelledBy}>
      {options.map((label, i) => {
        const selected = value.includes(i);
        return (
          <button
            key={label}
            type="button"
            role="checkbox"
            aria-checked={selected}
            className={`pl-option ${tiles ? "pl-tile" : "pl-chip"} ${selectedClass(selected, pop)}`}
            onClick={() => onToggle(i)}
          >
            {!tiles && <ChipTick />}
            {label}
            {tiles && <ChipTick />}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- this_or_that ---------------- */

export type ThisOrThatOption = {
  label: string;
  Icon?: ComponentType<IconProps>;
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
  const { setRef, onKeyDown, tabIndex } = useRovingKeys(options.length, value, onChange);
  return (
    <div className="pl-tot" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {options.map(({ label, Icon, tone }, i) => (
        <button
          key={label}
          ref={setRef(i)}
          type="button"
          role="radio"
          aria-checked={value === i}
          tabIndex={tabIndex(i)}
          className={`pl-option pl-tot__option ${selectedClass(value === i, pop)}`}
          onClick={() => onChange(i)}
        >
          <span className="pl-tot__icon" style={{ backgroundColor: tone }} aria-hidden="true">
            {Icon ? <Icon size={28} weight="duotone" aria-hidden="true" /> : <b>{label.charAt(0)}</b>}
          </span>
          {label}
          <span className="pl-option__tick" aria-hidden="true">
            <Check size={12} weight="bold" />
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- segmented_scale ---------------- */

export function SegmentedScale({
  labels,
  minLabel,
  maxLabel,
  value,
  onChange,
  labelledBy,
  pop,
}: {
  labels: readonly string[];
  minLabel: string;
  maxLabel: string;
  value: number | null;
  onChange: (i: number) => void;
  labelledBy: string;
  pop?: boolean;
}) {
  const { setRef, onKeyDown, tabIndex } = useRovingKeys(labels.length, value, onChange);
  const numbered = labels.every((l) => /^\d+$/.test(l));
  const n = labels.length;
  return (
    <div className="pl-seg-wrap">
      <div
        className="pl-seg"
        role="radiogroup"
        aria-labelledby={labelledBy}
        onKeyDown={onKeyDown}
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {labels.map((label, i) => (
          <button
            key={label}
            ref={setRef(i)}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={numbered ? `${label}${i === 0 ? `, ${minLabel}` : i === n - 1 ? `, ${maxLabel}` : ""}` : label}
            tabIndex={tabIndex(i)}
            className={`pl-seg__opt ${selectedClass(value === i, pop)}`}
            onClick={() => onChange(i)}
          >
            {label}
          </button>
        ))}
      </div>
      {numbered && (
        <div className="pl-ends" aria-hidden="true">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
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
  const { setRef, onKeyDown, tabIndex } = useRovingKeys(points.length, value, onChange);
  return (
    <div
      className={`pl-scale ${size === "compact" ? "pl-scale--compact" : ""}`}
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
    >
      {points.map((p, i) => (
        <button
          key={p.label}
          ref={setRef(i)}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={p.label}
          tabIndex={tabIndex(i)}
          className={`pl-option pl-scale__option ${selectedClass(value === i, pop)}`}
          onClick={() => onChange(i)}
        >
          <span className="pl-scale__face" aria-hidden="true">
            {p.face}
          </span>
          <span aria-hidden="true">{p.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- number_row_11 (0 to 10 recommendation) ---------------- */

export function NumberRow11({
  minLabel,
  maxLabel,
  value,
  onChange,
  labelledBy,
  pop,
}: {
  minLabel: string;
  maxLabel: string;
  value: number | null;
  onChange: (i: number) => void;
  labelledBy: string;
  pop?: boolean;
}) {
  const { setRef, onKeyDown, tabIndex } = useRovingKeys(11, value, onChange, 0);
  return (
    <div className="pl-nps-wrap">
      <div className="pl-nps" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            ref={setRef(n)}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={n === 0 ? `0, ${minLabel}` : n === 10 ? `10, ${maxLabel}` : String(n)}
            tabIndex={tabIndex(n)}
            className={`pl-option pl-nps__opt ${selectedClass(value === n, pop)}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="pl-ends" aria-hidden="true">
        <span>0 = {minLabel}</span>
        <span>10 = {maxLabel}</span>
      </div>
    </div>
  );
}

/* ---------------- text_box (always optional) ---------------- */

export function TextBox({
  value,
  onChange,
  labelledBy,
  multiline,
  inputKind = "text",
  maxLength = 500,
}: {
  value: string;
  onChange: (text: string) => void;
  labelledBy: string;
  multiline: boolean;
  inputKind?: "text" | "email";
  maxLength?: number;
}) {
  const near = value.length >= maxLength * 0.9;
  return (
    <div className="pl-textwrap">
      {multiline ? (
        <textarea
          className="pl-text"
          aria-labelledby={labelledBy}
          rows={4}
          maxLength={maxLength}
          value={value}
          placeholder="Type your answer (optional)"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="pl-text pl-text--single"
          aria-labelledby={labelledBy}
          type={inputKind === "email" ? "email" : "text"}
          inputMode={inputKind === "email" ? "email" : "text"}
          autoComplete={inputKind === "email" ? "email" : "off"}
          maxLength={maxLength}
          value={value}
          placeholder={inputKind === "email" ? "name@example.com (optional)" : "Type your answer (optional)"}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {multiline && (
        <span className={`pl-count ${near ? "is-near" : ""}`} aria-live={near ? "polite" : "off"}>
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}

/* ---------------- shared bits ---------------- */

function ChipTick() {
  return (
    <span className="pl-chip__tick" aria-hidden="true">
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
