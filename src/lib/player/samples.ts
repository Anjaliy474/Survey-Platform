/**
 * Sample published surveys for the Player, built from the golden examples in Activity 3:
 * - H4: a café chain's six finalised questions, chat style, Medium playful level
 * - H3: an NGO's volunteer feedback after a tree-plantation drive, with an optional email
 * Aggregates are sample counts until real responses exist (shown with a "Sample data" badge).
 */
import type { Gamified, GamifiedItem, Mechanic, PlayerSurvey, Question } from "./types";

const q = (id: string, text: string, type: Question["type"], extra: Partial<Question> = {}): Question => ({
  id,
  text,
  type,
  options: [],
  scale: null,
  required: true,
  sensitive: false,
  collects_personal_data: false,
  role: "attitude",
  ...extra,
});

const item = (id: string, mechanic: Mechanic, lead_in: string, feedback = "", helper_text = ""): GamifiedItem => ({
  question_id: id,
  mechanic,
  mechanic_params: { emoji_set: mechanic === "emoji_scale" ? "faces_5" : "none" },
  lead_in,
  feedback_after_answer: feedback,
  helper_text,
});

const oneEach = (ids: string[]): Gamified["screens"] =>
  ids.map((id, i) => ({ screen_id: `S${i + 1}`, question_ids: [id], transition_copy: "" }));

const SATISFACTION = ["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"];
const satisfaction = { points: 5, min_label: SATISFACTION[0], max_label: SATISFACTION[4], point_labels: SATISFACTION };

/** H4: business gamifies finalised questions (chat-style, playful layer medium). */
const cafe: PlayerSurvey = {
  slug: "cafe-feedback",
  status: "live",
  title: "Tell us about your visit",
  creator: { name: "Corner Café" },
  theme: "marigold",
  purpose_line: "Corner Café wants to make your next visit better. Answers are anonymous and only seen as group totals.",
  consent_line: "",
  questions: [
    q("Q1", "Which of our outlets did you visit today?", "single_choice", {
      options: ["Banjara Hills", "Gachibowli", "Kondapur", "Madhapur"],
      role: "behaviour",
    }),
    q("Q2", "How satisfied were you with your coffee today?", "rating_scale", { scale: satisfaction, role: "outcome" }),
    q("Q3", "How likely are you to recommend us to a friend or colleague?", "nps_0_10", {
      scale: { points: 11, min_label: "Not at all likely", max_label: "Extremely likely" },
      role: "outcome",
    }),
    q("Q4", "Did you order any food with your drink?", "yes_no", { options: ["Yes", "No"], role: "behaviour" }),
    q("Q5", "What would you like to see on our menu?", "multi_choice", {
      options: ["Breakfast plates", "Vegan options", "Cold brew", "Desserts", "Healthy snacks", "Nothing new"],
      max_choices: 3,
      role: "intention",
    }),
    q("Q6", "Anything else you’d like to tell us?", "long_text", { required: false }),
  ],
  gamified: {
    style: "chat",
    playful_level: "medium",
    intro: { title: "Tell us about your visit", start_button: "Let’s start" },
    screens: oneEach(["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"]),
    items: [
      item("Q1", "tap_chips_single", "Let’s start with where you were.", "Got it."),
      item("Q2", "emoji_scale", "Now, the coffee.", "Noted, thanks."),
      item("Q3", "number_row_11", "One about recommending us.", "Thanks."),
      item("Q4", "this_or_that", "A quick one about food.", "Got it."),
      item("Q5", "tap_chips_multi", "Help us plan the menu.", "Noted."),
      item("Q6", "text_box", "Last one, and it’s optional.", "Thank you."),
    ],
    milestones: [{ after_question_id: "Q3", copy: "Halfway there, about {{time_left}} to go." }],
    closing: {
      thank_you: "Thank you! Your answers help us make your next visit better.",
      enjoyment_prompt: "How enjoyable was this survey?",
      reveal_teaser: "Results appear here once more people have answered. Check back soon!",
    },
    reveal: { question_ids: ["Q2", "Q4", "Q5"], intro_copy: "Here’s how {{respondent_count}} visitors answered" },
  },
  aggregates: {
    completed: 371,
    counts: { Q2: [12, 27, 64, 158, 110], Q4: [208, 163], Q5: [142, 77, 121, 98, 104, 31] },
    isSample: true,
  },
};

