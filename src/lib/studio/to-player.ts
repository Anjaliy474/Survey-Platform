/**
 * Turn a Studio draft into what the Player renders. Used by the builder's Preview, the Style
 * page and Publish. Wording, options and scales are copied exactly; only the mechanic and the
 * light copy around each question are added (DESIGN.md rule 5).
 */
import type { Gamified, Mechanic, PlayerSurvey, PlayfulLevel, PresentationStyle, Question, ThemeName } from "@/lib/player/types";

export function defaultMechanic(q: Question): Mechanic {
  switch (q.type) {
    case "single_choice":
      return q.options.length === 2 ? "this_or_that" : "tap_chips_single";
    case "multi_choice":
      return "tap_chips_multi";
    case "rating_scale":
      return q.scale?.points === 5 && /satisf|feel|happy|enjoy/i.test(q.text) ? "emoji_scale" : "segmented_scale";
    case "nps_0_10":
      return "number_row_11";
    case "yes_no":
      return "this_or_that";
    case "number_band":
      return "tap_chips_single";
    default:
      return "text_box";
  }
}

/** Plain, neutral copy for a preview before the gamifier has written anything. */
export function defaultGamified(questions: Question[], style: PresentationStyle = "one_per_screen", level: PlayfulLevel = "light"): Gamified {
  return {
    style,
    playful_level: level,
    intro: { title: "A few quick questions", start_button: "Start" },
    screens: questions.map((q, i) => ({ screen_id: `S${i + 1}`, question_ids: [q.id], transition_copy: "" })),
    items: questions.map((q) => ({
      question_id: q.id,
      mechanic: defaultMechanic(q),
      mechanic_params: { emoji_set: defaultMechanic(q) === "emoji_scale" ? "faces_5" : "none" },
      lead_in: "",
      feedback_after_answer: "",
      helper_text: "",
    })),
    milestones: [],
    closing: {
      thank_you: "Thank you for your answers!",
      enjoyment_prompt: "How enjoyable was this survey?",
      reveal_teaser: "Results appear here once more people have answered.",
    },
    reveal: { question_ids: [], intro_copy: "Here’s how {{respondent_count}} people answered" },
  };
}

/** Strip builder-only fields and give every question a clean, ordered id. */
export function plainQuestions(questions: Question[]): Question[] {
  return questions.map((q, i) => ({
    id: `Q${i + 1}`,
    text: q.text,
    type: q.type,
    options: [...q.options],
    scale: q.scale ? { ...q.scale } : null,
    required: q.required,
    sensitive: q.sensitive,
    collects_personal_data: q.collects_personal_data,
    role: q.role,
    ...(q.max_choices ? { max_choices: q.max_choices } : {}),
    ...(q.input_kind ? { input_kind: q.input_kind } : {}),
  }));
}

export function toPlayerSurvey(input: {
  slug: string;
  title: string;
  creatorName: string;
  theme: ThemeName;
  purpose_line: string;
  consent_line: string;
  questions: Question[];
  gamified?: Gamified;
}): PlayerSurvey {
  const questions = plainQuestions(input.questions);
  return {
    slug: input.slug,
    status: "live",
    title: input.title,
    creator: { name: input.creatorName },
    theme: input.theme,
    purpose_line: input.purpose_line,
    consent_line: input.consent_line,
    questions,
    gamified: input.gamified ?? defaultGamified(questions),
    aggregates: { completed: 0, counts: {}, isSample: false },
  };
}
