import type { Question, QuestionType } from "./types";

/** Test helper: a minimal valid question. */
export function makeQuestion(id: string, type: QuestionType, text = "Pick one", options: string[] = ["A", "B", "C"]): Question {
  return {
    id,
    text,
    type,
    options,
    scale: type === "rating_scale" ? { points: 5, min_label: "Very unhappy", max_label: "Very happy" } : null,
    required: type !== "short_text" && type !== "long_text",
    sensitive: false,
    collects_personal_data: false,
    role: "attitude",
    reason: "",
    maps_to_decision: "",
    change: { action: "new", source_id: "", before: "", why: "" },
  };
}
