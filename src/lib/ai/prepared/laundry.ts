import type { Question } from "@/lib/survey/types";
import type { Prepared } from "./types";

const base = { scale: null, required: true, sensitive: false, collects_personal_data: false, change: { action: "new", source_id: "", before: "", why: "" } };
const DECIDE = "Whether students would pay for a laundry pickup service, and how much";
const q = (id: string, text: string, type: Question["type"], options: string[], role: string, reason: string, extra: Partial<Question> = {}): Question => ({
  ...base,
  id,
  text,
  type,
  options,
  role,
  reason,
  maps_to_decision: DECIDE,
  ...extra,
});

/** "Would students pay for laundry pickup?" → Laundry Day (Chat Story, everyday India, clay). */
export const laundry: Prepared = {
  key: "laundry",
  match: /\blaundry\b/i,
  picks: {
    concept: "Would students pay for laundry pickup?",
    audience: "Students",
    ageBand: "18+",
    format: "chat_story",
    mood: "everyday_india",
    look: "clay",
    level: "medium",
    brandColor: null,
    logoDataUrl: null,
    timeLimitSec: null,
  },
  set: {
    status: "ready",
    summary_for_creator: "Six questions: how students handle laundry today, then whether and how much they'd pay.",
    decisions_informed: [DECIDE],
    assumptions: ["Respondents are college students", "Prices are per load in rupees", "The survey is anonymous"],
    purpose_line: "Help a student startup decide whether to launch laundry pickup. Your answers are anonymous.",
    consent_line: "",
    questions: [
      q("Q1", "Where do you live during term?", "single_choice", ["Hostel on campus", "PG near campus", "At home", "Other"], "demographic", "Pickup only works where students live close together."),
      q("Q2", "How do you get your laundry done now?", "single_choice", ["I wash it myself", "Campus laundry", "Dhobi or local shop", "Family does it", "Other"], "behaviour", "The service competes with what students already do."),
      q("Q3", "How many clothes do you wash in a week?", "number_band", ["Under 10", "10 to 20", "21 to 30", "More than 30"], "behaviour", "Sets the size of a typical load."),
      q("Q4", "Would you use a laundry pickup and drop service?", "single_choice", ["Yes", "Maybe", "No"], "intention", "The core question, with an honest no."),
      q("Q5", "What is the most you would pay per load?", "number_band", ["Under ₹50", "₹50 to ₹100", "₹101 to ₹150", "More than ₹150", "I wouldn't pay for this"], "intention", "Price bands are easier to answer than a number."),
      q("Q6", "What would make you trust a laundry service with your clothes?", "long_text", [], "attitude", "Trust is the main barrier to handing over clothes.", { required: false }),
    ],
    notes_for_creator: ["What people say they'd pay is usually higher than what they do pay; treat Q5 as a ceiling."],
    flags: [],
  },
  bias: {
    items_reviewed: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"].map((id) => ({ id, verdict: "clear" as const })),
    findings: [],
    overall_note: "Every question allows people to say no or not applicable.",
    flags: [],
  },
  gamifier: {
    intro: { title: "Laundry day", start_button: "Start" },
    items: [
      { question_id: "Q1", mechanic: "tap_chips_single", lead_in: "First, where you stay.", feedback_after_answer: "Got it.", helper_text: "" },
      { question_id: "Q2", mechanic: "tap_chips_single", lead_in: "How laundry works for you now.", feedback_after_answer: "Got it.", helper_text: "" },
      { question_id: "Q3", mechanic: "tap_chips_single", lead_in: "A rough count is fine.", feedback_after_answer: "Got it.", helper_text: "" },
      { question_id: "Q4", mechanic: "tap_chips_single", lead_in: "Now the idea itself.", feedback_after_answer: "Got it.", helper_text: "" },
      { question_id: "Q5", mechanic: "tap_chips_single", lead_in: "And the price.", feedback_after_answer: "Got it.", helper_text: "" },
      { question_id: "Q6", mechanic: "text_box", lead_in: "Last one, and it's optional.", feedback_after_answer: "Got it.", helper_text: "" },
    ],
    milestones: [{ after_question_id: "Q3", copy: "Halfway there, about {{time_left}} to go." }],
    closing: {
      thank_you: "Thanks, this really helps.",
      enjoyment_prompt: "How did you find this survey?",
      reveal_teaser: "Results appear here once more people have answered.",
    },
    reveal: { question_ids: ["Q2", "Q4"], intro_copy: "Here is how {{respondent_count}} people answered" },
    notes_for_creator: [],
    flags: [],
  },
  world: {
    mode: "create",
    world: {
      title: "Laundry Day",
      premise: "Chat with us about your laundry week on campus.",
      template: "chat_story",
      mood: "everyday_india",
      look: "clay",
      narrator_voice: "A friendly hostel neighbour texting you",
    },
    prologue: "",
    chapters: [
      { chapter_id: "C1", title: "Sunday Morning", question_ids: ["Q1", "Q2"], scene_id: "sticker_1", intro_line: "Hey! Quick chat about laundry?", interlude_line: "The bucket is filling up." },
      { chapter_id: "C2", title: "The Pile", question_ids: ["Q3", "Q4"], scene_id: "sticker_2", intro_line: "Be honest about the pile.", interlude_line: "Okay, money talk." },
      { chapter_id: "C3", title: "The Price", question_ids: ["Q5"], scene_id: "sticker_3", intro_line: "No right answer here.", interlude_line: "Last thing." },
      { chapter_id: "C4", title: "Trust", question_ids: ["Q6"], scene_id: "sticker_4", intro_line: "One last thought, if you have one.", interlude_line: "" },
    ],
    items: [
      { question_id: "Q1", slot: "center", prop_family: "reply_chips", acknowledgement: "Noted." },
      { question_id: "Q2", slot: "center", prop_family: "reply_chips", acknowledgement: "Noted." },
      { question_id: "Q3", slot: "center", prop_family: "reply_chips", acknowledgement: "Noted." },
      { question_id: "Q4", slot: "center", prop_family: "reply_chips", acknowledgement: "Noted." },
      { question_id: "Q5", slot: "center", prop_family: "reply_chips", acknowledgement: "Noted." },
      { question_id: "Q6", slot: "center", prop_family: "reply_chips", acknowledgement: "Thanks for that." },
    ],
    ending: { scene_id: "chat_end", line: "That's all. Thanks for the chat, and good luck with the pile.", postcard_title: "My Laundry Day" },
    notes_for_creator: [],
    flags: [],
  },
};
