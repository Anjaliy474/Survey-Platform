"use client";

import { Circle, Square } from "@phosphor-icons/react/dist/ssr";
import { toggleMulti } from "@/lib/survey/answers";
import { optionLabels } from "@/lib/survey/public";
import type { Answer, GamifierItem, QuestionCore } from "@/lib/survey/types";
import { EmojiScale, NumberRow11, SegmentedScale, TapChipsMulti, TapChipsSingle, TextBox, ThisOrThat } from "./mechanics";

const FACES = ["😞", "🙁", "😐", "🙂", "😄"];
const TOT_ICONS = [
  { Icon: Circle, tone: "var(--ps-viz-1)" },
  { Icon: Square, tone: "var(--ps-viz-2)" },
];

/** Renders the plain Player control for a question's gamifier mechanic. */
export function Mechanic({
  question,
  item,
  value,
  onChange,
  labelledBy,
  pop,
  onLimit,
}: {
  question: QuestionCore;
  item: GamifierItem;
  value: Answer | undefined;
  onChange: (a: Answer) => void;
  labelledBy: string;
  pop?: boolean;
  onLimit?: (max: number) => void;
}) {
  const labels = optionLabels(question);
  const index = typeof value === "number" ? value : null;
  switch (item.mechanic) {
    case "this_or_that":
      return (
        <ThisOrThat
          options={labels.map((label, i) => ({ label, ...TOT_ICONS[i % 2] }))}
          value={index}
          onChange={onChange}
          labelledBy={labelledBy}
          pop={pop}
        />
      );
    case "emoji_scale":
      if (labels.length === 5) {
        return (
          <EmojiScale
            points={labels.map((label, i) => ({ face: FACES[i], label }))}
            value={index}
            onChange={onChange}
            labelledBy={labelledBy}
            pop={pop}
          />
        );
      }
      return (
        <SegmentedScale
          labels={labels}
          minLabel={question.scale?.min_label ?? ""}
          maxLabel={question.scale?.max_label ?? ""}
          value={index}
          onChange={onChange}
          labelledBy={labelledBy}
          pop={pop}
        />
      );
    case "segmented_scale":
      return (
        <SegmentedScale
          labels={labels}
          minLabel={question.scale?.min_label ?? ""}
          maxLabel={question.scale?.max_label ?? ""}
          value={index}
          onChange={onChange}
          labelledBy={labelledBy}
          pop={pop}
        />
      );
    case "number_row_11":
      return (
        <NumberRow11
          minLabel={question.scale?.min_label ?? "Not at all likely"}
          maxLabel={question.scale?.max_label ?? "Extremely likely"}
          value={index}
          onChange={onChange}
          labelledBy={labelledBy}
          pop={pop}
        />
      );
    case "tap_chips_multi": {
      const current = Array.isArray(value) ? value : [];
      return (
        <TapChipsMulti
          options={labels}
          value={current}
          onToggle={(i) => {
            const next = toggleMulti(current, i, labels, question.maxPicks);
            if (next === "limit") onLimit?.(question.maxPicks ?? 0);
            else onChange(next);
          }}
          labelledBy={labelledBy}
          pop={pop}
        />
      );
    }
    case "text_box":
      return <TextBox value={typeof value === "string" ? value : ""} onChange={onChange} labelledBy={labelledBy} />;
    case "tap_chips_single":
    default:
      return <TapChipsSingle options={labels} value={index} onChange={onChange} labelledBy={labelledBy} pop={pop} />;
  }
}

export { hasAnswer } from "@/lib/survey/answers";
