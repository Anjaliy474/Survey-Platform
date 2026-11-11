/**
 * Raw sample counts for the example surveys on the landing page (labelled "Sample data").
 * These are the kind of counts a database query returns. Every percentage, total and
 * "highest" shown on the page is derived from them in code (see lib/compute.ts).
 */

/** "Café Sunday survey": the analysis demo in "From answers to decisions". */
export const CAFE_SURVEY = {
  title: "Café Sunday survey",
  started: 412,
  finished: 371,
  /** People who left on Q1 … Q8 (saw the question and stopped there). */
  droppedAt: [2, 1, 3, 2, 4, 19, 6, 4],
  themeQuestion: "What would make you visit on Sundays?",
  answersWithContent: 261,
  themes: [
    { label: "Brunch or breakfast menu", count: 94 },
    { label: "Quiet place to study", count: 81 },
    { label: "Opening before 10 am", count: 52 },
  ],
  minority: { quote: "a board-games corner", responseId: "R-0233" },
  /** "Would you likely visit on a Sunday?" split by where people live. */
  sundayVisit: {
    onCampus: { yes: 145, n: 204 },
    dayScholars: { yes: 80, n: 167 },
  },
} as const;

/** Open-answer theme for the full version of the demo poll (optional "anything else?"). */
export const POLL_THEME = {
  label: "Long forms feel like homework",
  mentions: 212,
  writtenAnswers: 503,
  quotes: [
    { id: "R-0412", text: "honestly I close any form that has more than one page" },
    { id: "R-0977", text: "short ones are fine, it's the 20 question ones that I skip" },
  ],
} as const;

/** The quick-prompt draft in "Three ways to start": 7 closed questions and 1 open one. */
export const FEST_DRAFT_QUESTIONS = [
  { open: false },
  { open: false },
  { open: false },
  { open: false },
  { open: false },
  { open: false },
  { open: false },
  { open: true },
] as const;
