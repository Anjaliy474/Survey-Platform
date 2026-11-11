/**
 * Request and response shapes for the AI stages, copied from combined.system.txt.
 * question_shaper turns a brief into a proposed question set; bias_checker reviews it.
 */
import type { Question } from "@/lib/player/types";

export type ShaperMode = "describe_research" | "bring_questions" | "quick_prompt";
export type ShaperStatus = "ready" | "needs_clarification" | "conflict" | "declined_with_alternative";

/** What the start pages send. Numbers here come from the creator, not the AI. */
export type SurveyRequest = {
  mode: ShaperMode;
  /** Pasted questions, the decision to inform, or the one-line prompt. */
  input: string;
  context: {
    audience: string;
    /** The decision the survey should inform (optional when bringing questions). */
    decision: string;
    known: string;
    anonymous: boolean;
    sensitive: boolean;
    /** null = no limit */
    time_limit_seconds: number | null;
  };
};

export type ChangeAction = "new" | "kept" | "rewritten" | "split" | "converted" | "flagged_duplicate";

export type ShapedQuestion = Question & {
  reason: string;
  maps_to_decision: string;
  change: { action: ChangeAction; source_id: string; before: string; why: string };
};

export type ShaperOutput = {
  mode: ShaperMode;
  status: ShaperStatus;
  summary_for_creator: string;
  decisions_informed: string[];
  assumptions: string[];
  clarifying_questions: string[];
  conflict_explanation: string;
  declined: { request: string; reason: string };
  purpose_line: string;
  consent_line: string;
  questions: ShapedQuestion[];
  cut_questions: { source_id: string; text: string; reason: string; suggested_home: "optional_section" | "later_pulse" | "drop" }[];
  notes_for_creator: string[];
  flags: string[];
};

export type BiasCategory =
  | "leading"
  | "loaded"
  | "presumptive"
  | "double_barrelled"
  | "unbalanced_scale"
  | "incomplete_options"
  | "overlapping_options"
  | "absolute_wording"
  | "ambiguous"
  | "social_desirability"
  | "sensitive_not_optional"
  | "order_effect"
  | "acquiescence"
  | "one_sided_set";

export type BiasFinding = {
  id: string;
  scope: "item" | "set";
  related_ids: string[];
  category: BiasCategory;
  severity: "critical" | "major" | "minor";
  confidence: "high" | "medium" | "low";
  location: "text" | "options" | "scale" | "order";
  evidence: string;
  explanation: string;
  suggested_fix: {
    text: string;
    options: string[];
    scale: { points: number; min_label: string; max_label: string } | null;
    split_into: string[];
  };
};

export type BiasOutput = {
  items_reviewed: { id: string; verdict: "clear" | "flagged" }[];
  findings: BiasFinding[];
  overall_note: string;
  flags: string[];
};

/** Rules-engine report, computed in code (never by the AI). */
export type RulesReport = {
  questionCount: number;
  countState: "ok" | "warning" | "blocked";
  seconds: number;
  timeLimitSeconds: number | null;
  fitsTime: boolean;
  openCount: number;
  openLastAndOptional: boolean;
  personalDataIds: string[];
  consentNeeded: boolean;
  consentPresent: boolean;
  problems: string[];
};

export type ShapeStage = "reading" | "shaping" | "bias" | "rules";

/** One line of the /api/ai/shape stream (newline-delimited JSON). */
export type ShapeEvent =
  | { type: "stage"; stage: ShapeStage }
  | { type: "result"; engine: "demo" | "claude"; shaper: ShaperOutput; bias: BiasOutput; rules: RulesReport }
  | { type: "error"; message: string };
