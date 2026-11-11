import type { DecisionsData } from "@/components/marketing/AnswersToDecisions";
import { percent, singleHighestIndex, sum } from "./compute";
import { CAFE_SURVEY } from "./sample-surveys";

/**
 * Everything the "From answers to decisions" dashboard shows, derived in code from the
 * raw café counts. The sentence about drop-off is a code template, not AI text, and
 * only names a question when it is the single highest.
 */
export function analyseCafeSurvey(): DecisionsData {
  const c = CAFE_SURVEY;
  if (sum(c.droppedAt) !== c.started - c.finished) {
    throw new Error("Café sample data: drop-off counts must add up to started − finished");
  }
  const highest = singleHighestIndex(c.droppedAt);
  const { onCampus, dayScholars } = c.sundayVisit;

  return {
    title: c.title,
    started: c.started,
    finished: c.finished,
    completion: percent(c.finished, c.started),
    leftAt: [...c.droppedAt],
    maxLeft: Math.max(...c.droppedAt),
    highest,
    dropSentence:
      highest === null
        ? "Drop-off was spread across several questions."
        : `Most people who left did so at Q${highest + 1}.`,
    themeQuestion: c.themeQuestion,
    answersWithContent: c.answersWithContent,
    themes: c.themes.map((t) => ({ ...t, pct: percent(t.count, c.answersWithContent) })),
    minority: { ...c.minority },
    answer: {
      overall: percent(onCampus.yes + dayScholars.yes, onCampus.n + dayScholars.n),
      overallN: onCampus.n + dayScholars.n,
      onCampus: percent(onCampus.yes, onCampus.n),
      onCampusN: onCampus.n,
      dayScholars: percent(dayScholars.yes, dayScholars.n),
      dayScholarsN: dayScholars.n,
    },
  };
}
