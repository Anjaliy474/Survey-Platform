/**
 * Sample responses for the demo poll, labelled "Sample data" wherever they appear.
 *
 * The records are generated with a seeded, integer-only random generator, so the server
 * render and every browser get exactly the same numbers. Every statistic on the landing
 * page is then computed from these records by code; none is typed in by hand.
 * Before launch these records are replaced by real anonymous responses.
 */
import { median } from "./compute";
import { DRINKS, FEELINGS, SNACKS, SNACK_LIMIT, SNACK_NONE, TIME_SLOTS, type PollStats } from "./demo-poll";

type SampleResponse = {
  slot: number;
  drink: number;
  feel: number | null;
  snacks: number[] | null;
  completed: boolean;
  seconds: number | null;
};

/** mulberry32: small seeded PRNG using integer maths only (deterministic everywhere). */
function seeded(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(rand: () => number, weights: readonly number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

// Generator settings. Group sizes are fixed so the "Late night" group stays small
// and shows the small-group flag (groups under 10).
const SLOT_SIZES = [402, 515, 323, 8];
const CHAI_CHANCE = [0.64, 0.55, 0.58, 0.3];
const FEEL_WEIGHTS = [31, 34, 21, 10, 4];
const SNACK_WEIGHTS = [34, 22, 18, 16, 10, 12];
const NONE_CHANCE = 0.04;
const COMPLETE_CHANCE = 0.91;

function generate(): SampleResponse[] {
  const rand = seeded(20261111);
  const out: SampleResponse[] = [];
  SLOT_SIZES.forEach((size, slot) => {
    for (let k = 0; k < size; k++) {
      const drink = rand() < CHAI_CHANCE[slot] ? 0 : 1;
      const completed = rand() < COMPLETE_CHANCE;
      const leftAfterQ1 = !completed && rand() < 0.55;
      const feel = leftAfterQ1 ? null : pickWeighted(rand, FEEL_WEIGHTS);
      let snacks: number[] | null = null;
      if (completed) {
        if (rand() < NONE_CHANCE) snacks = [SNACK_NONE];
        else {
          const want = 1 + Math.floor(rand() * SNACK_LIMIT);
          const picked = new Set<number>();
          while (picked.size < want) picked.add(pickWeighted(rand, SNACK_WEIGHTS));
          snacks = [...picked];
        }
      }
      const seconds = completed ? Math.round(18 + (rand() + rand() + rand() + rand()) * 10) : null;
      out.push({ slot, drink, feel, snacks, completed, seconds });
    }
  });
  return out;
}

function computeStats(records: SampleResponse[]): PollStats {
  const done = records.filter((r) => r.completed);
  return {
    participants: records.length,
    completed: done.length,
    medianSeconds: median(done.map((r) => r.seconds ?? 0)),
    drinkCounts: DRINKS.map((_, i) => done.filter((r) => r.drink === i).length),
    feelCounts: FEELINGS.map((_, i) => done.filter((r) => r.feel === i).length),
    snackMentions: SNACKS.map((_, i) => done.filter((r) => r.snacks?.includes(i)).length),
    bySlot: TIME_SLOTS.map((slot, s) => {
      const inSlot = records.filter((r) => r.slot === s);
      return { slot, n: inSlot.length, counts: DRINKS.map((_, i) => inSlot.filter((r) => r.drink === i).length) };
    }),
  };
}

export const pollStats: PollStats = computeStats(generate());
