/**
 * DEMO stand-in for the gamifier stage (combined.system.txt). Returns the exact gamifier JSON:
 * a mechanic per question from the allowed library, and short, neutral copy around it. It never
 * outputs question wording, options or scales. The Claude version replaces this file.
 */
import { buildScreens, revealEligible } from "@/lib/player/rules";
import type { Gamified, PlayerSurvey, PlayfulLevel, PresentationStyle, Question } from "@/lib/player/types";
import { defaultMechanic } from "@/lib/studio/to-player";

const pick = <T,>(pool: readonly T[], i: number, seed: number) => pool[(i + seed) % pool.length];

const LEAD_INS: Record<string, string[]> = {
  first: ["Let’s start with an easy one.", "An easy one to begin.", "First, a quick one."],
  behaviour: ["A quick one about what you do.", "Thinking about the usual.", "One about your habits."],
  attitude: ["Now, what you think.", "A quick one about your view.", "Tell us how it felt."],
  intention: ["Looking ahead.", "Thinking about next time.", "One about what comes next."],
  outcome: ["Now, the big picture.", "Overall, how did it go?", "One about the whole experience."],
  demographic: ["A little about you.", "Just for grouping answers.", "One about you, then back to it."],
  open: ["Last one, and it’s optional.", "Only if you have something to add.", "Optional, in your own words."],
};
const FEEDBACK = ["Got it.", "Noted, thanks.", "Thanks.", "Got it, thanks."];
const TITLES = ["A few quick questions", "Got a minute?", "Quick questions for you"];
const START = ["Let’s start", "Start", "Begin"];
const THANKS = [
  "Thank you! Your answers help us do better.",
  "Thanks for taking the time. Every answer counts.",
  "All done. Thank you for sharing your view.",
];
const TEASERS = [
  "Results appear here once more people have answered. Check back soon!",
  "Group results show up once more people have answered.",
];
const PAGE_LINES = ["A few more.", "Next, a couple more.", "On to the next few."];
const LAST_PAGE = ["Last page.", "Nearly done, last page.", "Final page."];
const ENJOY = ["How enjoyable was this survey?", "How enjoyable did you find this?", "How enjoyable was answering these?"];
const REVEAL_INTROS = ["Here’s how {{respondent_count}} people answered", "What {{respondent_count}} people said", "How {{respondent_count}} people answered so far"];
const MILESTONES = ["Halfway there, about {{time_left}} to go.", "Over halfway, {{questions_left}} to go.", "Nice and steady, about {{time_left}} left."];

export function recommendStyle(questions: Question[]): { style: PresentationStyle; reason: string } {
  const closed = questions.filter((q) => q.type !== "long_text" && q.type !== "short_text").length;
  if (questions.length > 10) return { style: "pages", reason: "Longer surveys feel shorter when related questions share a page." };
  return { style: "one_per_screen", reason: `${closed === questions.length ? "Short, closed" : "Short"} questions read best one at a time on a phone.` };
}

export function demoGamify(input: { questions: Question[]; style: PresentationStyle; level: PlayfulLevel; seed?: number }): Gamified {
  const { questions, style, level } = input;
  const seed = input.seed ?? 0;
  const playful = level !== "off" && style !== "classic";
  // No screens yet, so buildScreens groups the pages itself (it reuses screens only for an existing pages layout).
  const fake = { questions, gamified: { style: "one_per_screen", screens: [] } } as unknown as PlayerSurvey;
  const ids = buildScreens(fake, style);
  const screens = ids.map((question_ids, i) => ({
    screen_id: `S${i + 1}`,
    question_ids,
    // Pages style: a short line before every page after the first.
    transition_copy: style === "pages" && playful && i > 0 ? (i === ids.length - 1 ? pick(LAST_PAGE, i, seed) : pick(PAGE_LINES, i, seed)) : "",
  }));
  const half = questions[Math.max(0, Math.ceil(questions.length / 2) - 1)];

  return {
    style,
    playful_level: level,
    intro: { title: pick(TITLES, 0, seed), start_button: pick(START, 0, seed) },
    screens,
    items: questions.map((q, i) => {
      const mechanic = defaultMechanic(q);
      const open = q.type === "short_text" || q.type === "long_text";
      const pool = i === 0 ? LEAD_INS.first : open ? LEAD_INS.open : LEAD_INS[q.role] ?? LEAD_INS.attitude;
      return {
        question_id: q.id,
        mechanic,
        mechanic_params: { emoji_set: mechanic === "emoji_scale" ? "faces_5" : "none" },
        lead_in: playful ? pick(pool, i, seed) : "",
        feedback_after_answer: level === "medium" && style !== "classic" ? pick(FEEDBACK, i, seed) : "",
        helper_text: "",
      };
    }),
    milestones: playful && questions.length >= 5 && half ? [{ after_question_id: half.id, copy: pick(MILESTONES, 0, seed) }] : [],
    closing: {
      thank_you: pick(THANKS, 0, seed),
      enjoyment_prompt: pick(ENJOY, 0, seed),
      reveal_teaser: pick(TEASERS, 0, seed),
    },
    reveal: {
      question_ids: questions.filter((q) => !revealEligible(q)).slice(0, 3).map((q) => q.id),
      intro_copy: pick(REVEAL_INTROS, 0, seed),
    },
    notes_for_creator: [],
    flags: [],
  } as Gamified;
}
