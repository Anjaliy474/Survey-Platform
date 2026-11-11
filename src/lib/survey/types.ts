/**
 * Domain types for surveys, Story Mode worlds and responses.
 * AI output shapes mirror the stage schemas in combined.system.txt; the zod schemas
 * here are the gate every AI response passes before the app uses it.
 */
import { z } from "zod";

export const QUESTION_TYPES = [
  "single_choice",
  "multi_choice",
  "rating_scale",
  "nps_0_10",
  "yes_no",
  "number_band",
  "short_text",
  "long_text",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const MECHANICS = [
  "tap_chips_single",
  "tap_chips_multi",
  "this_or_that",
  "segmented_scale",
  "emoji_scale",
  "number_row_11",
  "text_box",
] as const;
export type Mechanic = (typeof MECHANICS)[number];

export const FORMATS = ["journey_map", "stations_room", "chat_story"] as const;
export type Format = (typeof FORMATS)[number];
export const LOOKS = ["clay", "paper_cut"] as const;
export type Look = (typeof LOOKS)[number];
export const MOODS = ["cosy", "adventure", "festive", "space", "nature", "retro", "everyday_india"] as const;
export type Mood = (typeof MOODS)[number];
export const LEVELS = ["light", "medium", "full"] as const;
export type PlayfulLevel = (typeof LEVELS)[number];

/* ---------------- Question shaper ---------------- */

export const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  type: z.enum(QUESTION_TYPES),
  options: z.array(z.string()),
  scale: z.object({ points: z.number().int(), min_label: z.string(), max_label: z.string() }).nullable(),
  required: z.boolean(),
  sensitive: z.boolean(),
  collects_personal_data: z.boolean(),
  role: z.string(),
  reason: z.string(),
  maps_to_decision: z.string(),
  change: z.object({ action: z.string(), source_id: z.string(), before: z.string(), why: z.string() }),
  maxPicks: z.number().int().positive().optional(),
});
export type Question = z.infer<typeof questionSchema>;

export const questionSetSchema = z.object({
  status: z.string(),
  summary_for_creator: z.string(),
  decisions_informed: z.array(z.string()),
  assumptions: z.array(z.string()),
  purpose_line: z.string(),
  consent_line: z.string(),
  questions: z.array(questionSchema).min(1),
  notes_for_creator: z.array(z.string()),
  flags: z.array(z.string()),
});
export type QuestionSet = z.infer<typeof questionSetSchema>;

/* ---------------- Bias checker ---------------- */

export const biasReportSchema = z.object({
  items_reviewed: z.array(z.object({ id: z.string(), verdict: z.enum(["clear", "flagged"]) })),
  findings: z.array(
    z.object({
      id: z.string(),
      scope: z.enum(["item", "set"]),
      related_ids: z.array(z.string()),
      category: z.string(),
      severity: z.enum(["critical", "major", "minor"]),
      confidence: z.enum(["high", "medium", "low"]),
      location: z.string(),
      evidence: z.string(),
      explanation: z.string(),
      suggested_fix: z.object({
        text: z.string(),
        options: z.array(z.string()),
        split_into: z.array(z.string()),
      }),
    }),
  ),
  overall_note: z.string(),
  flags: z.array(z.string()),
});
export type BiasReport = z.infer<typeof biasReportSchema>;

/* ---------------- Gamifier (style fixed to one_per_screen) ---------------- */

export const gamifierItemSchema = z.object({
  question_id: z.string(),
  mechanic: z.enum(MECHANICS),
  lead_in: z.string(),
  feedback_after_answer: z.string(),
  helper_text: z.string(),
});
export type GamifierItem = z.infer<typeof gamifierItemSchema>;

export const gamifierSchema = z.object({
  intro: z.object({ title: z.string(), start_button: z.string() }),
  items: z.array(gamifierItemSchema),
  milestones: z.array(z.object({ after_question_id: z.string(), copy: z.string() })),
  closing: z.object({ thank_you: z.string(), enjoyment_prompt: z.string(), reveal_teaser: z.string() }),
  reveal: z.object({ question_ids: z.array(z.string()), intro_copy: z.string() }),
  notes_for_creator: z.array(z.string()),
  flags: z.array(z.string()),
});
export type Gamifier = z.infer<typeof gamifierSchema>;

/* ---------------- World builder (spec §7) ---------------- */

export const chapterSchema = z.object({
  chapter_id: z.string(),
  title: z.string(),
  question_ids: z.array(z.string()),
  scene_id: z.string(),
  intro_line: z.string(),
  interlude_line: z.string(),
});
export type Chapter = z.infer<typeof chapterSchema>;

export const storyItemSchema = z.object({
  question_id: z.string(),
  slot: z.string(),
  prop_family: z.string(),
  acknowledgement: z.string(),
});
export type StoryItem = z.infer<typeof storyItemSchema>;

export const endingSchema = z.object({ scene_id: z.string(), line: z.string(), postcard_title: z.string() });
export type Ending = z.infer<typeof endingSchema>;

export const worldSpecSchema = z.object({
  mode: z.enum(["create", "edit_chapter"]),
  world: z.object({
    title: z.string(),
    premise: z.string(),
    template: z.enum(FORMATS),
    mood: z.enum(MOODS),
    look: z.enum(LOOKS),
    narrator_voice: z.string(),
  }),
  prologue: z.string(),
  chapters: z.array(chapterSchema).min(1),
  items: z.array(storyItemSchema),
  ending: endingSchema,
  notes_for_creator: z.array(z.string()),
  flags: z.array(z.string()),
});
export type WorldSpec = z.infer<typeof worldSpecSchema>;

/* ---------------- Studio and responses ---------------- */

export type QuickPicks = {
  concept: string;
  audience: string;
  ageBand: "13+" | "18+";
  format: Format;
  mood: Mood;
  look: Look;
  level: PlayfulLevel;
  brandColor: string | null;
  logoDataUrl: string | null;
  timeLimitSec: number | null;
};

export type SurveyStatus = "draft" | "live";

export type Survey = {
  id: string;
  slug: string;
  status: SurveyStatus;
  picks: QuickPicks;
  questionSet: QuestionSet | null;
  questionsApproved: boolean;
  bias: BiasReport | null;
  gamifier: Gamifier | null;
  world: WorldSpec | null;
  worldAccepted: boolean;
  splitAB: boolean;
  prepared: boolean;
  createdAt: string;
  publishedAt: string | null;
};

export type Arm = "story" | "plain";
export type Answer = number | number[] | string | null;

export type ResponseRecord = {
  id: string;
  surveyId: string;
  arm: Arm;
  switchedToPlain: boolean;
  answers: Record<string, Answer>;
  startedAt: string;
  completedAt: string | null;
  enjoyment: number | null;
  visitorId: string;
};

export type StoryEventType = "story_chapter_viewed" | "story_skip_prologue" | "story_switch_plain" | "story_sound_on";

export type StoryEvent = {
  surveyId: string;
  responseId: string;
  type: StoryEventType;
  at: string;
  data?: Record<string, string | number>;
};
