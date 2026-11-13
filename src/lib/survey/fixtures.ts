/** Test helpers: valid questions, gamifier output and a world that passes every rule. */
import type { Gamifier, Mechanic, Question, QuestionType, WorldSpec } from "./types";

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

/** Six questions covering every mechanic family. */
export function sixQuestions(): Question[] {
  return [
    makeQuestion("Q1", "single_choice", "How did you hear about the fest?", ["Posters", "Friends", "Instagram"]),
    makeQuestion("Q2", "rating_scale", "How satisfied were you with the food?", []),
    makeQuestion("Q3", "multi_choice", "Which events did you attend?", ["Music", "Dance", "Quiz", "None of these"]),
    makeQuestion("Q4", "yes_no", "Would you come again next year?", ["Yes", "No"]),
    makeQuestion("Q5", "nps_0_10", "How likely are you to recommend the fest to a friend?", []),
    makeQuestion("Q6", "long_text", "Anything we should change next time?", []),
  ];
}

const MECH: Record<string, Mechanic> = {
  Q1: "tap_chips_single",
  Q2: "emoji_scale",
  Q3: "tap_chips_multi",
  Q4: "this_or_that",
  Q5: "number_row_11",
  Q6: "text_box",
};

export function gamifierFor(ids: string[]): Gamifier {
  return {
    intro: { title: "Fest feedback", start_button: "Start" },
    items: ids.map((id) => ({
      question_id: id,
      mechanic: MECH[id] ?? "tap_chips_single",
      lead_in: "",
      feedback_after_answer: "Got it.",
      helper_text: "",
    })),
    milestones: [],
    closing: { thank_you: "Thanks for taking part.", enjoyment_prompt: "How was that?", reveal_teaser: "Results appear soon." },
    reveal: { question_ids: ["Q1"], intro_copy: "Here is how {{respondent_count}} people answered" },
    notes_for_creator: [],
    flags: [],
  };
}

/** A Journey Map world that passes every validator rule at Medium. */
export function validWorld(): WorldSpec {
  return {
    mode: "create",
    world: {
      title: "Fest Night Trail",
      premise: "Walk the fest one more time and tell us how it felt.",
      template: "journey_map",
      mood: "festive",
      look: "clay",
      narrator_voice: "Warm and calm",
    },
    prologue: "",
    chapters: [
      { chapter_id: "C1", title: "The Gate", question_ids: ["Q1"], scene_id: "gate", intro_line: "The gate is open.", interlude_line: "On to the food street." },
      { chapter_id: "C2", title: "Food Street", question_ids: ["Q2", "Q3"], scene_id: "market_street", intro_line: "The stalls are still glowing.", interlude_line: "The music is close now." },
      { chapter_id: "C3", title: "Main Stage", question_ids: ["Q4", "Q5"], scene_id: "stage_square", intro_line: "The stage lights warm up.", interlude_line: "Up the hill, nearly there." },
      { chapter_id: "C4", title: "Night Sky", question_ids: ["Q6"], scene_id: "night_sky", intro_line: "One last thought under the stars.", interlude_line: "" },
    ],
    items: [
      { question_id: "Q1", slot: "center", prop_family: "signposts", acknowledgement: "Noted." },
      { question_id: "Q2", slot: "center", prop_family: "lantern_row", acknowledgement: "Noted." },
      { question_id: "Q3", slot: "center", prop_family: "posters", acknowledgement: "Noted." },
      { question_id: "Q4", slot: "center", prop_family: "lanterns_pair", acknowledgement: "Noted." },
      { question_id: "Q5", slot: "center", prop_family: "star_row", acknowledgement: "Noted." },
      { question_id: "Q6", slot: "center", prop_family: "postcard", acknowledgement: "Noted." },
    ],
    ending: { scene_id: "lantern_release", line: "Thanks for walking the trail with us.", postcard_title: "My Fest Night Trail" },
    notes_for_creator: [],
    flags: [],
  };
}
