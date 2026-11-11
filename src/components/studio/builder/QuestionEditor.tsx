"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import type { ShapedQuestion } from "@/lib/ai/types";
import type { Question } from "@/lib/player/types";

const scale5 = (labels: string[]) => ({ points: 5, min_label: labels[0], max_label: labels[4], point_labels: labels });
export const SCALE_PRESETS: Record<string, NonNullable<Question["scale"]>> = {
  Satisfaction: scale5(["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"]),
  Agreement: scale5(["Strongly disagree", "Disagree", "Neither agree nor disagree", "Agree", "Strongly agree"]),
  Likelihood: scale5(["Very unlikely", "Unlikely", "Not sure", "Likely", "Very likely"]),
  Quality: scale5(["Very poor", "Poor", "Fair", "Good", "Very good"]),
  Clarity: scale5(["Very unclear", "Unclear", "Neither clear nor unclear", "Clear", "Very clear"]),
  Frequency: scale5(["Never", "Rarely", "Sometimes", "Often", "Always"]),
};
const NPS_SCALE = { points: 11, min_label: "Not at all likely", max_label: "Extremely likely" };

const TYPES: { value: Question["type"]; label: string }[] = [
  { value: "single_choice", label: "Single choice" },
  { value: "multi_choice", label: "Multiple choice" },
  { value: "rating_scale", label: "Rating scale (5 points)" },
  { value: "nps_0_10", label: "0–10 recommendation" },
  { value: "yes_no", label: "Yes / No" },
  { value: "number_band", label: "Bands (age, price…)" },
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Open text" },
];
const HAS_OPTIONS = ["single_choice", "multi_choice", "number_band"];
const isText = (t: string) => t === "short_text" || t === "long_text";

function presetOf(scale: Question["scale"]): string {
  const labels = scale?.point_labels?.join("|");
  return Object.entries(SCALE_PRESETS).find(([, s]) => s.point_labels?.join("|") === labels)?.[0] ?? "Satisfaction";
}

/** Inline editor for one question: wording, type, options or scale, required. */
export function QuestionEditor({
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial: Partial<ShapedQuestion>;
  submitLabel: string;
  onSave: (patch: Partial<ShapedQuestion>) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [text, setText] = useState(initial.text ?? "");
  const [type, setType] = useState<Question["type"]>(initial.type ?? "single_choice");
  const [options, setOptions] = useState((initial.options ?? []).join("\n"));
  const [preset, setPreset] = useState(presetOf(initial.scale ?? null));
  const [max, setMax] = useState(initial.max_choices ? String(initial.max_choices) : "");
  const [required, setRequired] = useState(initial.required ?? true);
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const opts = options
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (!text.trim()) return setError("Write the question first.");
    if (HAS_OPTIONS.includes(type) && opts.length < 2) return setError("Add at least two options, one per line.");
    setError("");
    onSave({
      text: text.trim(),
      type,
      options: type === "yes_no" ? ["Yes", "No"] : HAS_OPTIONS.includes(type) ? opts : [],
      scale: type === "rating_scale" ? SCALE_PRESETS[preset] : type === "nps_0_10" ? NPS_SCALE : null,
      max_choices: type === "multi_choice" && Number(max) > 0 ? Number(max) : undefined,
      required: isText(type) ? false : required,
    });
  }

  return (
    <form className="qedit" onSubmit={submit} noValidate>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-text`}>
          Question
        </label>
        <textarea id={`${id}-text`} className="textarea textarea--short" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </div>
      <div className="qedit__row">
        <div className="field">
          <label className="field__label" htmlFor={`${id}-type`}>
            Answer type
          </label>
          <select id={`${id}-type`} className="input" value={type} onChange={(e) => setType(e.target.value as Question["type"])}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {type === "rating_scale" && (
          <div className="field">
            <label className="field__label" htmlFor={`${id}-scale`}>
              Scale
            </label>
            <select id={`${id}-scale`} className="input" value={preset} onChange={(e) => setPreset(e.target.value)}>
              {Object.keys(SCALE_PRESETS).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>
        )}
        {type === "multi_choice" && (
          <div className="field">
            <label className="field__label" htmlFor={`${id}-max`}>
              Pick up to (optional)
            </label>
            <input id={`${id}-max`} className="input" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
          </div>
        )}
      </div>
      {type === "rating_scale" && <p className="field__help">{SCALE_PRESETS[preset].point_labels?.join(" · ")}</p>}
      {HAS_OPTIONS.includes(type) && (
        <div className="field">
          <label className="field__label" htmlFor={`${id}-opts`}>
            Options, one per line
          </label>
          <textarea id={`${id}-opts`} className="textarea textarea--short" value={options} onChange={(e) => setOptions(e.target.value)} />
          <p className="field__help">Include “None” or “Other” so everyone can answer truthfully.</p>
        </div>
      )}
      <label className="qedit__check">
        <input type="checkbox" checked={isText(type) ? false : required} disabled={isText(type)} onChange={(e) => setRequired(e.target.checked)} />
        {isText(type) ? "Open questions are always optional" : "Required"}
      </label>
      {error && <p className="field__error">{error}</p>}
      <div className="qedit__actions">
        <button type="submit" className="btn btn--sm btn--primary">
          {submitLabel}
        </button>
        <button type="button" className="btn btn--sm btn--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
