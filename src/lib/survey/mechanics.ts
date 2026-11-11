import type { Mechanic, Question } from "./types";

/** emoji_scale is only for satisfaction or feelings, never agreement, likelihood or frequency. */
const FEELING = /satisf|feel|happy|enjoy/i;
const NOT_FEELING = /agree|likely|often/i;

/** The mechanics the gamifier may pick for a question (combined.system.txt, gamifier table). */
export function allowedMechanics(q: Question): Mechanic[] {
  switch (q.type) {
    case "single_choice":
      return q.options.length === 2 ? ["tap_chips_single", "this_or_that"] : ["tap_chips_single"];
    case "multi_choice":
      return ["tap_chips_multi"];
    case "rating_scale":
      return FEELING.test(q.text) && !NOT_FEELING.test(q.text)
        ? ["segmented_scale", "emoji_scale"]
        : ["segmented_scale"];
    case "nps_0_10":
      return ["number_row_11"];
    case "yes_no":
      return ["this_or_that"];
    case "number_band":
      return ["tap_chips_single"];
    case "short_text":
    case "long_text":
      return ["text_box"];
  }
}

export function isOpen(q: Question): boolean {
  return q.type === "short_text" || q.type === "long_text";
}
