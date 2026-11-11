/**
 * Publish (UI_UX_LAYOUT.md S6, DESIGN.md §6.11): the checklist, the settings, and turning a
 * draft into the survey respondents get. Every check is code; nothing here is AI.
 */
import { formatDuration } from "@/lib/compute";
import type { PlayerSurvey, SurveySettings } from "@/lib/player/types";
import { hasPlaceholders, nextGate, openFindings, pendingCount, rulesFor } from "./builder";
import type { Section } from "./types";
import { lookToPlayer, styleGate, themeCheck } from "./style";
import type { PublishSettings, StudioSurvey } from "./types";

export type CheckRow = { key: string; label: string; ok: boolean; detail: string; fix: Section };

export const DEFAULT_PUBLISH: PublishSettings = { close: "never", closeDate: "", closeAfter: 100, onePerPerson: true };

export function publishChecklist(survey: StudioSurvey): CheckRow[] {
  const b = survey.builder;
  if (!b) return [{ key: "questions", label: "Questions approved", ok: false, detail: "Draft and approve your questions first.", fix: "build" }];
  const rules = rulesFor(b, survey.brief?.context.time_limit_seconds ?? null);
  const pending = pendingCount(b);
  const critical = openFindings(b).filter((f) => f.severity === "critical").length;
  const look = survey.look;
  const check = look ? themeCheck(look) : null;
  const style = styleGate(survey, look);
  const wordsOk = !!look?.gamified && style.reasons.every((r) => r.startsWith("Pick custom colours"));
  const withinLimits = rules.questionCount > 0 && rules.countState !== "blocked" && rules.openCount <= 2 && rules.openLastAndOptional;

  return [
    {
      key: "approved",
      label: "Every suggestion decided",
      ok: pending === 0 && b.conflictConfirmed,
      detail: pending ? `${pending} still waiting in Questions.` : b.conflictConfirmed ? "You approved every change." : "Confirm the core set in Questions.",
      fix: "build",
    },
    {
      key: "limits",
      label: "Questions within limits",
      ok: withinLimits,
      detail: withinLimits
        ? `${rules.questionCount} ${rules.questionCount === 1 ? "question" : "questions"} · about ${formatDuration(rules.seconds)} · open questions last and optional`
        : rules.questionCount === 0
          ? "Add at least one question."
          : rules.countState === "blocked"
            ? "Cut the survey to 15 questions or fewer."
            : "Keep open questions to 2, last and optional.",
      fix: "build",
    },
    {
      key: "placeholders",
      label: "Placeholders filled",
      ok: !hasPlaceholders(b),
      detail: hasPlaceholders(b) ? "Some text still has a [placeholder]." : "No [placeholders] left.",
      fix: "build",
    },
    {
      key: "bias",
      label: "No unresolved critical bias",
      ok: critical === 0,
      detail: critical ? `${critical} critical ${critical === 1 ? "flag" : "flags"} to fix or dismiss.` : "Nothing critical is open.",
      fix: "build",
    },
    {
      key: "consent",
      label: "Consent line present",
      ok: !rules.consentNeeded || rules.consentPresent,
      detail: !rules.consentNeeded ? "Not needed: no personal or sensitive questions." : rules.consentPresent ? "Shown on the welcome screen." : "Personal or sensitive questions need a consent line.",
      fix: "build",
    },
    {
      key: "words",
      label: "On-screen words ready",
      ok: wordsOk,
      detail: wordsOk ? "Every line is within its limits and neutral." : !look?.gamified ? "Open Style to write them." : (style.reasons.find((r) => !r.startsWith("Pick custom colours")) ?? ""),
      fix: "style",
    },
    {
      key: "contrast",
      label: "Theme contrast passes",
      ok: !check || check.ok,
      detail: !look ? "Pick a theme in Style." : check ? (check.ok ? "Your colours pass 4.5:1." : "Your custom colours are too hard to read.") : "Built-in themes always pass.",
      fix: "style",
    },
  ];
}

/** Every check passes, including the builder's own gate (kept in one place). */
export function readyToPublish(survey: StudioSurvey): boolean {
  if (!survey.builder || !survey.look) return false;
  const gate = nextGate(survey.builder, rulesFor(survey.builder, survey.brief?.context.time_limit_seconds ?? null));
  return gate.ok && publishChecklist(survey).every((r) => r.ok);
}

export function settingsProblem(p: PublishSettings, today: string): string | null {
  if (p.close === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.closeDate)) return "Pick the day the survey closes.";
    if (p.closeDate < today) return "Pick today or a later day.";
  }
  if (p.close === "count" && (!Number.isInteger(p.closeAfter) || p.closeAfter < 1 || p.closeAfter > 100000)) return "Enter a number of responses from 1 to 100,000.";
  return null;
}

export function toSurveySettings(p: PublishSettings): SurveySettings {
  const [y, m, d] = p.closeDate.split("-").map(Number);
  return {
    onePerPerson: p.onePerPerson,
    closeAt: p.close === "date" && y ? new Date(y, m - 1, d, 23, 59, 59).getTime() : null,
    closeAfter: p.close === "count" ? p.closeAfter : null,
    language: "en",
  };
}

/** A readable, unguessable-enough link: the title's words plus a short random tail. */
export function makeSlug(title: string, taken: Set<string>): string {
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .split("-")
      .slice(0, 5)
      .join("-") || "survey";
  for (;;) {
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (!taken.has(slug)) return slug;
  }
}

export function buildPublished(survey: StudioSurvey, slug: string, creatorName: string, settings: PublishSettings): PlayerSurvey {
  if (!survey.look) throw new Error("Style the survey before publishing");
  return { ...lookToPlayer(survey, survey.look, slug, creatorName), settings: toSurveySettings(settings) };
}
