"use client";

/**
 * Published surveys and their responses, on this device, until the backend exists.
 *
 * - Publishing in the Studio writes the PlayerSurvey snapshot here; `/s/:slug` reads it when
 *   the slug isn't one of the built-in samples. When the API exists, `publishLocal` becomes
 *   the publish call and `usePublished` a fetch; the shapes stay the same.
 * - Every submit adds a response here, so the Studio's Results pages have real answers to
 *   compute from. Responses carry only answers and timings (no names, no device ids).
 */
import { useSyncExternalStore } from "react";
import type { Answers, PlayerSurvey } from "./types";

const surveyKey = (slug: string) => `playsurvey:published:${slug}`;
const responsesKey = (slug: string) => `playsurvey:responses:${slug}`;

export type StoredResponse = {
  id: string;
  startedAt: number | null;
  submittedAt: number;
  answers: Answers;
  enjoyment: number | null;
};

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the survey still works for this visit.
  }
}

const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (!e.key?.startsWith("playsurvey:published:") && !e.key?.startsWith("playsurvey:responses:")) return;
    cache.delete(e.key);
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function cached<T>(key: string, fallback: T): T {
  if (!cache.has(key)) cache.set(key, read<T>(key) ?? fallback);
  return cache.get(key) as T;
}

function set(key: string, value: unknown) {
  cache.set(key, value);
  write(key, value);
  emit();
}

/* ---------- published surveys ---------- */

export function publishLocal(survey: PlayerSurvey) {
  set(surveyKey(survey.slug), survey);
}

export function setPublishedStatus(slug: string, status: PlayerSurvey["status"]) {
  const current = cached<PlayerSurvey | null>(surveyKey(slug), null);
  if (current) set(surveyKey(slug), { ...current, status });
}

export function unpublishLocal(slug: string) {
  cache.delete(surveyKey(slug));
  cache.delete(responsesKey(slug));
  try {
    window.localStorage.removeItem(surveyKey(slug));
    window.localStorage.removeItem(responsesKey(slug));
  } catch {
    // nothing to clean up
  }
  emit();
}

/** undefined while reading (server render), null when this device has no such survey. */
export function usePublished(slug: string): PlayerSurvey | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => cached<PlayerSurvey | null>(surveyKey(slug), null),
    () => undefined,
  );
}

/* ---------- responses ---------- */

const EMPTY: StoredResponse[] = [];

export function getResponses(slug: string): StoredResponse[] {
  return cached<StoredResponse[]>(responsesKey(slug), EMPTY);
}

export function recordResponse(slug: string, response: StoredResponse) {
  set(responsesKey(slug), [...getResponses(slug).filter((r) => r.id !== response.id), response]);
}

export function updateResponse(slug: string, id: string, patch: Partial<StoredResponse>) {
  const list = getResponses(slug);
  if (list.some((r) => r.id === id)) set(responsesKey(slug), list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

/** Replace every response at once (an imported spreadsheet). */
export function setResponses(slug: string, list: StoredResponse[]) {
  set(responsesKey(slug), list);
}

export function clearResponses(slug: string) {
  set(responsesKey(slug), EMPTY);
}

/** Responses on this device; an empty list on the server. */
export function useResponses(slug: string | null): StoredResponse[] {
  return useSyncExternalStore(
    subscribe,
    () => (slug ? getResponses(slug) : EMPTY),
    () => EMPTY,
  );
}

export const newResponseId = () => `R-${Date.now().toString(36).slice(-5).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;

/** A respondent's deletion request: remove one response for good. */
export function deleteResponse(slug: string, id: string) {
  set(responsesKey(slug), getResponses(slug).filter((r) => r.id !== id));
}
