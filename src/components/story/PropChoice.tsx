"use client";

import type { ComponentType } from "react";
import { TextBox, useRovingKeys } from "@/components/player/mechanics";
import { toggleMulti } from "@/lib/survey/answers";
import { optionLabels } from "@/lib/survey/public";
import type { Answer, GamifierItem, Look, Question } from "@/lib/survey/types";
import type { SkinProps } from "./template-api";

/**
 * Story Mode choices: every option is the same in-world object (one prop family), with its
 * exact label as visible text under it. Only the chosen object changes. Underneath they are
 * ordinary radios or checkboxes, so keyboards and screen readers get the same control as plain.
 */
export function PropChoice({
  question,
  item,
  family,
  look,
  Skin,
  value,
  onChange,
  labelledBy,
  onLimit,
}: {
  question: Question;
  item: GamifierItem;
  family: string;
  look: Look;
  Skin: ComponentType<SkinProps>;
  value: Answer | undefined;
  onChange: (a: Answer) => void;
  labelledBy: string;
  onLimit?: (max: number) => void;
}) {
  const labels = optionLabels(question);
  const multi = item.mechanic === "tap_chips_multi";
  const single = typeof value === "number" ? value : null;
  const { refs, onKeyDown } = useRovingKeys(labels.length, single, (i) => onChange(i));

  if (item.mechanic === "text_box") {
    return (
      <div className={`prop-text prop-text--${family}`}>
        <TextBox value={typeof value === "string" ? value : ""} onChange={onChange} labelledBy={labelledBy} />
      </div>
    );
  }

  const current = Array.isArray(value) ? value : [];
  return (
    <div className="prop-wrap">
      <div
        className={`props props--${family} ${labels.length > 6 ? "props--many" : ""}`}
        role={multi ? "group" : "radiogroup"}
        aria-labelledby={labelledBy}
        onKeyDown={multi ? undefined : onKeyDown}
      >
        {labels.map((label, i) => {
          const selected = multi ? current.includes(i) : single === i;
          return (
            <button
              key={`${i}-${label}`}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={selected}
              tabIndex={multi ? 0 : selected || (single === null && i === 0) ? 0 : -1}
              className={`prop ${selected ? "is-selected" : ""}`}
              onClick={() => {
                if (!multi) return onChange(i);
                const next = toggleMulti(current, i, labels, question.maxPicks);
                if (next === "limit") onLimit?.(question.maxPicks ?? 0);
                else onChange(next);
              }}
            >
              <span className="prop__obj" aria-hidden="true">
                <Skin family={family} index={i} count={labels.length} selected={selected} look={look} />
              </span>
              <span className="prop__label">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
