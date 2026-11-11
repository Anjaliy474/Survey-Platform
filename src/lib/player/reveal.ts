/**
 * The respondent's aggregate reveal (DESIGN.md rule 7, §7.3): shown only after submitting,
 * only with 20+ responses, only for up to 3 closed, non-sensitive questions, and only as
 * group totals. Every percentage is computed here, from counts plus this person's answers.
 */
import { MIN_RESPONSES_FOR_REVEAL, percent, percentsSummingTo100 } from "@/lib/compute";
import { fillTokens, optionsFor, scaleLabels } from "./rules";
import type { Answers, PlayerSurvey } from "./types";

export type RevealRow = { label: string; pct: number; you: boolean };
export type RevealBlock = { questionId: string; text: string; rows: RevealRow[]; multi: boolean };
export type PlayerReveal =
  | { kind: "teaser"; copy: string }
  | { kind: "reveal"; intro: string; respondentCount: number; blocks: RevealBlock[]; isSample: boolean };

export function computePlayerReveal(survey: PlayerSurvey, answers: Answers): PlayerReveal {
  const respondentCount = survey.aggregates.completed + 1;
  if (respondentCount < MIN_RESPONSES_FOR_REVEAL || survey.gamified.reveal.question_ids.length === 0) {
    return { kind: "teaser", copy: survey.gamified.closing.reveal_teaser };
  }

  const blocks: RevealBlock[] = [];
  for (const id of survey.gamified.reveal.question_ids) {
    const q = survey.questions.find((x) => x.id === id);
    const base = survey.aggregates.counts[id];
    if (!q || !base) continue;
    const mine = answers[id];
    const picked = (i: number) => (Array.isArray(mine) ? mine.includes(i) : mine === i);
    const counts = base.map((c, i) => c + (picked(i) ? 1 : 0));
    const labels = q.type === "rating_scale" ? scaleLabels(q) : optionsFor(q);
    const multi = q.type === "multi_choice";
    const pcts = multi ? counts.map((c) => percent(c, respondentCount)) : percentsSummingTo100(counts);
    blocks.push({ questionId: id, text: q.text, multi, rows: labels.map((label, i) => ({ label, pct: pcts[i], you: picked(i) })) });
  }

  return {
    kind: "reveal",
    intro: fillTokens(survey.gamified.reveal.intro_copy, { respondentCount }),
    respondentCount,
    blocks,
    isSample: survey.aggregates.isSample,
  };
}

/**
 * Reveal counts from raw responses (surveys published in this browser). The respondent's own
 * response is left out, because the reveal adds it back on top (`completed + 1`).
 */
export function aggregatesFrom(
  survey: PlayerSurvey,
  responses: readonly { id: string; answers: Answers }[],
  ownId?: string,
): PlayerSurvey["aggregates"] {
  const others = responses.filter((r) => r.id !== ownId);
  const counts: Record<string, number[]> = {};
  for (const id of survey.gamified.reveal.question_ids) {
    const q = survey.questions.find((x) => x.id === id);
    if (!q) continue;
    const labels = q.type === "rating_scale" ? scaleLabels(q) : optionsFor(q);
    counts[id] = labels.map((_, i) => others.filter((r) => (Array.isArray(r.answers[id]) ? (r.answers[id] as number[]).includes(i) : r.answers[id] === i)).length);
  }
  return { completed: others.length, counts, isSample: false };
}
