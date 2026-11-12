/** Client-safe shapes the Player receives. No server imports here. */
import { percent, percentsSummingTo100 } from "@/lib/compute";
import { MIN_RESPONSES_FOR_REVEAL } from "@/lib/compute";
import { isOpen } from "./mechanics";
import type { Gamifier, Question, QuestionCore, QuickPicks, ResponseRecord, Survey, WorldSpec } from "./types";

export type PublicGamifier = Omit<Gamifier, "notes_for_creator" | "flags">;
export type PublicWorld = Omit<WorldSpec, "notes_for_creator" | "flags">;

export type PublicSurvey = {
  slug: string;
  status: Survey["status"];
  picks: Pick<QuickPicks, "format" | "look" | "mood" | "level" | "brandColor" | "logoDataUrl">;
  purposeLine: string;
  consentLine: string;
  questions: QuestionCore[];
  gamifier: PublicGamifier;
  world: PublicWorld | null;
  storyAllowed: boolean;
};

export type RevealData = {
  respondentCount: number;
  introCopy: string;
  questions: { questionId: string; text: string; multi: boolean; options: { label: string; pct: number; you: boolean }[] }[];
};

export function storyAllowed(s: Pick<Survey, "questionSet">): boolean {
  return !(s.questionSet?.questions ?? []).some((q) => q.sensitive);
}

export function toPublic(s: Survey): PublicSurvey {
  const set = s.questionSet!;
  const gamifier = { ...s.gamifier! } as Partial<Gamifier>;
  delete gamifier.notes_for_creator;
  delete gamifier.flags;
  let world: PublicWorld | null = null;
  if (storyAllowed(s) && s.world) {
    const w = { ...s.world } as Partial<WorldSpec>;
    delete w.notes_for_creator;
    delete w.flags;
    world = w as PublicWorld;
  }
  return {
    slug: s.slug,
    status: s.status,
    picks: {
      format: s.picks.format,
      look: s.picks.look,
      mood: s.picks.mood,
      level: s.picks.level,
      brandColor: s.picks.brandColor,
      logoDataUrl: s.picks.logoDataUrl,
    },
    purposeLine: set.purpose_line,
    consentLine: set.consent_line,
    questions: set.questions.map(publicQuestion),
    gamifier: gamifier as PublicGamifier,
    world,
    storyAllowed: storyAllowed(s),
  };
}

/** Only what the question looks like: never its reason, role, decision or edit history. */
export function publicQuestion(q: Question): QuestionCore {
  const core: QuestionCore = { id: q.id, text: q.text, type: q.type, options: q.options, scale: q.scale, required: q.required };
  if (q.maxPicks !== undefined) core.maxPicks = q.maxPicks;
  return core;
}

/** Option labels as respondents saw them: options, or numbered scale points with end labels. */
export function optionLabels(q: QuestionCore): string[] {
  if (q.type === "nps_0_10") return Array.from({ length: 11 }, (_, i) => String(i));
  if (q.type === "rating_scale") {
    const n = q.scale?.points ?? 5;
    return Array.from({ length: n }, (_, i) =>
      i === 0 ? (q.scale?.min_label ?? "1") : i === n - 1 ? (q.scale?.max_label ?? String(n)) : String(i + 1),
    );
  }
  return q.options;
}

/** The aggregate reveal: only with 20+ completed responses, at most 3 eligible closed questions. */
export function computeReveal(s: Survey, completed: ResponseRecord[], mine: ResponseRecord): RevealData | null {
  if (completed.length < MIN_RESPONSES_FOR_REVEAL || !s.gamifier || !s.questionSet) return null;
  const byId = new Map(s.questionSet.questions.map((q) => [q.id, q]));
  const eligible = s.gamifier.reveal.question_ids
    .map((id) => byId.get(id))
    .filter((q): q is Question => !!q && !isOpen(q) && !q.sensitive && !q.collects_personal_data)
    .slice(0, 3);
  return {
    respondentCount: completed.length,
    introCopy: s.gamifier.reveal.intro_copy.replace("{{respondent_count}}", completed.length.toLocaleString("en-US")),
    questions: eligible.map((q) => {
      const labels = optionLabels(q);
      const multi = q.type === "multi_choice";
      const counts = labels.map((_, i) =>
        completed.filter((r) => {
          const a = r.answers[q.id];
          return multi ? Array.isArray(a) && a.includes(i) : a === i;
        }).length,
      );
      const answered = completed.filter((r) => r.answers[q.id] !== undefined && r.answers[q.id] !== null).length;
      const pcts = multi ? counts.map((c) => percent(c, answered)) : percentsSummingTo100(counts);
      const my = mine.answers[q.id];
      return {
        questionId: q.id,
        text: q.text,
        multi,
        options: labels.map((label, i) => ({
          label,
          pct: pcts[i],
          you: multi ? Array.isArray(my) && my.includes(i) : my === i,
        })),
      };
    }),
  };
}
