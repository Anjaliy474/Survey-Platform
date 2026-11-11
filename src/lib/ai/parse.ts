/**
 * Parse pasted questions: one question per line; lines starting with "-", "•" or "*" are
 * answer options for the question above. Numbering like "1." or "Q3)" is removed.
 * Used live in the browser (the "detected questions" preview) and again on the server.
 */
export type ParsedQuestion = { id: string; text: string; options: string[] };

const OPTION = /^\s*[-•*–]\s+(.+)$/;
const NUMBERING = /^\s*(?:q\s*)?\d+\s*[.):-]\s*/i;

export function parsePastedQuestions(raw: string): ParsedQuestion[] {
  const out: ParsedQuestion[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const option = line.match(OPTION);
    if (option && out.length > 0) {
      out[out.length - 1].options.push(option[1].trim());
      continue;
    }
    const text = line.replace(NUMBERING, "").trim();
    if (text) out.push({ id: `Q${out.length + 1}`, text, options: [] });
  }
  return out;
}

export const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Same question twice? Identical wording, or at least 80% of the same words. */
export function looksDuplicate(a: string, b: string): boolean {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === nb) return true;
  const wa = new Set(na.split(" "));
  const wb = new Set(nb.split(" "));
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared / Math.max(wa.size, wb.size) >= 0.8;
}
