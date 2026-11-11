"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { DemoAnswers } from "./demo-poll";

/** Live media-query match without effects (false during server rendering). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Mouse or trackpad: drag toys, tilt cards and parallax only happen here. */
export function useFinePointer(): boolean {
  return useMediaQuery("(hover: hover) and (pointer: fine)");
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/* ---- The visitor's submitted demo poll, shared with the creator view ---- */

let submitted: DemoAnswers | null = null;
const listeners = new Set<() => void>();

export const submittedPoll = {
  set(answers: DemoAnswers | null) {
    submitted = answers;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useSubmittedPoll(): DemoAnswers | null {
  return useSyncExternalStore(
    submittedPoll.subscribe,
    () => submitted,
    () => null,
  );
}
