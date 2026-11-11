"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Form state that survives refreshes and going back (UI_UX_LAYOUT.md S3a: "nothing is lost on
 * refresh"). Saved to localStorage on every change; the server render uses the initial value.
 */
const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function read<T>(key: string, initial: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value = initial;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) value = { ...initial, ...JSON.parse(raw) };
  } catch {
    // Unreadable or blocked storage: start from the initial value.
  }
  cache.set(key, value);
  return value;
}

export function writeDraft<T>(key: string, value: T) {
  cache.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  listeners.get(key)?.forEach((l) => l());
}

export function useLocalDraft<T extends object>(key: string, initial: T): [T, (patch: Partial<T>) => void] {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(listener);
      return () => {
        listeners.get(key)?.delete(listener);
      };
    },
    [key],
  );
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, initial),
    () => initial,
  );
  const update = useCallback((patch: Partial<T>) => writeDraft(key, { ...read(key, initial), ...patch }), [key, initial]);
  return [value, update];
}
