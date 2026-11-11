"use client";

import { useId } from "react";

export const TIME_OPTIONS: { value: number | null; label: string }[] = [
  { value: 60, label: "1 min" },
  { value: 120, label: "2 min" },
  { value: 180, label: "3 min" },
  { value: null, label: "No limit" },
];

/** Single-choice chips (a group of toggle buttons, one pressed at a time). */
export function ChoiceChips<T extends string | number | null>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <span className="field__label" id={id}>
        {label}
      </span>
      <div className="chips" role="group" aria-labelledby={id}>
        {options.map((o) => (
          <button key={o.label} type="button" className="chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Segmented control (DESIGN.md §5.5): a sand track, the active segment white. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <span className="field__label" id={id}>
        {label}
      </span>
      <div className="segmented" role="group" aria-labelledby={id}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Switch({ label, help, checked, onChange }: { label: string; help?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="field field--switch">
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={id} className="switch" onClick={() => onChange(!checked)}>
        <i aria-hidden="true" />
      </button>
      <div>
        <span className="field__label" id={id}>
          {label}
        </span>
        {help && <p className="field__help">{help}</p>}
      </div>
    </div>
  );
}
