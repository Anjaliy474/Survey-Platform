import type { Answer } from "./types";

/** Options that clear every other pick in a multi-select ("None of these"). */
export function exclusiveIndex(options: readonly string[]): number {
  return options.findIndex((o) => /^(none|i don'?t|i wouldn'?t)/i.test(o.trim()));
}

/** Toggle one option in a multi-select answer, honouring "None of these" and a pick limit. */
export function toggleMulti(current: number[], i: number, options: readonly string[], max?: number): number[] | "limit" {
  const none = exclusiveIndex(options);
  if (i === none) return current.includes(i) ? [] : [i];
  if (current.includes(i)) return current.filter((x) => x !== i);
  const rest = current.filter((x) => x !== none);
  if (max && rest.length >= max) return "limit";
  return [...rest, i];
}

/** Whether an answer counts as given (an optional text answer may be empty and skipped). */
export function hasAnswer(a: Answer | undefined): boolean {
  if (a === undefined || a === null) return false;
  if (Array.isArray(a)) return a.length > 0;
  if (typeof a === "string") return a.trim().length > 0;
  return true;
}
