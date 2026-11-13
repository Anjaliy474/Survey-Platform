import { describe, expect, it } from "vitest";
import { allowedMechanics, isOpen } from "./mechanics";
import type { Question, QuestionType } from "./types";

function q(type: QuestionType, text = "Pick one", options: string[] = ["A", "B", "C"]): Question {
  return {
    id: "Q1",
    text,
    type,
    options,
    scale: type === "rating_scale" ? { points: 5, min_label: "Low", max_label: "High" } : null,
    required: true,
    sensitive: false,
    collects_personal_data: false,
    role: "attitude",
    reason: "",
    maps_to_decision: "",
    change: { action: "new", source_id: "", before: "", why: "" },
  };
}

describe("allowedMechanics", () => {
  it("allows this_or_that only for two-option single choice", () => {
    expect(allowedMechanics(q("single_choice", "Chai or coffee?", ["Chai", "Coffee"]))).toEqual([
      "tap_chips_single",
      "this_or_that",
    ]);
    expect(allowedMechanics(q("single_choice"))).toEqual(["tap_chips_single"]);
  });

  it("maps the fixed types", () => {
    expect(allowedMechanics(q("multi_choice"))).toEqual(["tap_chips_multi"]);
    expect(allowedMechanics(q("nps_0_10", "How likely are you to recommend us?", []))).toEqual(["number_row_11"]);
    expect(allowedMechanics(q("yes_no", "Did you attend?", ["Yes", "No"]))).toEqual(["this_or_that"]);
    expect(allowedMechanics(q("number_band"))).toEqual(["tap_chips_single"]);
    expect(allowedMechanics(q("short_text", "Anything else?", []))).toEqual(["text_box"]);
    expect(allowedMechanics(q("long_text", "Tell us more", []))).toEqual(["text_box"]);
  });

  it("offers emoji_scale only for satisfaction or feelings", () => {
    expect(allowedMechanics(q("rating_scale", "How satisfied were you with the food?", []))).toEqual([
      "segmented_scale",
      "emoji_scale",
    ]);
    expect(allowedMechanics(q("rating_scale", "How likely are you to visit on a Sunday?", []))).toEqual([
      "segmented_scale",
    ]);
    expect(allowedMechanics(q("rating_scale", "How much do you agree the menu is clear?", []))).toEqual([
      "segmented_scale",
    ]);
  });
});

describe("isOpen", () => {
  it("is true only for text types", () => {
    expect(isOpen(q("short_text"))).toBe(true);
    expect(isOpen(q("long_text"))).toBe(true);
    expect(isOpen(q("single_choice"))).toBe(false);
  });
});
