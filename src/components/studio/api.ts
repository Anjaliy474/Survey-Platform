"use client";

import type { ValidationFailure } from "@/lib/story/validate-world";
import type { Comparison } from "@/lib/survey/compare";
import type { QuickPicks, Survey } from "@/lib/survey/types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function call<T>(url: string, method = "GET", body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as T & { error?: string };
    if (!res.ok) return { ok: false, status: res.status, error: data.error ?? "Something went wrong. Try again." };
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0, error: "We couldn't reach the server. Check your connection and try again." };
  }
}

type SurveyBody = { survey: Survey; storyBlocked?: boolean; sensitiveHint?: boolean };
type WorldBody = { survey: Survey; failures: ValidationFailure[]; prepared?: boolean };

export const studioApi = {
  list: () => call<{ surveys: Survey[] }>("/api/surveys"),
  create: (picks: Partial<QuickPicks>) => call<SurveyBody>("/api/surveys", "POST", { picks }),
  get: (id: string) => call<SurveyBody>(`/api/surveys/${id}`),
  patch: (id: string, patch: Record<string, unknown>) => call<SurveyBody>(`/api/surveys/${id}`, "PATCH", patch),
  buildWorld: (id: string) => call<WorldBody>(`/api/surveys/${id}/world`, "POST"),
  editWorld: (id: string, body: Record<string, unknown>) => call<WorldBody>(`/api/surveys/${id}/world`, "PATCH", body),
  publish: (id: string, splitAB: boolean) => call<{ survey: Survey; url: string }>(`/api/surveys/${id}/publish`, "POST", { splitAB }),
  results: (id: string) =>
    call<{ total: number; completed: number; splitAB: boolean; comparison: Comparison }>(`/api/surveys/${id}/results`),
};

export function surveyName(s: Survey): string {
  return s.world?.world.title || s.picks.concept;
}

/** Where a survey is in the create flow, for the step rail and the Home cards. */
export function surveyStep(s: Survey, storyBlocked = false): "questions" | "story" | "publish" | "results" {
  if (s.status === "live") return "results";
  if (!s.questionsApproved) return "questions";
  if (!storyBlocked && !s.worldAccepted) return "story";
  return "publish";
}
