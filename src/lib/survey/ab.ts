import type { Arm } from "./types";

/** Random 50/50 story-or-plain assignment for a new respondent; everyone gets the story when the split is off. */
export function assignArm(splitAB: boolean, rand: () => number = Math.random): Arm {
  if (!splitAB) return "story";
  return rand() < 0.5 ? "story" : "plain";
}
