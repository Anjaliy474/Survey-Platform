import { SECONDS_PER_CLOSED, SECONDS_PER_OPEN } from "@/lib/compute";
import { isOpen } from "./mechanics";
import type { PlayfulLevel, Question } from "./types";

export { formatAbout } from "@/lib/compute";

/** Story Mode overheads (spec §6). */
export const TITLE_CARD_SECONDS = 5;
export const INTERLUDE_SECONDS = 2;
export const PROLOGUE_SECONDS = 4;
export const ENDING_SECONDS = 10;

export function plainSeconds(questions: Question[]): number {
  return questions.reduce((t, q) => t + (isOpen(q) ? SECONDS_PER_OPEN : SECONDS_PER_CLOSED), 0);
}

/** Questions plus scene time: title card, interludes (Medium and Full), prologue (Full), ending. */
export function storySeconds(questions: Question[], chapterCount: number, level: PlayfulLevel): number {
  const interludes = level === "light" ? 0 : Math.max(0, chapterCount - 1);
  const prologue = level === "full" ? PROLOGUE_SECONDS : 0;
  return plainSeconds(questions) + TITLE_CARD_SECONDS + interludes * INTERLUDE_SECONDS + prologue + ENDING_SECONDS;
}
