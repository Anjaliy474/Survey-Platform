"use client";

import { Check, X } from "@/components/icons";
import { useState } from "react";
import { isAnswered, optionsFor, scaleLabels } from "@/lib/player/rules";
import type { Answer, GamifiedItem, Question } from "@/lib/player/types";
import {
  EmojiScale,
  FACES_5,
  NumberRow11,
  SegmentedScale,
  TapChipsMulti,
  TapChipsSingle,
  TextBox,
  ThisOrThat,
  type ThisOrThatOption,
} from "./mechanics";

export const headingId = (questionId: string) => `q-${questionId}`;

const YES_NO: ThisOrThatOption[] = [
  { label: "Yes", Icon: Check, tone: "var(--ps-viz-2)" },
  { label: "No", Icon: X, tone: "var(--ps-viz-6)" },
];
const PAIR_TONES = ["var(--ps-viz-3)", "var(--ps-viz-1)"];

/** Index of a "None of these" / "Nothing new" style option, which clears the others. */
function exclusiveIndex(options: string[]): number {
  return options.findIndex((o) => /^(none|nothing)\b/i.test(o.trim()));
}

/**
 * One question: optional lead-in, the question text (exactly as approved), helper text,
 * the mechanic the gamifier chose, and the neutral feedback line.
 */
export function QuestionBlock({
  question: q,
  item,
  answer,
  onAnswer,
  number,
  leadIn,
  feedback,
  pop,
  keyHints,
  missing,
}: {
  question: Question;
  item: GamifiedItem;
  answer: Answer | undefined;
  onAnswer: (value: Answer, singlePick: boolean) => void;
  number?: number;
  leadIn?: string;
  feedback?: string;
  pop?: boolean;
  keyHints?: boolean;
  missing?: boolean;
}) {
  const [note, setNote] = useState("");
  const id = headingId(q.id);
  const options = optionsFor(q);
  const max = q.max_choices ?? options.length;
  // Numbers in helper text come from the question's own limit, worked out here.
  const helper = q.type === "multi_choice" && q.max_choices ? `Pick up to ${q.max_choices}` : item.helper_text;
  const num = typeof answer === "number" ? answer : null;

  function toggle(i: number) {
    const current = Array.isArray(answer) ? answer : [];
    const none = exclusiveIndex(options);
    let next: number[];
    if (i === none) next = current.includes(i) ? [] : [i];
    else if (current.includes(i)) next = current.filter((x) => x !== i);
    else if (current.filter((x) => x !== none).length >= max) {
      setNote(`You can pick up to ${max}. Untick one to swap.`);
      return;
    } else next = [...current.filter((x) => x !== none), i];
    setNote("");
    onAnswer(next, false);
  }

  let mechanic = null;
  let hint = "";
  switch (item.mechanic) {
    case "tap_chips_single":
      mechanic = <TapChipsSingle options={options} value={num} onChange={(i) => onAnswer(i, true)} labelledBy={id} pop={pop} />;
      if (options.length <= 9) hint = `1–${options.length}`;
      break;
    case "this_or_that":
      mechanic = (
        <ThisOrThat
          options={q.type === "yes_no" ? YES_NO.map((o, i) => ({ ...o, label: options[i] })) : options.map((label, i) => ({ label, tone: PAIR_TONES[i] }))}
          value={num}
          onChange={(i) => onAnswer(i, true)}
          labelledBy={id}
          pop={pop}
        />
      );
      break;
    case "tap_chips_multi":
      mechanic = <TapChipsMulti options={options} value={Array.isArray(answer) ? answer : []} onToggle={toggle} labelledBy={id} pop={pop} />;
      break;
    case "segmented_scale":
      mechanic = (
        <SegmentedScale
          labels={scaleLabels(q)}
          minLabel={q.scale?.min_label ?? ""}
          maxLabel={q.scale?.max_label ?? ""}
          value={num}
          onChange={(i) => onAnswer(i, true)}
          labelledBy={id}
          pop={pop}
        />
      );
      hint = `1–${q.scale?.points ?? 5}`;
      break;
    case "emoji_scale":
      mechanic = (
        <EmojiScale
          points={scaleLabels(q).map((label, i) => ({ face: FACES_5[i], label }))}
          value={num}
          onChange={(i) => onAnswer(i, true)}
          labelledBy={id}
          pop={pop}
        />
      );
      hint = "1–5";
      break;
    case "number_row_11":
      mechanic = (
        <NumberRow11
          minLabel={q.scale?.min_label ?? "0"}
          maxLabel={q.scale?.max_label ?? "10"}
          value={num}
          onChange={(i) => onAnswer(i, true)}
          labelledBy={id}
          pop={pop}
        />
      );
      hint = "0–9 or the arrow keys";
      break;
    case "text_box":
      mechanic = (
        <TextBox
          value={typeof answer === "string" ? answer : ""}
          onChange={(t) => onAnswer(t, false)}
          labelledBy={id}
          multiline={q.type === "long_text"}
          inputKind={q.input_kind}
        />
      );
      break;
  }

  const answered = isAnswered(q, answer);

  return (
    <div className={`pl-block ${missing ? "is-missing" : ""}`} data-question={q.id}>
      {leadIn && <p className="pl-lead">{leadIn}</p>}
      <h2 id={id} tabIndex={-1} className="pl-question">
        {number !== undefined && <span className="pl-question__num">{number}.</span>}
        {q.text}
        {!q.required && <span className="pl-optional"> (optional)</span>}
      </h2>
      {helper && <p className="pl-helper">{helper}</p>}
      {mechanic}
      {keyHints && hint && (
        <p className="pl-keyhint">
          Tip: press <kbd>{hint}</kbd>
        </p>
      )}
      {missing && (
        <p className="pl-missing" role="alert">
          Please answer this question to continue.
        </p>
      )}
      <p className="pl-feedback" aria-live="polite">
        {note || (answered && feedback ? feedback : "")}
      </p>
    </div>
  );
}
