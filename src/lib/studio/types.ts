import type { BiasOutput, RulesReport, ShaperOutput, SurveyRequest } from "@/lib/ai/types";
import type { BuilderState } from "./builder";

/** A creator's survey as the Studio lists it. Numbers are counts; percentages are computed. */
export type SurveyStatus = "draft" | "live" | "closed";
/** Create-flow steps a draft can reach (the step rail). */
export type CreateStep = "build" | "style" | "publish";

export type StudioSurvey = {
  id: string;
  /** Public Player link (/s/:slug) once published. */
  slug: string | null;
  title: string;
  status: SurveyStatus;
  /** Furthest create step reached (drafts). */
  step: CreateStep;
  /** One entry per question: open (written) answers take longer. */
  questions: { open: boolean }[];
  /** Response counts from the compute engine (sample data for now). */
  stats: { started: number; finished: number; lastSevenDays: number[] } | null;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
  /** What the creator gave on the start page (drafts made in the Studio). */
  brief?: SurveyRequest;
  /** The AI proposal, still a draft until the creator accepts each part in the builder. */
  ai?: DraftAi;
  /** The creator's working question set (build step 5). */
  builder?: BuilderState;
};

export type DraftAi = {
  engine: "demo" | "claude";
  shaper: ShaperOutput;
  bias: BiasOutput;
  rules: RulesReport;
  createdAt: number;
};

export type Section = "build" | "style" | "publish" | "results" | "themes" | "dashboard" | "responses" | "ask" | "report";
