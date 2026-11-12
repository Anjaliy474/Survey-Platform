import { tmpdir } from "node:os";
import path from "node:path";
import { LocalStore } from "./local-store";
import type { SurveyStore } from "./store";
import { SupabaseStore } from "./supabase-store";

export type { SurveyStore } from "./store";
export { NotFoundError, newId, newSlug } from "./store";

let store: SurveyStore | null = null;

/**
 * Supabase when its env vars are set, otherwise a local JSON file at .data/store.json.
 * On Vercel the project folder is read-only, so the fallback file lives in the temp folder:
 * it works for a quick look but does not persist. Deploys need Supabase.
 */
export function getStore(): SurveyStore {
  if (store) return store;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const file = process.env.VERCEL ? path.join(tmpdir(), "playsurvey-store.json") : path.join(process.cwd(), ".data", "store.json");
  store = url && key ? new SupabaseStore(url, key) : new LocalStore(file);
  return store;
}

export function storeKind(): "supabase" | "local" {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local";
}
