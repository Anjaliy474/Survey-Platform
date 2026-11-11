/**
 * Style and gamify (UI_UX_LAYOUT.md S5): pure helpers for the Style page and for Publish.
 * Question wording, options and scales come from the builder untouched; this layer only picks
 * mechanics, the theme and the light copy around the questions (DESIGN.md rule 5).
 */
import { customTheme, type ThemeCheck } from "@/lib/contrast";
import { ALLOWED_MECHANICS, BANNED_WORDS, buildScreens, checkSurvey, revealEligible } from "@/lib/player/rules";
import type { Gamified, Mechanic, PlayerSurvey, PlayfulLevel, PresentationStyle, Question } from "@/lib/player/types";
import { currentQuestions } from "./builder";
import { defaultGamified, plainQuestions, toPlayerSurvey } from "./to-player";
import type { StudioSurvey, StyleSettings } from "./types";

export { revealEligible };

export const STYLE_INFO: Record<PresentationStyle, { label: string; about: string }> = {
  one_per_screen: { label: "One per screen", about: "One question at a time, big and tappable." },
  pages: { label: "Pages", about: "Short pages of 2 to 4 related questions." },
  chat: { label: "Chat", about: "Questions arrive like messages." },
  classic: { label: "Classic", about: "A plain form on one page." },
};

export const LEVEL_INFO: Record<PlayfulLevel, { label: string; about: string }> = {
  off: { label: "Off", about: "Neutral, professional words. Nothing after each answer." },
  light: { label: "Light", about: "Friendly words and a progress message now and then." },
  medium: { label: "Medium", about: "Warm, chatty words and the same short “Got it” after every answer." },
};

export const MECHANIC_LABEL: Record<Mechanic, string> = {
  tap_chips_single: "Tap one chip",
  tap_chips_multi: "Tap several chips",
  this_or_that: "This or that (2 big buttons)",
  segmented_scale: "Labelled scale",
  emoji_scale: "Emoji faces, with labels",
  number_row_11: "0 to 10 number row",
  text_box: "Text box",
};

/** Word limits from the gamifier's writing rules (combined.system.txt, DESIGN.md §6.10). */
export const WORD_LIMITS = {
  title: 8,
  start: 4,
  lead_in: 12,
  feedback: 5,
  milestone: 12,
  page: 12,
  thank_you: 20,
  enjoyment: 12,
  teaser: 20,
  reveal_intro: 12,
} as const;

export const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const EVALUATIVE =
  /\b(great|awesome|amazing|excellent|perfect|brilliant|wonderful|fantastic|good|nice|love|loved|right|wrong|correct|bad|sad|sorry|oops|wow|yay|oh no|well done|smart|wise|cool)\b|choice|pick|!/i;

