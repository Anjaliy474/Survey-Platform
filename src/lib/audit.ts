"use client";

/**
 * The deletion log (UI_UX_LAYOUT.md X1: "Deletions are logged"). On this device until the backend
 * exists, where it becomes an append-only audit table. It records what was deleted and when,
 * never the deleted answers themselves.
 */
import { useSyncExternalStore } from "react";

export type AuditEntry = { at: number; what: string };
const KEY = "playsurvey:audit";
const EMPTY: AuditEntry[] = [];
let cache: AuditEntry[] | null = null;
const listeners = new Set<() => void>();

function get(): AuditEntry[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as AuditEntry[];
  } catch {
    cache = [];
  }
  return cache;
}

export function logDeletion(what: string) {
  cache = [{ at: Date.now(), what }, ...get()].slice(0, 200);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked: the entry stays for this visit.
  }
  listeners.forEach((l) => l());
}

export function useAuditLog(): AuditEntry[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get,
    () => EMPTY,
  );
}
