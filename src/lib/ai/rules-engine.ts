/**
 * The rules engine (survey-platform-architecture.mmd: "cap 10 default, 15 max · time budget ·
 * order · field types · validation" and "Privacy Rules"). Real code, not AI: it re-checks
 * whatever the AI proposed and reports problems instead of changing anything silently.
 */
import { isOpenEnded, secondsFor } from "@/lib/player/rules";
import type { RulesReport, ShaperOutput } from "./types";

export const DEFAULT_CAP = 10;
export const MAX_QUESTIONS = 15;
export const MAX_OPEN = 2;

export function applyRules(shaper: ShaperOutput, timeLimitSeconds: number | null): RulesReport {
  const qs = shaper.questions;
  const problems: string[] = [];
  const questionCount = qs.length;
  const countState = questionCount > MAX_QUESTIONS ? "blocked" : questionCount > DEFAULT_CAP ? "warning" : "ok";
  if (countState === "blocked") problems.push(`More than ${MAX_QUESTIONS} questions: this can't be published until some are cut.`);
  if (countState === "warning") problems.push(`More than ${DEFAULT_CAP} questions: expect fewer people to finish.`);

  const seconds = secondsFor(qs);
  const fitsTime = timeLimitSeconds === null || seconds <= timeLimitSeconds;
  if (!fitsTime) problems.push("Longer than your time limit.");

  const open = qs.filter(isOpenEnded);
  const firstOpen = qs.findIndex(isOpenEnded);
  const openLast = firstOpen < 0 || qs.slice(firstOpen).every(isOpenEnded);
  const openOptional = open.every((q) => !q.required);
  const openLastAndOptional = open.length <= MAX_OPEN && openLast && openOptional;
  if (open.length > MAX_OPEN) problems.push(`More than ${MAX_OPEN} open questions.`);
  if (!openLast) problems.push("Open questions should come last.");
  if (!openOptional) problems.push("Open questions must be optional.");

  const personalDataIds = qs.filter((q) => q.collects_personal_data).map((q) => q.id);
  const consentNeeded = personalDataIds.length > 0 || qs.some((q) => q.sensitive);
  const consentPresent = shaper.consent_line.trim().length > 0;
  if (consentNeeded && !consentPresent) problems.push("Personal or sensitive questions need a consent line.");
  if (qs.some((q) => q.collects_personal_data && q.required)) problems.push("Personal data must be optional.");
  if (qs.some((q) => /\[[^\]]+\]/.test(q.text)) || /\[[^\]]+\]/.test(shaper.purpose_line)) problems.push("Fill every [placeholder] before publishing.");

  return {
    questionCount,
    countState,
    seconds,
    timeLimitSeconds,
    fitsTime,
    openCount: open.length,
    openLastAndOptional,
    personalDataIds,
    consentNeeded,
    consentPresent,
    problems,
  };
}