/** Feedback must be identical whatever was chosen, and never praise or judge (DESIGN.md §6.10). */
export function feedbackWarning(text: string): string | null {
  if (!text.trim()) return null;
  if (/\b(if|when) you\b|\{\{(?!questions_left|time_left|respondent_count)/i.test(text)) return "Feedback must be the same for every answer.";
  if (EVALUATIVE.test(text)) return "Feedback must be the same for every answer. Keep it neutral, like “Got it” or “Noted, thanks”.";
  return null;
}

/** Numbers come from code: copy may use tokens, never typed numbers (combined.system.txt). */
export function numberWarning(text: string): string | null {
  return /\d/.test(text.replace(/\{\{[a-z_]+\}\}/g, "")) ? "Use {{questions_left}} or {{time_left}} instead of typing numbers." : null;
}

/** The mechanics a question may use: the library for its type, with the per-type limits. */
export function mechanicOptions(q: Question): Mechanic[] {
  return ALLOWED_MECHANICS[q.type].filter((m) => {
    if (m === "this_or_that" && q.type === "single_choice") return q.options.length === 2;
    if (m === "emoji_scale") return q.scale?.points === 5 && /satisf|feel|happy|enjoy|mood|comfortable/i.test(q.text);
    return true;
  });
}

/** The builder's questions, as the Player and the gamifier see them (Q1…Qn). */
export function styleQuestions(survey: StudioSurvey): Question[] {
  return survey.builder ? plainQuestions(currentQuestions(survey.builder)) : [];
}

export const questionsSig = (questions: Question[]) =>
  questions.map((q) => `${q.id}|${q.type}|${q.text}|${q.options.join("/")}|${q.scale?.points ?? ""}|${q.sensitive ? 1 : 0}|${q.collects_personal_data ? 1 : 0}`).join("§");

export function initialLook(): StyleSettings {
  return {
    style: "one_per_screen",
    level: "light",
    theme: "marigold",
    custom: { bg: "#fff6e5", button: "#7a3cff" },
    shape: "round",
    gamified: null,
    editedFields: [],
    recommendation: null,
    questionsSig: "",
    seed: 0,
    engine: "demo",
  };
}

export function themeCheck(look: StyleSettings): ThemeCheck | null {
  return look.theme === "custom" ? customTheme(look.custom.bg, look.custom.button) : null;
}

/** Keep the creator's copy but re-cut the screens for a new style (the "Keep my edits" path). */
export function restyle(g: Gamified, questions: Question[], style: PresentationStyle, level: PlayfulLevel): Gamified {
  // An existing pages layout is kept when staying on Pages; any other move re-groups from scratch.
  const fake = { questions, gamified: g } as PlayerSurvey;
  const ids = buildScreens(fake, style);
  return {
    ...g,
    style,
    playful_level: level,
    screens: ids.map((question_ids, i) => ({ screen_id: `S${i + 1}`, question_ids, transition_copy: g.screens[i]?.transition_copy ?? "" })),
  };
}

/** After regenerating words, keep the creator's mechanic and reveal choices (they aren't words). */
export function keepChoices(next: Gamified, prev: Gamified | null, questions: Question[]): Gamified {
  if (!prev) return next;
  const byId = new Map(questions.map((q) => [q.id, q]));
  return {
    ...next,
    items: next.items.map((item) => {
      const before = prev.items.find((i) => i.question_id === item.question_id);
      const q = byId.get(item.question_id);
      if (!before || !q || !mechanicOptions(q).includes(before.mechanic)) return item;
      return { ...item, mechanic: before.mechanic, mechanic_params: before.mechanic_params };
    }),
    reveal: { ...next.reveal, question_ids: prev.reveal.question_ids.filter((id) => byId.has(id) && !revealEligible(byId.get(id)!)) },
  };
}

/* ---------- copy fields (the microcopy editor and Rewrite) ---------- */

export type CopyField =
  | { kind: "intro"; key: "title" | "start_button" }
  | { kind: "closing"; key: "thank_you" | "enjoyment_prompt" | "reveal_teaser" }
  | { kind: "reveal_intro" }
  | { kind: "item"; id: string; key: "lead_in" | "feedback_after_answer" }
  | { kind: "milestone"; index: number }
  | { kind: "page"; index: number };

export function fieldPath(f: CopyField): string {
  switch (f.kind) {
    case "intro":
    case "closing":
      return `${f.kind}.${f.key}`;
    case "reveal_intro":
      return "reveal.intro_copy";
    case "item":
      return `items.${f.id}.${f.key}`;
    case "milestone":
      return `milestones.${f.index}`;
    case "page":
      return `screens.${f.index}`;
  }
}

export function getField(g: Gamified, f: CopyField): string {
  switch (f.kind) {
    case "intro":
      return g.intro[f.key];
    case "closing":
      return g.closing[f.key];
    case "reveal_intro":
      return g.reveal.intro_copy;
    case "item":
      return g.items.find((i) => i.question_id === f.id)?.[f.key] ?? "";
    case "milestone":
      return g.milestones[f.index]?.copy ?? "";
    case "page":
      return g.screens[f.index]?.transition_copy ?? "";
  }
}

export function setField(g: Gamified, f: CopyField, value: string): Gamified {
  switch (f.kind) {
    case "intro":
      return { ...g, intro: { ...g.intro, [f.key]: value } };
    case "closing":
      return { ...g, closing: { ...g.closing, [f.key]: value } };
    case "reveal_intro":
      return { ...g, reveal: { ...g.reveal, intro_copy: value } };
    case "item":
      return { ...g, items: g.items.map((i) => (i.question_id === f.id ? { ...i, [f.key]: value } : i)) };
    case "milestone":
      return { ...g, milestones: g.milestones.map((m, i) => (i === f.index ? { ...m, copy: value } : m)) };
    case "page":
      return { ...g, screens: g.screens.map((s, i) => (i === f.index ? { ...s, transition_copy: value } : s)) };
  }
}

export function fieldLimit(f: CopyField): number {
  switch (f.kind) {
    case "intro":
      return f.key === "title" ? WORD_LIMITS.title : WORD_LIMITS.start;
    case "closing":
      return f.key === "thank_you" ? WORD_LIMITS.thank_you : f.key === "enjoyment_prompt" ? WORD_LIMITS.enjoyment : WORD_LIMITS.teaser;
    case "reveal_intro":
      return WORD_LIMITS.reveal_intro;
    case "item":
      return f.key === "lead_in" ? WORD_LIMITS.lead_in : WORD_LIMITS.feedback;
    case "milestone":
      return WORD_LIMITS.milestone;
    case "page":
      return WORD_LIMITS.page;
  }
}

/** Every copy line the Player will show for this style and level, in screen order. */
export function visibleFields(g: Gamified): CopyField[] {
  const playful = g.playful_level !== "off" && g.style !== "classic";
  const fields: CopyField[] = [{ kind: "intro", key: "title" }, { kind: "intro", key: "start_button" }];
  if (playful) {
    for (const item of g.items) {
      fields.push({ kind: "item", id: item.question_id, key: "lead_in" });
      if (g.playful_level === "medium") fields.push({ kind: "item", id: item.question_id, key: "feedback_after_answer" });
    }
    g.milestones.forEach((_, index) => fields.push({ kind: "milestone", index }));
  }
  if (g.style === "pages") g.screens.forEach((_, index) => index > 0 && fields.push({ kind: "page", index }));
  fields.push({ kind: "closing", key: "thank_you" }, { kind: "closing", key: "enjoyment_prompt" });
  if (g.reveal.question_ids.length) fields.push({ kind: "reveal_intro" });
  fields.push({ kind: "closing", key: "reveal_teaser" });
  return fields;
}

export function fieldProblem(f: CopyField, text: string): string | null {
  const words = wordCount(text);
  const limit = fieldLimit(f);
  if (words > limit) return `Keep it to ${limit} words or fewer.`;
  const required = f.kind === "intro" || (f.kind === "closing" && f.key !== "reveal_teaser") || f.kind === "reveal_intro";
  if (required && !text.trim()) return "This line can’t be empty.";
  if (BANNED_WORDS.test(text)) return "No points, prizes, scores or hurry words. They push people to rush or answer for a reward.";
  if (f.kind === "item" && f.key === "feedback_after_answer") return feedbackWarning(text);
  if (f.kind !== "intro") return numberWarning(text);
  return null;
}

/* ---------- the survey the Player gets ---------- */

export function lookToPlayer(survey: StudioSurvey, look: StyleSettings, slug: string, creatorName: string): PlayerSurvey {
  const questions = styleQuestions(survey);
  const check = themeCheck(look);
  return toPlayerSurvey({
    slug,
    title: survey.title,
    creatorName,
    theme: look.theme === "custom" ? "marigold" : look.theme,
    customTheme: check?.theme,
    shape: look.shape,
    purpose_line: survey.builder?.purpose_line ?? "",
    consent_line: survey.builder?.consent_line ?? "",
    questions,
    gamified: look.gamified ? forPlayer(look.gamified) : defaultGamified(questions, look.style, look.level),
  });
}

/** Drop copy this style and level don't show (kept in the look, so switching back restores it). */
function forPlayer(g: Gamified): Gamified {
  const playful = g.playful_level !== "off" && g.style !== "classic";
  return {
    ...g,
    items: g.items.map((i) => ({
      ...i,
      lead_in: playful ? i.lead_in : "",
      feedback_after_answer: playful && g.playful_level === "medium" ? i.feedback_after_answer : "",
    })),
  };
}

export type StyleGate = { ok: boolean; reasons: string[] };

/** "Next: Publish" needs the words written, every line within its limits, and the theme passing. */
export function styleGate(survey: StudioSurvey, look: StyleSettings | undefined): StyleGate {
  const reasons: string[] = [];
  if (!look?.gamified) return { ok: false, reasons: ["Wait for the on-screen words."] };
  const g = look.gamified;
  const bad = visibleFields(g).filter((f) => fieldProblem(f, getField(g, f))).length;
  if (bad) reasons.push(`Fix ${bad} on-screen ${bad === 1 ? "line" : "lines"}.`);
  const check = themeCheck(look);
  if (check && !check.ok) reasons.push("Pick custom colours that pass the contrast check.");
  const problems = checkSurvey(lookToPlayer(survey, look, "check", "check"));
  if (problems.length) reasons.push(`Fix the survey setup: ${problems[0]}`);
  return { ok: reasons.length === 0, reasons };
}
