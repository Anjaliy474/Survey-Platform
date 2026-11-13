import { cafe } from "./cafe";
import { fest } from "./fest";
import { laundry } from "./laundry";
import type { Prepared } from "./types";

export type { Prepared } from "./types";

export const PREPARED: Record<Prepared["key"], Prepared> = { fest, cafe, laundry };

export function findPrepared(concept: string): Prepared | null {
  return Object.values(PREPARED).find((p) => p.match.test(concept)) ?? null;
}
