/**
 * Themes (UI_UX_LAYOUT.md R3): the AI codes, code counts. Pure functions over the stored coding:
 * folding in new batches, counts and shares per theme, ties, and the creator's renames, merges
 * and added themes (each logged as "You approved").
 */
import { percent } from "@/lib/compute";
import type { Sentiment, Theme, ThemeOutput } from "@/lib/ai/types";
import type { ThemeState } from "@/lib/studio/types";

export type ThemeStat = {
  theme: Theme;
  ids: string[];
  count: number;
  pct: number;
  sentiment: Record<Sentiment, number>;
  tiedWith: string[];
};

export type ThemeSummary = {
  answers: number;
  withContent: number;
  stats: ThemeStat[];
  /** The single most-mentioned theme, or null when the top count is shared (or nothing coded). */
  topId: string | null;
  noContent: number;
  offTopic: number;
  flagged: { id: string; type: string; note: string }[];
  minority: ThemeOutput["minority_mentions"];
  candidates: (ThemeOutput["candidate_new_themes"][number] & { count: number })[];
};

export function summarize(state: ThemeState, present: ReadonlySet<string>): ThemeSummary {
  const r = state.result;
  const rows = r.assignments.filter((a) => present.has(a.response_id));
  const noContent = rows.filter((a) => a.status === "no_content").length;
  const offTopic = rows.filter((a) => a.status === "off_topic").length;
  const flaggedOnly = rows.filter((a) => a.status === "flagged" && a.theme_ids.length === 0).length;
  const withContent = rows.length - noContent - offTopic - flaggedOnly;

  const stats: ThemeStat[] = r.themes.map((theme) => {
    const mine = rows.filter((a) => a.theme_ids.includes(theme.theme_id));
    const sentiment: Record<Sentiment, number> = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
    mine.forEach((a) => (sentiment[a.sentiment] += 1));
    return { theme, ids: mine.map((a) => a.response_id), count: mine.length, pct: percent(mine.length, withContent), sentiment, tiedWith: [] };
  });
  stats.sort((a, b) => b.count - a.count || a.theme.theme_id.localeCompare(b.theme.theme_id, undefined, { numeric: true }));
  for (const s of stats) s.tiedWith = stats.filter((o) => o !== s && o.count === s.count && s.count > 0).map((o) => o.theme.label);
  const topId = stats.length && stats[0].count > 0 && stats[0].tiedWith.length === 0 ? stats[0].theme.theme_id : null;

  const flagged = r.flags.filter((f) => present.has(f.response_id)).map((f) => ({ id: f.response_id, type: f.type, note: f.note }));
  return {
    answers: rows.length,
    withContent,
    stats,
    topId,
    noContent,
    offTopic,
    flagged,
    minority: r.minority_mentions.filter((m) => present.has(m.response_id)),
    candidates: r.candidate_new_themes
      .filter((c) => !state.ignored.includes(c.label))
      .map((c) => ({ ...c, count: c.response_ids.filter((id) => present.has(id)).length }))
      .filter((c) => c.count >= 2),
  };
}

/** Fold a coding run into the stored state (discover replaces; apply_codebook adds). */
export function foldBatch(prev: ThemeState | undefined, out: ThemeOutput, codedIds: string[], engine: "demo" | "claude", now: number): ThemeState {
  if (!prev || out.mode === "discover") {
    return { result: out, coded: codedIds, updatedAt: now, engine, approved: {}, ignored: [] };
  }
  const recoded = new Set(codedIds);
  const result: ThemeOutput = {
    ...prev.result,
    mode: "apply_codebook",
    assignments: [...prev.result.assignments.filter((a) => !recoded.has(a.response_id)), ...out.assignments],
    minority_mentions: [...prev.result.minority_mentions.filter((m) => !recoded.has(m.response_id)), ...out.minority_mentions],
    flags: [...prev.result.flags.filter((f) => !recoded.has(f.response_id)), ...out.flags],
    candidate_new_themes: mergeCandidates(prev.result.candidate_new_themes, out.candidate_new_themes),
    coding_notes: [...new Set([...prev.result.coding_notes, ...out.coding_notes])],
  };
  return { ...prev, result, coded: [...new Set([...prev.coded, ...codedIds])], updatedAt: now, engine };
}

