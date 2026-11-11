import type { BiasOutput, RulesReport, ShaperOutput, SurveyRequest, ThemeOutput } from "@/lib/ai/types";
import type { Gamified, PlayerSurvey, PlayfulLevel, PresentationStyle, Shape, ThemeName } from "@/lib/player/types";
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
  /** Style and gamify choices (build step 6). */
  look?: StyleSettings;
  /** Publish settings, kept while the creator is still deciding (build step 7). */
  publish?: PublishSettings;
  /** What respondents get: the survey as published (build step 7). */
  player?: PlayerSurvey;
  publishedAt?: number;
  /** Keep / Exclude decisions on flagged responses (Responses page). */
  review?: Record<string, "keep" | "exclude">;
  /** Theme coding per open question (Themes page). */
  themes?: Record<string, ThemeState>;
};

export type ThemeState = {
  /** The AI's coding after code checks, plus the creator's renames and merges. */
  result: ThemeOutput;
  /** Responses already coded, so only new ones go through apply_codebook. */
  coded: string[];
  updatedAt: number;
  engine: "demo" | "claude";
  /** What the creator changed ("You approved"): theme id → note. */
  approved: Record<string, string>;
  /** Suggested new themes the creator chose to ignore (by label). */
  ignored: string[];
};

export type PublishSettings = {
  close: "never" | "date" | "count";
  /** yyyy-mm-dd, closes at the end of that day (local time). */
  closeDate: string;
  closeAfter: number;
  onePerPerson: boolean;
};

export type StyleSettings = {
  style: PresentationStyle;
  level: PlayfulLevel;
  theme: ThemeName | "custom";
  custom: { bg: string; button: string };
  shape: Shape;
  /** The gamifier's output with the creator's edits; null while the words are first written. */
  gamified: Gamified | null;
  /** Copy lines the creator changed (field paths). They are asked about before regenerating. */
  editedFields: string[];
  recommendation: { style: PresentationStyle; reason: string } | null;
  /** The question set the words were written for; a change in Build refreshes them. */
  questionsSig: string;
  /** Varies the demo gamifier's wording on Rewrite and Regenerate. */
  seed: number;
  engine: "demo" | "claude";
};

export type DraftAi = {
  engine: "demo" | "claude";
  shaper: ShaperOutput;
  bias: BiasOutput;
  rules: RulesReport;
  createdAt: number;
};

export type Section = "build" | "style" | "publish" | "results" | "themes" | "dashboard" | "responses" | "ask" | "report";
