/**
 * The landing page's live demo poll (UI_UX_LAYOUT.md M1).
 *
 * Shaped like a finalised question set plus gamifier output (combined.system.txt, stages
 * question_shaper and gamifier): Medium playful level, one question per screen,
 * neutral lead-ins and the same feedback for every answer.
 */
import {
  MIN_RESPONSES_FOR_REVEAL,
  estimateSeconds,
  formatAbout,
  percent,
  percentsSummingTo100,
} from "./compute";

export const DRINKS = ["Chai", "Coffee"] as const;
export const FEELINGS = [
  { face: "😣", label: "Really dislike" },
  { face: "🙁", label: "Dislike" },
  { face: "😐", label: "Neutral" },
  { face: "🙂", label: "Like" },
  { face: "😄", label: "Really like" },
] as const;
export const SNACKS = ["Samosa", "Fruit", "Biscuits", "Chips", "Nuts", "Sandwich", "None of these"] as const;
export const SNACK_NONE = SNACKS.length - 1;
export const SNACK_LIMIT = 3;
export const TIME_SLOTS = ["Morning", "Afternoon", "Evening", "Late night"] as const;

export const DEMO_POLL = {
  purposeLine: "Anonymous. Your answers are only used to show how PlaySurvey works.",
  feedback: "Got it.",
  questions: [
    {
      id: "Q1",
      type: "single_choice",
      mechanic: "this_or_that",
      text: "Chai or coffee?",
      leadIn: "An easy one to start.",
      open: false,
    },
    {
      id: "Q2",
      type: "rating_scale",
      mechanic: "emoji_scale",
      text: "How do you feel about long online forms?",
      leadIn: "Quick one about forms.",
      open: false,
    },
    {
      id: "Q3",
      type: "multi_choice",
      mechanic: "tap_chips_multi",
      text: "Pick up to 3 snacks for a long day",
      leadIn: "Last one.",
      helper: `Pick up to ${SNACK_LIMIT}`,
      open: false,
    },
  ],
} as const;

export type DemoAnswers = {
  drink: number | null;
  feel: number | null;
  snacks: number[];
};

export const EMPTY_ANSWERS: DemoAnswers = { drink: null, feel: null, snacks: [] };

/** Aggregates computed from the sample responses (see demo-poll-data.ts). */
export type PollStats = {
  participants: number;
  completed: number;
  medianSeconds: number;
  /** Among completed responses. */
  drinkCounts: number[];
  feelCounts: number[];
  snackMentions: number[];
  /** Q1 answers by the time of day people answered. */
  bySlot: { slot: string; n: number; counts: number[] }[];
};

/** "3 left · about 30s", from the questions still to answer. */
export function remainingLabel(step: number): string {
  const rest = DEMO_POLL.questions.slice(step);
  return `${rest.length} left · ${formatAbout(estimateSeconds(rest))}`;
}

export type Reveal =
  | { kind: "teaser"; respondentCount: number }
  | {
      kind: "reveal";
      respondentCount: number;
      drink: { label: string; pct: number; you: boolean }[];
      feel: { label: string; face: string; pct: number; you: boolean }[];
      snacks: { label: string; pct: number }[];
    };

/**
 * The respondent's reveal: sample aggregates plus this person's own answers, computed in
 * code. Shown only after submitting and only with 20+ responses (DESIGN.md rule 7).
 */
export function computeReveal(stats: PollStats, answers: DemoAnswers): Reveal {
  const respondentCount = stats.completed + 1;
  if (respondentCount < MIN_RESPONSES_FOR_REVEAL) return { kind: "teaser", respondentCount };

  const drinkCounts = stats.drinkCounts.map((c, i) => c + (answers.drink === i ? 1 : 0));
  const feelCounts = stats.feelCounts.map((c, i) => c + (answers.feel === i ? 1 : 0));
  const snackCounts = stats.snackMentions.map((c, i) => c + (answers.snacks.includes(i) ? 1 : 0));
  const drinkPct = percentsSummingTo100(drinkCounts);
  const feelPct = percentsSummingTo100(feelCounts);

  return {
    kind: "reveal",
    respondentCount,
    drink: DRINKS.map((label, i) => ({ label, pct: drinkPct[i], you: answers.drink === i })),
    feel: FEELINGS.map((f, i) => ({ label: f.label, face: f.face, pct: feelPct[i], you: answers.feel === i })),
    snacks: answers.snacks.map((i) => ({ label: SNACKS[i], pct: percent(snackCounts[i], respondentCount) })),
  };
}
