import path from "node:path";
import { LocalStore } from "./local-store";
import type { SurveyStore } from "./store";
import { SupabaseStore } from "./supabase-store";

export type { SurveyStore } from "./store";
export { NotFoundError, newId, newSlug } from "./store";

let store: SurveyStore | null = null;

/** Supabase when its env vars are set, otherwise a local JSON file at .data/store.json. */
export function getStore(): SurveyStore {
  if (store) return store;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  store =
    url && key ? new SupabaseStore(url, key) : new LocalStore(path.join(process.cwd(), ".data", "store.json"));
  return store;
}

export function storeKind(): "supabase" | "local" {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local";
}
