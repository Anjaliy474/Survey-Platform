"use client";

/**
 * The creator's surveys. Until the backend exists they live in this browser (localStorage),
 * seeded with sample surveys; every action below becomes an API call later, with the same shape.
 */
import { useSyncExternalStore } from "react";
import type { StudioSurvey } from "./types";

const KEY = "playsurvey:studio";
const VERSION = 1;
const DAY = 24 * 60 * 60 * 1000;

export type StudioState = { status: "ready"; surveys: StudioSurvey[] } | { status: "error" };

const closed = (n: number) => Array.from({ length: n }, () => ({ open: false }));

function seed(now: number): StudioSurvey[] {
  return [
    {
      id: "cafe-feedback",
      slug: "cafe-feedback",
      title: "Tell us about your visit",
      status: "live",
      step: "publish",
      questions: [...closed(5), { open: true }],
      stats: { started: 412, finished: 371, lastSevenDays: [38, 52, 61, 47, 55, 64, 54] },
      createdAt: now - 9 * DAY,
      updatedAt: now - 7 * DAY,
      closedAt: null,
    },
    {
      id: "volunteer-feedback",
      slug: "volunteer-feedback",
      title: "Sunday’s tree-plantation drive",
      status: "live",
      step: "publish",
      questions: [...closed(6), { open: true }],
      stats: { started: 17, finished: 14, lastSevenDays: [0, 0, 0, 0, 3, 6, 5] },
      createdAt: now - 4 * DAY,
      updatedAt: now - 3 * DAY,
      closedAt: null,
    },
    {
      id: "fest-food",
      slug: null,
      title: "Fest food stalls feedback",
      status: "draft",
      step: "style",
      questions: [...closed(7), { open: true }],
      stats: null,
      createdAt: now - 2 * DAY,
      updatedAt: now - 1 * DAY,
      closedAt: null,
    },
    {
      id: "laundry-pickup",
      slug: null,
      title: "Would students pay for laundry pickup?",
      status: "draft",
      step: "build",
      questions: closed(6),
      stats: null,
      createdAt: now - 1 * DAY,
      updatedAt: now - 2 * 60 * 60 * 1000,
      closedAt: null,
    },
    {
      id: "canteen-menu-poll",
      slug: "canteen-menu-poll",
      title: "Canteen menu poll",
      status: "closed",
      step: "publish",
      questions: closed(5),
      stats: { started: 160, finished: 142, lastSevenDays: [0, 0, 0, 0, 0, 0, 0] },
      createdAt: now - 40 * DAY,
      updatedAt: now - 20 * DAY,
      closedAt: now - 20 * DAY,
    },
  ];
}

const listeners = new Set<() => void>();
let cache: StudioState | null = null;

function write(surveys: StudioSurvey[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ v: VERSION, surveys }));
  } catch {
    // Storage blocked: changes still apply for this visit.
  }
}

function load(): StudioState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const surveys = seed(Date.now());
      write(surveys);
      return { status: "ready", surveys };
    }
    const parsed = JSON.parse(raw);
    if (parsed?.v !== VERSION || !Array.isArray(parsed.surveys)) throw new Error("Unexpected data");
    return { status: "ready", surveys: parsed.surveys };
  } catch {
    return { status: "error" };
  }
}

const emit = () => listeners.forEach((l) => l());
const getSnapshot = (): StudioState => (cache ??= load());

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(change: (surveys: StudioSurvey[]) => StudioSurvey[]) {
  const current = getSnapshot();
  const surveys = change(current.status === "ready" ? current.surveys : []);
  cache = { status: "ready", surveys };
  write(surveys);
  emit();
}

const newId = () => `s-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

export const studio = {
  /** Read again from storage (the error state's Retry). */
  reload() {
    cache = null;
    emit();
  },
  /** Put the sample surveys back (demo only). */
  restoreSamples() {
    update(() => seed(Date.now()));
  },
  duplicate(id: string): StudioSurvey | null {
    const s = getSnapshot();
    const original = s.status === "ready" ? s.surveys.find((x) => x.id === id) : undefined;
    if (!original) return null;
    const now = Date.now();
    const copy: StudioSurvey = {
      ...original,
      id: newId(),
      slug: null,
      title: `${original.title} (copy)`,
      status: "draft",
      step: "build",
      stats: null,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    };
    update((list) => [copy, ...list]);
    return copy;
  },
  close(id: string) {
    const now = Date.now();
    update((list) => list.map((x) => (x.id === id ? { ...x, status: "closed", closedAt: now, updatedAt: now } : x)));
  },
  reopen(id: string) {
    update((list) => list.map((x) => (x.id === id ? { ...x, status: "live", closedAt: null } : x)));
  },
  remove(id: string) {
    update((list) => list.filter((x) => x.id !== id));
  },
};

/** null while rendering on the server (the page shows skeletons until the browser reads storage). */
export function useStudio(): StudioState | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
