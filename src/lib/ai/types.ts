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

/* ---------------- theme_extractor (combined.system.txt) ---------------- */

export type Sentiment = "positive" | "negative" | "neutral" | "mixed";
export type CodeStatus = "coded" | "minority" | "no_content" | "off_topic" | "flagged";
export type ThemeFlagType = "suspected_manipulation" | "personal_data" | "abusive" | "spam" | "duplicate";

export type Theme = {
  theme_id: string;
  label: string;
  description: string;
  quotes: { response_id: string; text: string }[];
};

export type ThemeOutput = {
  question_id: string;
  mode: "discover" | "apply_codebook";
  themes: Theme[];
  assignments: { response_id: string; theme_ids: string[]; sentiment: Sentiment; status: CodeStatus }[];
  minority_mentions: { response_id: string; note: string; quote: string }[];
  candidate_new_themes: { label: string; description: string; response_ids: string[] }[];
  flags: { response_id: string; type: ThemeFlagType; note: string }[];
  coding_notes: string[];
};

export type ThemeRequest = {
  question: { id: string; text: string };
  mode: "discover" | "apply_codebook";
  responses: { id: string; text: string }[];
  codebook?: Pick<Theme, "theme_id" | "label" | "description">[];
};

/* ---------------- dashboard_spec (combined.system.txt) ---------------- */

export type FieldType = "nominal" | "ordinal_scale" | "nps" | "multi_choice" | "numeric" | "date" | "themes" | "personal";
export type SchemaField = { field: string; label: string; type: FieldType; question?: string; options?: string[] };
export type ChartType = "bar" | "grouped_bar" | "stacked_bar_100" | "diverging_likert" | "histogram" | "line" | "kpi_tile" | "table";
export type Aggregate = "count" | "share" | "mean" | "median" | "nps" | "mentions";
export type DashCaveat = "few_periods" | "small_group" | "ordinal_mean" | "multi_select" | "flagged_responses_included" | "convenience_sample";

export type DashChart = {
  chart_id: string;
  title: string;
  answers_question: string;
  type: ChartType;
  x: { field: string; time_grain: "none" | "day" | "week" | "month"; sort: "natural" | "value_desc" };
  measure: { aggregate: Aggregate; field: string | null };
  group_by: string | null;
  show_n: boolean;
  show_uncertainty: boolean;
  caveats: DashCaveat[];
};

export type Dashboard = {
  title: string;
  description: string;
  filters: { field: string; control: "dropdown" | "multi_select" | "date_range" }[];
  charts: DashChart[];
  dashboard_caveats: DashCaveat[];
};

export type DashboardSpec = {
  mode: "create" | "edit";
  dashboard: Dashboard;
  request_mapping: { requested: string; outcome: "fulfilled" | "adapted" | "declined"; chart_ids: string[]; explanation: string }[];
  questions_for_analyst: string[];
  flags: string[];
};

export type DashboardRequest = {
  mode: "create" | "edit";
  request: string;
  schema: { fields: SchemaField[]; date_periods_available: number };
  current?: Dashboard;
};

/* ---------------- chat_with_data (combined.system.txt) ---------------- */

export type AskCaveat = "small_group" | "flagged_responses" | "association_not_causation" | "convenience_sample" | "few_periods" | "not_in_survey";
export type AskAnswer = {
  answer: string;
  interpretation_used: string;
  evidence: { tool: "run_query" | "get_theme_summary" | "search_responses"; call_id: string; used_for: string }[];
  quotes: { response_id: string; text: string }[];
  caveats: AskCaveat[];
  flagged_responses: { response_id: string; reason: string }[];
  suggested_chart: DashChart | null;
  follow_up_suggestions: string[];
  declined: { request: string; reason: string };
};

/* ---------------- insight_report (combined.system.txt) ---------------- */

export type Reader = "creator" | "analyst" | "leadership";
export type Level = "high" | "medium" | "low";
export type Finding = {
  finding_id: string;
  title: string;
  statement: string;
  evidence_type: "observed" | "association" | "model_based";
  evidence_ids: string[];
  who_it_affects: string;
  counter_evidence: string;
  interpretation: { hypothesis: string; how_to_test: string };
  practical_importance: string;
  implication: string;
  confidence: Level;
  confidence_reason: string;
  chart: DashChart | null;
};
export type ReportOutput = {
  reader: Reader;
  headline: string;
  executive_summary: { finding_id: string; statement: string; evidence_ids: string[] }[];
  decision_answers: { decision: string; what_the_data_says: string; finding_ids: string[]; confidence: Level }[];
  data_quality: { summary: string; evidence_ids: string[]; could_change_conclusions: string };
  findings: Finding[];
  segments: { status: "available" | "not_run"; note: string; profiles: { name: string; description: string; evidence_ids: string[] }[] };
  say_vs_do_gaps: { statement: string; evidence_ids: string[] }[];
  contradictions_and_surprises: { statement: string; evidence_ids: string[] }[];
  minority_views: { statement: string; quote: { response_id: string; text: string } }[];
  priorities: { finding_id: string; frequency: Level; severity: Level; evidence_strength: Level; feasibility: Level | "unknown"; why_this_rank: string }[];
  recommendations: { horizon: "now" | "next" | "later"; action: string; finding_ids: string[]; metric_to_watch: string }[];
  limitations: string[];
  unanswered_questions: { question: string; why_it_matters: string; suggested_survey_question: string }[];
  flags: string[];
};