function mergeCandidates(a: ThemeOutput["candidate_new_themes"], b: ThemeOutput["candidate_new_themes"]) {
  const out = a.map((c) => ({ ...c, response_ids: [...c.response_ids] }));
  for (const c of b) {
    const same = out.find((x) => x.label === c.label);
    if (same) same.response_ids = [...new Set([...same.response_ids, ...c.response_ids])];
    else out.push(c);
  }
  return out;
}

export function renameTheme(state: ThemeState, themeId: string, label: string): ThemeState {
  const before = state.result.themes.find((t) => t.theme_id === themeId)?.label ?? "";
  return {
    ...state,
    result: { ...state.result, themes: state.result.themes.map((t) => (t.theme_id === themeId ? { ...t, label } : t)) },
    approved: { ...state.approved, [themeId]: `You renamed it from “${before}”.` },
  };
}

/** Merge `fromId` into `intoId`: its answers count under `intoId`, which keeps its ID and label. */
export function mergeThemes(state: ThemeState, intoId: string, fromId: string): ThemeState {
  const into = state.result.themes.find((t) => t.theme_id === intoId);
  const from = state.result.themes.find((t) => t.theme_id === fromId);
  if (!into || !from) return state;
  const quotes = [...into.quotes, ...from.quotes].filter((q, i, all) => all.findIndex((x) => x.response_id === q.response_id) === i).slice(0, 3);
  return {
    ...state,
    result: {
      ...state.result,
      themes: state.result.themes
        .filter((t) => t.theme_id !== fromId)
        .map((t) => (t.theme_id === intoId ? { ...t, quotes, description: `${t.description} Also includes: ${from.description}` } : t)),
      assignments: state.result.assignments.map((a) =>
        a.theme_ids.includes(fromId) ? { ...a, theme_ids: [...new Set(a.theme_ids.map((id) => (id === fromId ? intoId : id)))] } : a,
      ),
    },
    approved: { ...state.approved, [intoId]: `You merged “${from.label}” into it.` },
  };
}

/** Accept a suggested new theme: a new ID, its answers assigned, quotes taken verbatim. */
export function addCandidate(state: ThemeState, label: string, textById: ReadonlyMap<string, string>): ThemeState {
  const c = state.result.candidate_new_themes.find((x) => x.label === label);
  if (!c) return state;
  const next = state.result.themes.reduce((m, t) => Math.max(m, Number(t.theme_id.replace(/\D/g, "")) || 0), 0) + 1;
  const id = `T${next}`;
  const quotes = c.response_ids
    .map((rid) => ({ response_id: rid, text: textById.get(rid) ?? "" }))
    .filter((q) => q.text)
    .slice(0, 3);
  const ids = new Set(c.response_ids);
  return {
    ...state,
    result: {
      ...state.result,
      themes: [...state.result.themes, { theme_id: id, label: c.label, description: c.description, quotes }],
      assignments: state.result.assignments.map((a) =>
        ids.has(a.response_id) ? { ...a, theme_ids: [...new Set([...a.theme_ids, id])], status: a.status === "minority" ? "coded" : a.status } : a,
      ),
      minority_mentions: state.result.minority_mentions.filter((m) => !ids.has(m.response_id)),
      candidate_new_themes: state.result.candidate_new_themes.filter((x) => x.label !== label),
    },
    approved: { ...state.approved, [id]: "You added it from a suggestion." },
  };
}

export function ignoreCandidate(state: ThemeState, label: string): ThemeState {
  return { ...state, ignored: [...state.ignored, label] };
}

export function updatedAgo(at: number, now: number): string {
  const min = Math.max(0, Math.round((now - at) / 60_000));
  if (min < 1) return "Updated just now";
  if (min < 60) return `Updated ${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `Updated ${h} h ago` : `Updated ${Math.round(h / 24)} d ago`;
}
