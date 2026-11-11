/**
 * Survey data the Player renders. Field names follow the JSON schemas in combined.system.txt:
 * the finalised question set (stage question_shaper) plus the gamifier output (stage gamifier).
 *
 * Extensions to the schema, all filled by the Studio rather than the AI:
 * - `scale.point_labels`: a text label for every scale point (DESIGN.md §7.2: "every point labelled")
 * - `max_choices`: the selection limit of a multi-choice question
 * - `input_kind`: "email" for an optional contact field, so phones show the right keyboard
 */

export type QuestionType =
  | "single_choice"
  | "multi_choice"
  | "rating_scale"
  | "nps_0_10"
  | "yes_no"
  | "number_band"
  | "short_text"
  | "long_text";

export type Mechanic =
  | "tap_chips_single"
  | "tap_chips_multi"
  | "this_or_that"
  | "segmented_scale"
  | "emoji_scale"
  | "number_row_11"
  | "text_box";

export type PresentationStyle = "one_per_screen" | "pages" | "chat" | "classic";
export type PlayfulLevel = "off" | "light" | "medium";
export type ThemeName = "marigold" | "lagoon" | "night";
export type Shape = "soft" | "round" | "pill";

export type Question = {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  scale: { points: number; min_label: string; max_label: string; point_labels?: string[] } | null;
  required: boolean;
  sensitive: boolean;
  collects_personal_data: boolean;
  role: "behaviour" | "attitude" | "intention" | "demographic" | "outcome";
  max_choices?: number;
  input_kind?: "text" | "email";
};

export type GamifiedItem = {
  question_id: string;
  mechanic: Mechanic;
  mechanic_params: { emoji_set: "faces_5" | "none" };
  lead_in: string;
  feedback_after_answer: string;
  helper_text: string;
};

export type Gamified = {
  style: PresentationStyle;
  playful_level: PlayfulLevel;
  intro: { title: string; start_button: string };
  screens: { screen_id: string; question_ids: string[]; transition_copy: string }[];
  items: GamifiedItem[];
  milestones: { after_question_id: string; copy: string }[];
  closing: { thank_you: string; enjoyment_prompt: string; reveal_teaser: string };
  reveal: { question_ids: string[]; intro_copy: string };
};

/** A published survey as the Player receives it. */
export type PlayerSurvey = {
  slug: string;
  status: "live" | "closed";
  title: string;
  creator: { name: string; logoUrl?: string; url?: string };
  theme: ThemeName;
  /** A creator's own colours (Custom theme), already contrast-checked. */
  customTheme?: { bg: string; text: string; button: string; buttonText: string; link: string };
  /** Corner roundness of tiles and buttons (DESIGN.md §6.9). Round when missing. */
  shape?: Shape;
  purpose_line: string;
  consent_line: string;
  questions: Question[];
  gamified: Gamified;
  /**
   * Aggregates for the reveal, as the compute engine would return them: completed responses
   * and per-option counts for the reveal questions. Sample data until the backend exists.
   */
  aggregates: { completed: number; counts: Record<string, number[]>; isSample: boolean };
  /** Publish settings (UI_UX_LAYOUT.md S6). Missing on the built-in samples. */
  settings?: SurveySettings;
};

export type SurveySettings = {
  /** Off: the thank-you screen offers "Answer again" on the same device. */
  onePerPerson: boolean;
  /** Closes automatically at this time (ms), or after this many responses. */
  closeAt: number | null;
  closeAfter: number | null;
  language: "en";
};

/** One answer: an option or scale index, several option indexes, an NPS score, or text. */
export type Answer = number | number[] | string;
export type Answers = Record<string, Answer>;
