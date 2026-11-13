/**
 * A shareable snapshot of a survey's analysis: scores, insights and chart totals only. No single
 * response, written comment or personal answer goes in. It travels inside the link itself
 * (compressed, after the #), so a shared link works on any device without a backend, and the
 * part after # is never sent to a server.
 */
import type { BarRow, Overview } from "./compute";
import type { Insight, InsightSet } from "./insights";

export type SnapQuestion =
  | { kind: "bars"; title: string; n: number; rows: BarRow[]; multi: boolean }
  | { kind: "likert"; title: string; n: number; rows: BarRow[]; summary: string }
  | { kind: "nps"; title: string; n: number; score: number; dist: number[]; groups: BarRow[] }
  | { kind: "open"; title: string; n: number; answered: number };

export type Snapshot = {
  v: 1;
  title: string;
  creator: string;
  at: number;
  isSample: boolean;
  started: number;
  finished: number;
  base: number;
  completionPct: number;
  medianSeconds: number | null;
  insights: Insight[];
  notes: string[];
  questions: SnapQuestion[];
};

export function buildSnapshot(input: { title: string; creator: string; isSample: boolean; data: Overview; set: InsightSet; now: number }): Snapshot {
  const { data } = input;
  const questions: SnapQuestion[] = [];
  data.questions.forEach((r, i) => {
    const title = `Q${i + 1}. ${r.q.text}`;
    if (r.kind === "personal") return; // personal data is never shared
    if (r.kind === "open") questions.push({ kind: "open", title, n: r.n, answered: r.answered });
    else if (r.kind === "nps") questions.push({ kind: "nps", title, n: r.n, score: r.score, dist: r.dist, groups: [r.detractors, r.passives, r.promoters] });
    else if (r.kind === "likert")
      questions.push({
        kind: "likert",
        title,
        n: r.n,
        rows: r.rows,
        summary: `${r.pos}% positive${r.hasNeutral ? ` · ${r.neutral}% in the middle` : ""} · ${r.neg}% negative`,
      });
    else questions.push({ kind: "bars", title, n: r.n, rows: r.rows, multi: r.multi });
  });
  return {
    v: 1,
    title: input.title,
    creator: input.creator,
    at: input.now,
    isSample: input.isSample,
    started: data.started,
    finished: data.finished,
    base: data.base,
    completionPct: data.completionPct,
    medianSeconds: data.medianSeconds,
    insights: input.set.insights,
    notes: input.set.notes,
    questions,
  };
}

/* ---------------- encoding: JSON → deflate → base64url ---------------- */

const toB64 = (bytes: Uint8Array) => {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64 = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeSnapshot(s: Snapshot): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(s));
  if (typeof CompressionStream === "undefined") return `j${toB64(json)}`;
  return `z${toB64(await pipe(json, new CompressionStream("deflate-raw")))}`;
}

export async function decodeSnapshot(code: string): Promise<Snapshot | null> {
  try {
    const kind = code[0];
    const bytes = fromB64(code.slice(1));
    const json = kind === "z" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : kind === "j" ? bytes : null;
    if (!json) return null;
    const s = JSON.parse(new TextDecoder().decode(json)) as Snapshot;
    return s && s.v === 1 && Array.isArray(s.insights) && Array.isArray(s.questions) ? s : null;
  } catch {
    return null;
  }
}

export const shareUrl = (origin: string, code: string) => `${origin}/r#${code}`;
