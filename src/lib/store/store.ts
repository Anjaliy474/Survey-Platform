import { randomBytes } from "node:crypto";
import type { Answer, ResponseRecord, StoryEvent, Survey } from "@/lib/survey/types";

/** One storage interface; Supabase in production, a local JSON file in development. */
export interface SurveyStore {
  createSurvey(s: Survey): Promise<Survey>;
  getSurvey(id: string): Promise<Survey | null>;
  getSurveyBySlug(slug: string): Promise<Survey | null>;
  listSurveys(): Promise<Survey[]>;
  updateSurvey(id: string, patch: Partial<Survey>): Promise<Survey>;
  startResponse(r: ResponseRecord): Promise<ResponseRecord>;
  getResponse(id: string): Promise<ResponseRecord | null>;
  saveAnswer(responseId: string, questionId: string, answer: Answer): Promise<void>;
  markSwitched(responseId: string): Promise<void>;
  /** Idempotent: a second call returns the first completion unchanged. */
  completeResponse(responseId: string, enjoyment: number | null): Promise<ResponseRecord>;
  listResponses(surveyId: string): Promise<ResponseRecord[]>;
  logEvent(e: StoryEvent): Promise<void>;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
function random(n: number): string {
  const bytes = randomBytes(n);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${random(6)}`;
}

export function newSlug(title: string): string {
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "survey";
  return `${base}-${random(4)}`;
}

export class NotFoundError extends Error {}