/** H3: an organisation's one-line prompt, turned into a short, consent-aware survey. */
const volunteers: PlayerSurvey = {
  slug: "volunteer-feedback",
  status: "live",
  title: "Sunday’s tree-plantation drive",
  creator: { name: "Green Steps" },
  theme: "lagoon",
  purpose_line: "Green Steps is collecting feedback on Sunday’s tree-plantation drive to plan the next one.",
  consent_line: "Your email is optional and used only to tell you about future drives. Ask us any time and we’ll delete it.",
  questions: [
    q("Q1", "Was this your first tree-plantation drive with us?", "yes_no", { options: ["Yes", "No"], role: "behaviour" }),
    q("Q2", "Overall, how satisfied were you with the drive?", "rating_scale", { scale: satisfaction, role: "outcome" }),
    q("Q3", "How clear were the instructions on the day?", "rating_scale", {
      scale: {
        points: 5,
        min_label: "Very unclear",
        max_label: "Very clear",
        point_labels: ["Very unclear", "Unclear", "Neither clear nor unclear", "Clear", "Very clear"],
      },
    }),
    q("Q4", "What did you enjoy most?", "multi_choice", {
      options: ["Planting the saplings", "Meeting other volunteers", "Learning about trees", "Being outdoors", "None of these"],
      max_choices: 2,
    }),
    q("Q5", "How likely are you to join our next drive?", "rating_scale", {
      scale: {
        points: 5,
        min_label: "Very unlikely",
        max_label: "Very likely",
        point_labels: ["Very unlikely", "Unlikely", "Not sure", "Likely", "Very likely"],
      },
      role: "intention",
    }),
    q("Q6", "Your email, if you’d like to hear about future drives", "short_text", {
      required: false,
      collects_personal_data: true,
      role: "demographic",
      input_kind: "email",
    }),
    q("Q7", "What is one thing we should change next time?", "long_text", { required: false }),
  ],
  gamified: {
    style: "one_per_screen",
    playful_level: "light",
    intro: { title: "Thanks for planting with us", start_button: "Start" },
    screens: oneEach(["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"]),
    items: [
      item("Q1", "this_or_that", "Let’s start with an easy one."),
      item("Q2", "emoji_scale", "Now, the day overall."),
      item("Q3", "segmented_scale", "A quick one about the instructions."),
      item("Q4", "tap_chips_multi", "Thinking back on the day."),
      item("Q5", "segmented_scale", "Looking ahead."),
      item("Q6", "text_box", "Only if you’d like updates."),
      item("Q7", "text_box", "Last one, and it’s optional."),
    ],
    milestones: [{ after_question_id: "Q4", copy: "Over halfway there, about {{time_left}} to go." }],
    closing: {
      thank_you: "Thank you! We read every answer before planning the next drive.",
      enjoyment_prompt: "How enjoyable was this survey?",
      reveal_teaser: "Results appear here once more volunteers have answered. Thanks for being one of the first!",
    },
    reveal: { question_ids: ["Q1", "Q2", "Q4"], intro_copy: "Here’s how {{respondent_count}} volunteers answered" },
  },
  aggregates: {
    completed: 14,
    counts: { Q1: [9, 5], Q2: [0, 1, 2, 6, 5], Q4: [10, 7, 4, 8, 0] },
    isSample: true,
  },
};

/** A closed survey, to show the "This survey has closed" screen. */
const closed: PlayerSurvey = {
  ...cafe,
  slug: "canteen-menu-poll",
  status: "closed",
  title: "Canteen menu poll",
  creator: { name: "Campus Canteen" },
};

export const SAMPLE_SURVEYS: PlayerSurvey[] = [cafe, volunteers, closed];

export function getSurvey(slug: string): PlayerSurvey | undefined {
  return SAMPLE_SURVEYS.find((s) => s.slug === slug);
}
