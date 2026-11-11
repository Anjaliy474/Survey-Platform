"use client";

/**
 * Where a respondent's progress lives. For now: this device (localStorage), saved after every
 * answer, so a refresh resumes and answers survive going offline. When the backend exists,
 * `saveAnswer`, `logEvent` and `submit` send the same data to the API (answers per question,
 * so partial completions count and drop-off is logged as events).
 */
import { useSyncExternalStore } from "react";
import type { Answer, Answers } from "./types";

export type Progress = {
  status: "new" | "answering" | "submitted";
  screen: number;
  answers: Answers;
  enjoyment: number | null;
  startedAt: number | null;
  submittedAt: number | null;
  /** Submitted while offline; to be sent when back online. */
  pendingSync: boolean;
};

export type PlayerEvent = { type: "start" | "answer" | "screen" | "submit"; at: number; questionId?: string; screen?: number };

const EMPTY: Progress = {
  status: "new",
  screen: 0,
  answers: {},
  enjoyment: null,
  startedAt: null,
  submittedAt: null,
  pendingSync: false,
};
const MAX_EVENTS = 300;

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: progress still works for this visit.
  }
}

function createStore(slug: string) {
  const key = `playsurvey:progress:${slug}`;
  const eventsKey = `playsurvey:events:${slug}`;
  const listeners = new Set<() => void>();
  let cache: Progress | null = null;

  const emit = () => listeners.forEach((l) => l());
  const get = (): Progress => (cache ??= safeRead(key, EMPTY));

  const store = {
    getSnapshot: get,
    getServerSnapshot: (): Progress => EMPTY,
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key !== key) return;
        cache = null;
        listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    update(change: (p: Progress) => Progress) {
      cache = change(get());
      safeWrite(key, cache);
      emit();
    },
    saveAnswer(questionId: string, answer: Answer) {
      store.update((p) => ({ ...p, answers: { ...p.answers, [questionId]: answer } }));
      store.logEvent({ type: "answer", questionId });
    },
    logEvent(event: Omit<PlayerEvent, "at">) {
      const events = safeRead<{ list: PlayerEvent[] }>(eventsKey, { list: [] }).list;
      safeWrite(eventsKey, { list: [...events, { ...event, at: Date.now() }].slice(-MAX_EVENTS) });
    },
    reset() {
      cache = { ...EMPTY };
      safeWrite(key, cache);
      emit();
    },
  };
  return store;
}

const stores = new Map<string, ReturnType<typeof createStore>>();

export function getProgressStore(slug: string) {
  let store = stores.get(slug);
  if (!store) {
    store = createStore(slug);
    stores.set(slug, store);
  }
  return store;
}

export function useProgress(slug: string) {
  const store = getProgressStore(slug);
  const progress = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { progress, store };
}

/* ---- Online status ---- */

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}
