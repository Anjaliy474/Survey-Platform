import type { Question } from "@/lib/survey/types";
import type { Prepared } from "./types";

const base = { scale: null, required: true, sensitive: false, collects_personal_data: false, change: { action: "new", source_id: "", before: "", why: "" } };
const DECIDE = "Whether to open on Sundays, and at what hours";
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

/** "Should our café open on Sundays?" → The Sunday Shift (Stations Room, cosy, paper-cut). */
export const cafe: Prepared = {
  key: "cafe",
  match: /caf[eé].*sunday|sunday.*caf[eé]/i,
  picks: {
    concept: "Should our café open on Sundays?",
    audience: "Customers",
    ageBand: "18+",
    format: "stations_room",
    mood: "cosy",
    look: "paper_cut",
    level: "medium",
    brandColor: null,
    logoDataUrl: null,
    timeLimitSec: null,
  },
  set: {
    status: "ready",
    summary_for_creator: "Seven questions: how people visit today first, then Sundays, then how they feel about the café.",
    decisions_informed: [DECIDE],
    assumptions: ["Respondents are current or recent customers", "The survey is anonymous"],
    purpose_line: "Help our café decide whether to open on Sundays. Your answers are anonymous.",
    consent_line: "",
    questions: [
      q("Q1", "How often do you visit our café?", "single_choice", ["Every day", "A few times a week", "Once a week", "A few times a month", "Rarely"], "behaviour", "What people do today comes before what they say they'd do."),
      q("Q2", "On which days do you usually visit cafés?", "multi_choice", ["Monday to Friday", "Saturday", "Sunday", "I don't usually visit cafés"], "behaviour", "Shows whether Sunday café habits already exist."),
      q("Q3", "Would you visit us on a Sunday if we were open?", "single_choice", ["Yes, likely", "Maybe", "No, unlikely"], "intention", "The core question, with an honest way to say no."),
      q("Q4", "What time would suit you best on a Sunday?", "single_choice", ["Before 10 am", "10 am to 1 pm", "1 pm to 5 pm", "After 5 pm", "I wouldn't visit on a Sunday"], "intention", "Sets the hours if you do open."),
      q("Q5", "How satisfied are you with our café overall?", "rating_scale", [], "outcome", "A baseline to compare after any change.", { scale: { points: 5, min_label: "Very unhappy", max_label: "Very happy" } }),
      q("Q6", "How likely are you to recommend us to a friend?", "nps_0_10", [], "outcome", "One measure you can track over time.", { scale: { points: 11, min_label: "Not at all likely", max_label: "Extremely likely" } }),
      q("Q7", "What would make a Sunday visit worth it for you?", "long_text", [], "attitude", "Ideas for what a Sunday should offer.", { required: false }),
    ],
    notes_for_creator: ["This is a convenience sample of your customers, so report the number of responses with any result."],
    flags: [],
  },
  bias: {
    items_reviewed: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"].map((id) => ({ id, verdict: "clear" as const })),
    findings: [],
    overall_note: "Every question allows a negative answer, so results will be trustworthy.",
    flags: [],
  },
  gamifier: {
    intro: { title: "Sunday at the café", start_button: "Start" },
    items: [
      { question_id: "Q1", mechanic: "tap_chips_single", lead_in: "Let's start with your visits.", feedback_after_answer: "Got it.", helper_text: "" },
      { question_id: "Q2", mechanic: "tap_chips_multi", lead_in: "Cafés in general now.", feedback_after_answer: "Got it.", helper_text: "Pick all that apply" },
      { question_id: "Q3", mechanic: "tap_chips_single", lead_in: "The big one.", feedback_after_answer: "Got it.", helper_text: "" },
      { question_id: "Q4", mechanic: "tap_chips_single", lead_in: "And the timing.", feedback_after_answer: "Got it.", helper_text: "" },
      { question_id: "Q5", mechanic: "emoji_scale", lead_in: "How we're doing.", feedback_after_answer: "Got it.", helper_text: "" },
      { question_id: "Q6", mechanic: "number_row_11", lead_in: "Nearly done.", feedback_after_answer: "Got it.", helper_text: "" },
      { question_id: "Q7", mechanic: "text_box", lead_in: "Last one, and it's optional.", feedback_after_answer: "Got it.", helper_text: "" },
    ],
    milestones: [{ after_question_id: "Q4", copy: "Halfway there, about {{time_left}} to go." }],
    closing: {
      thank_you: "Thanks, this helps us plan our Sundays.",
      enjoyment_prompt: "How did you find this survey?",
      reveal_teaser: "Results appear here once more people have answered.",
    },
    reveal: { question_ids: ["Q3", "Q4"], intro_copy: "Here is how {{respondent_count}} people answered" },
    notes_for_creator: [],
    flags: [],
  },
  world: {
    mode: "create",
    world: {
      title: "The Sunday Shift",
      premise: "Spend a slow morning in the café and help us plan Sundays.",
      template: "stations_room",
      mood: "cosy",
      look: "paper_cut",
      narrator_voice: "Soft and welcoming, like the person behind the counter",
    },
    prologue: "",
    chapters: [
      { chapter_id: "C1", title: "The Counter", question_ids: ["Q1", "Q2"], scene_id: "counter", intro_line: "The kettle is on.", interlude_line: "Over to the menu wall." },
      { chapter_id: "C2", title: "Menu Wall", question_ids: ["Q3", "Q4"], scene_id: "menu_wall", intro_line: "The Sunday board is still blank.", interlude_line: "Take the window seat." },
      { chapter_id: "C3", title: "Window Seat", question_ids: ["Q5", "Q6"], scene_id: "window_seat", intro_line: "Morning light on the table.", interlude_line: "One stop left." },
      { chapter_id: "C4", title: "Notice Board", question_ids: ["Q7"], scene_id: "notice_board", intro_line: "Pin a note for the team.", interlude_line: "" },
    ],
    items: [
      { question_id: "Q1", slot: "center", prop_family: "menu_cards", acknowledgement: "Noted." },
      { question_id: "Q2", slot: "center", prop_family: "jar_labels", acknowledgement: "Noted." },
      { question_id: "Q3", slot: "center", prop_family: "menu_cards", acknowledgement: "Noted." },
      { question_id: "Q4", slot: "center", prop_family: "menu_cards", acknowledgement: "Noted." },
      { question_id: "Q5", slot: "center", prop_family: "mug_row", acknowledgement: "Noted." },
      { question_id: "Q6", slot: "center", prop_family: "shelf_numbers", acknowledgement: "Noted." },
      { question_id: "Q7", slot: "center", prop_family: "notebook", acknowledgement: "Thanks for the note." },
    ],
    ending: { scene_id: "closing_time", line: "The chairs go up. Thanks for spending the morning with us.", postcard_title: "My Sunday Shift" },
    notes_for_creator: [],
    flags: [],
  },
};
