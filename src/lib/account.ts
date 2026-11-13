"use client";

/**
 * Accounts (UI_UX_LAYOUT.md A1, A2, X1). PROTOTYPE: until the backend exists, accounts live in
 * this browser. Passwords are never stored: only a salted PBKDF2-SHA-256 hash. When the API
 * exists, signUp / logIn / update become calls with the same shapes, and this file goes away.
 */
import { useSyncExternalStore } from "react";

export type Role = "business" | "researcher" | "community" | "analyst";
export const ROLES: { value: Role; label: string; about: string }[] = [
  { value: "business", label: "Startup or business", about: "Customer feedback, product ideas, pricing" },
  { value: "researcher", label: "Student or academic researcher", about: "Studies with clear research questions" },
  { value: "community", label: "College, club or NGO", about: "Events, volunteers, members" },
  { value: "analyst", label: "Analyst", about: "Reading results and building dashboards" },
];
export const GOALS = ["Customer feedback", "Product idea", "Event feedback", "Research study", "Something else"] as const;

export type Profile = { name: string; role: Role | null; goal: string | null; goalNote: string; org: string; onboarded: boolean };
type Account = Profile & { email: string; salt: string; hash: string; createdAt: number };
type Store = { accounts: Account[]; session: string | null; guest: Profile };

const KEY = "playsurvey:accounts";
const EMPTY_PROFILE: Profile = { name: "", role: null, goal: null, goalNote: "", org: "", onboarded: false };

function read(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Store>) : {};
    return { accounts: parsed.accounts ?? [], session: parsed.session ?? null, guest: { ...EMPTY_PROFILE, ...parsed.guest } };
  } catch {
    return { accounts: [], session: null, guest: EMPTY_PROFILE };
  }
}

let cache: Store | null = null;
const listeners = new Set<() => void>();
const get = () => (cache ??= read());
function set(next: Store) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the session lasts for this visit.
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: 120_000 }, key, 256);
  return hex(bits);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const nameFromEmail = (email: string) => {
  const local = email.split("@")[0].split(/[._-]/)[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
};
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export const account = {
  async signUp(email: string, password: string): Promise<{ ok: true } | { ok: false; error: "exists" }> {
    const e = email.trim().toLowerCase();
    const s = get();
    if (s.accounts.some((a) => a.email === e)) return { ok: false, error: "exists" };
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const hash = await hashPassword(password, salt);
    // A guest's onboarding choices carry over to the new account.
    const acct: Account = { ...s.guest, name: s.guest.name || nameFromEmail(e), email: e, salt, hash, createdAt: Date.now() };
    set({ ...get(), accounts: [...get().accounts, acct], session: e });
    return { ok: true };
  },
  async logIn(email: string, password: string): Promise<boolean> {
    const e = email.trim().toLowerCase();
    const a = get().accounts.find((x) => x.email === e);
    // Hash even when there's no such account, so both failures take the same time.
    const hash = await hashPassword(password, a?.salt ?? "no-such-account");
    if (!a || hash !== a.hash) return false;
    set({ ...get(), session: e });
    return true;
  },
  logOut() {
    set({ ...get(), session: null });
  },
  /** Profile changes for the signed-in creator, or the guest when signed out. */
  update(patch: Partial<Profile>) {
    const s = get();
    if (s.session) set({ ...s, accounts: s.accounts.map((a) => (a.email === s.session ? { ...a, ...patch } : a)) });
    else set({ ...s, guest: { ...s.guest, ...patch } });
  },
};

export type Me = Profile & { email: string | null; signedIn: boolean };
const GUEST_NAME = "Demo creator";
let meCache: { store: Store; me: Me } | null = null;
function me(): Me {
  const s = get();
  if (meCache?.store === s) return meCache.me;
  const a = s.session ? s.accounts.find((x) => x.email === s.session) : undefined;
  const value: Me = a
    ? { name: a.name, role: a.role, goal: a.goal, goalNote: a.goalNote, org: a.org, onboarded: a.onboarded, email: a.email, signedIn: true }
    : { ...s.guest, name: s.guest.name || GUEST_NAME, email: null, signedIn: false };
  meCache = { store: s, me: value };
  return value;
}

/** The signed-in creator (or the demo guest); null while rendering on the server. */
export function useMe(): Me | null {
  return useSyncExternalStore(subscribe, me, () => null);
}

/** Where to go after logging in (?next=…). Only Studio pages, so the link can't send people elsewhere. */
export function safeNext(value: string | null | undefined): string | null {
  return value && /^\/app(\/[\w\-/?=&%.]*)?$/.test(value) && !value.startsWith("//") ? value : null;
}
