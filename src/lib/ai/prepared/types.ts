import type { BiasReport, Gamifier, QuestionSet, QuickPicks, WorldSpec } from "@/lib/survey/types";

/** A demo concept with every AI stage already answered, used when Gemini is missing or fails. */
export type Prepared = {
  key: "fest" | "cafe" | "laundry";
  match: RegExp;
  picks: QuickPicks;
  set: QuestionSet;
  bias: BiasReport;
  gamifier: Gamifier;
  world: WorldSpec;
};
