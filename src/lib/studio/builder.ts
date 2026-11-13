/**
 * Question builder state (UI_UX_LAYOUT.md S4). Every AI change starts as a pending suggestion;
 * nothing applies until the creator accepts it (DESIGN.md rule 3). Pure functions only: each
 * action returns a new state, which makes Undo a matter of keeping the previous one.
 */
import { parsePastedQuestions } from "@/lib/ai/parse";
import { applyRules } from "@/lib/ai/rules-engine";
import type { BiasFinding, BiasOutput, RulesReport, ShapedQuestion, ShaperOutput, SurveyRequest } from "@/lib/ai/types";
import type { Question } from "@/lib/player/types";

export type ItemStatus = "pending" | "accepted" | "settled";

export type BuilderItem = {
  /** Stable id: the shaper's question id, or U1, S1… for questions you or "Suggest one more" added. */
  key: string;
  /** Split suggestions share a group; Accept and Keep mine act on the whole group. */
  group: string | null;
  question: ShapedQuestion;
  /** The creator's own wording when the AI changed it (for Keep mine). */
  original: Question | null;
  status: ItemStatus;
  origin: "ai" | "you";
  /** Set when accepted, for the brief "You approved" badge. */
  approvedAt?: number;
};

export type BuilderState = {
  version: 1;
  items: BuilderItem[];
  purpose_line: string;
  consent_line: string;
  bias: BiasOutput | null;
  /** Signature of the question texts the bias check last ran on. */
  biasFor: string;
  dismissed: { key: string; category: string; reason: string }[];
  leftOut: ShaperOutput["cut_questions"];
  conflictConfirmed: boolean;
  leftOutSeen: boolean;
  nextKey: number;
};

const YES_NO_START = /^(do|does|did|is|are|was|were|have|has|had|will|would|can|could|should)\b/i;

/** Rebuild the creator's own question from the brief (only its text survives in the schema). */
function originalOf(q: ShapedQuestion, brief: SurveyRequest | undefined): Question | null {
  const before = q.change.before.trim();
  if (!before) return null;
  const parsed = brief?.mode === "bring_questions" ? parsePastedQuestions(brief.input) : [];
  const source = parsed.find((p) => p.id === q.change.source_id);
  const options = source?.options ?? [];
  const type: Question["type"] = options.length ? "single_choice" : YES_NO_START.test(before) ? "yes_no" : "short_text";
  return {
    id: q.change.source_id || q.id,
    text: before,
    type,
    options: type === "yes_no" ? ["Yes", "No"] : options,
    scale: null,
    required: type !== "short_text",
    sensitive: q.sensitive,
    collects_personal_data: q.collects_personal_data,
    role: q.role,
  };
}

export function createBuilderState(shaper: ShaperOutput, bias: BiasOutput, brief?: SurveyRequest): BuilderState {
  const items: BuilderItem[] = shaper.questions.map((q) => {
    const action = q.change.action;
    return {
      key: q.id,
      group: action === "split" ? `split-${q.change.source_id}` : null,
      question: q,
      original: originalOf(q, brief),
      status: action === "kept" ? "settled" : "pending",
      origin: "ai",
    };
  });
  return {
    version: 1,
    items,
    purpose_line: shaper.purpose_line,
    consent_line: shaper.consent_line,
    bias,
    biasFor: signature(items),
    dismissed: [],
    leftOut: shaper.cut_questions,
    conflictConfirmed: shaper.status !== "conflict",
    leftOutSeen: false,
    nextKey: 1,
  };
}

/* ---------------- derived views ---------------- */

export const signature = (items: BuilderItem[]) => items.map((i) => `${i.key}:${i.question.text}`).join("|");

/** The question set as it stands: pending suggestions count as proposed, for the live rules meter. */
export function currentQuestions(state: BuilderState): ShapedQuestion[] {
  return state.items.map((i) => i.question);
}

export function rulesFor(state: BuilderState, timeLimit: number | null): RulesReport {
  return applyRules(
    { ...emptyShaper(), questions: currentQuestions(state), purpose_line: state.purpose_line, consent_line: state.consent_line },
    timeLimit,
  );
}

export const pendingItems = (state: BuilderState) => state.items.filter((i) => i.status === "pending");
/** Suggestions to decide on: a split (two questions) counts as one suggestion. */
export const pendingCount = (state: BuilderState) => new Set(pendingItems(state).map((i) => i.group ?? i.key)).size;

/** Findings still standing: not dismissed, and the quoted words are still in the question. */
export function openFindings(state: BuilderState): BiasFinding[] {
  if (!state.bias) return [];
  return state.bias.findings.filter((f) => {
    if (state.dismissed.some((d) => d.key === f.id && d.category === f.category)) return false;
    const item = state.items.find((i) => i.key === f.id);
    if (!item) return false;
    const haystack = [item.question.text, ...item.question.options, ...(item.question.scale?.point_labels ?? [])].join(" \n ");
    return haystack.includes(f.evidence);
  });
}

export function hasPlaceholders(state: BuilderState): boolean {
  const re = /\[[^\]]+\]/;
  return re.test(state.purpose_line) || state.items.some((i) => re.test(i.question.text) || i.question.options.some((o) => re.test(o)));
}

/** The [placeholder] words still in a text, each listed once. */
export function placeholdersIn(text: string): string[] {
  return [...new Set(text.match(/\[[^\]]+\]/g) ?? [])];
}

/** Every distinct [placeholder] still in the draft, with how many places it appears. */
export function allPlaceholders(state: BuilderState): { word: string; count: number }[] {
  const texts = [state.purpose_line, state.consent_line, ...state.items.flatMap((i) => [i.question.text, ...i.question.options])];
  const counts = new Map<string, number>();
  for (const t of texts) for (const w of placeholdersIn(t)) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts].map(([word, count]) => ({ word, count }));
}

/** Replace one [placeholder] everywhere it appears: purpose, consent, question wording, options and labels. */
export function fillPlaceholder(state: BuilderState, word: string, value: string): BuilderState {
  const v = value.trim();
  if (!v || !word) return state;
  const swap = (t: string) => t.split(word).join(v);
  const swapDeep = <T,>(x: T): T => JSON.parse(JSON.stringify(x).split(word).join(JSON.stringify(v).slice(1, -1))) as T;
  return {
    ...state,
    purpose_line: swap(state.purpose_line),
    consent_line: swap(state.consent_line),
    items: state.items.map((i) => ({ ...i, question: swapDeep(i.question) })),
  };
}

const listWords = (words: string[]) => (words.length < 3 ? words.join(" and ") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`);

/** Where a blocker lives, so the page can take the creator straight to it. */
export type GateTarget =
  | { kind: "suggestions" }
  | { kind: "finding"; key: string }
  | { kind: "purpose" }
  | { kind: "question"; key: string }
  | { kind: "questions" }
  | { kind: "consent" }
  | { kind: "conflict" };
export type GateBlocker = { text: string; target: GateTarget };
export type NextGate = { ok: boolean; reasons: string[]; blockers: GateBlocker[] };

/** "Next: Style" is enabled only when every rule below passes (UI_UX_LAYOUT.md S4). */
export function nextGate(state: BuilderState, rules: RulesReport): NextGate {
  const blockers: GateBlocker[] = [];
  const pending = pendingCount(state);
  if (pending) blockers.push({ text: `Decide on ${pending} ${pending === 1 ? "suggestion" : "suggestions"}.`, target: { kind: "suggestions" } });
  const critical = openFindings(state).filter((f) => f.severity === "critical");
  if (critical.length)
    blockers.push({ text: `Fix or dismiss ${critical.length} critical bias ${critical.length === 1 ? "flag" : "flags"}.`, target: { kind: "finding", key: critical[0].id } });
  const inPurpose = placeholdersIn(state.purpose_line);
  if (inPurpose.length) blockers.push({ text: `Replace ${listWords(inPurpose)} in the Purpose line.`, target: { kind: "purpose" } });
  state.items.forEach((item, i) => {
    const words = placeholdersIn([item.question.text, ...item.question.options].join(" \n "));
    if (words.length) blockers.push({ text: `Replace ${listWords(words)} in Q${i + 1}.`, target: { kind: "question", key: item.key } });
  });
  if (rules.questionCount === 0) blockers.push({ text: "Add at least one question.", target: { kind: "questions" } });
  if (rules.countState === "blocked") blockers.push({ text: "Cut the survey to 15 questions or fewer.", target: { kind: "questions" } });
  if (rules.consentNeeded && !rules.consentPresent) blockers.push({ text: "Add a consent line.", target: { kind: "consent" } });
  if (!state.conflictConfirmed) blockers.push({ text: "Confirm the core set.", target: { kind: "conflict" } });
  return { ok: blockers.length === 0, reasons: blockers.map((b) => b.text), blockers };
}

/* ---------------- actions (each returns a new state) ---------------- */

const groupOf = (state: BuilderState, key: string) => {
  const item = state.items.find((i) => i.key === key);
  return item?.group ? state.items.filter((i) => i.group === item.group).map((i) => i.key) : [key];
};

export function accept(state: BuilderState, key: string): BuilderState {
  const keys = groupOf(state, key);
  const now = Date.now();
  return { ...state, items: state.items.map((i) => (keys.includes(i.key) ? { ...i, status: "accepted", approvedAt: now } : i)) };
}

export function acceptAll(state: BuilderState): BuilderState {
  const now = Date.now();
  return { ...state, items: state.items.map((i) => (i.status === "pending" ? { ...i, status: "accepted", approvedAt: now } : i)) };
}

/** Keep the creator's own wording; a split goes back to the single original question. */
export function keepMine(state: BuilderState, key: string): BuilderState {
  const keys = groupOf(state, key);
  const first = state.items.find((i) => i.key === keys[0]);
  if (!first) return state;
  const items: BuilderItem[] = [];
  for (const i of state.items) {
    if (!keys.includes(i.key)) items.push(i);
    else if (i.key === keys[0]) {
      const o = first.original;
      items.push({
        ...i,
        group: null,
        status: "settled",
        origin: "you",
        question: o
          ? { ...i.question, ...o, id: i.key, reason: "Kept as you wrote it.", change: { action: "kept", source_id: o.id, before: "", why: "" } }
          : { ...i.question, change: { ...i.question.change, action: "kept" } },
      });
    }
  }
  return { ...state, items };
}

/** Duplicate: remove this one (merge into the other) or keep both. */
export function removeItem(state: BuilderState, key: string): BuilderState {
  return { ...state, items: state.items.filter((i) => i.key !== key) };
}

export function settle(state: BuilderState, key: string): BuilderState {
  return { ...state, items: state.items.map((i) => (i.key === key ? { ...i, status: "settled" } : i)) };
}

/** Editing a question is an approval of the edited version. */
export function editQuestion(state: BuilderState, key: string, patch: Partial<ShapedQuestion>): BuilderState {
  const now = Date.now();
  return {
    ...state,
    items: state.items.map((i) =>
      i.key === key ? { ...i, question: { ...i.question, ...patch }, status: i.status === "pending" ? "accepted" : i.status, origin: "you", approvedAt: now } : i,
    ),
  };
}

export function move(state: BuilderState, key: string, delta: number): BuilderState {
  const from = state.items.findIndex((i) => i.key === key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= state.items.length) return state;
  const items = [...state.items];
  const [it] = items.splice(from, 1);
  items.splice(to, 0, it);
  return { ...state, items };
}

export function moveTo(state: BuilderState, key: string, toIndex: number): BuilderState {
  const from = state.items.findIndex((i) => i.key === key);
  if (from < 0) return state;
  const items = [...state.items];
  const [it] = items.splice(from, 1);
  items.splice(Math.max(0, Math.min(toIndex, items.length)), 0, it);
  return { ...state, items };
}

export function addQuestion(state: BuilderState, q: Omit<ShapedQuestion, "id">, origin: "ai" | "you"): BuilderState {
  const key = `${origin === "ai" ? "S" : "U"}${state.nextKey}`;
  const item: BuilderItem = {
    key,
    group: null,
    question: { ...q, id: key },
    original: null,
    status: origin === "ai" ? "pending" : "accepted",
    origin,
    approvedAt: origin === "you" ? Date.now() : undefined,
  };
  // Open questions stay last (rules engine); anything else goes before them.
  const open = (x: BuilderItem) => x.question.type === "short_text" || x.question.type === "long_text";
  const isOpen = q.type === "short_text" || q.type === "long_text";
  const firstOpen = state.items.findIndex(open);
  const items = [...state.items];
  items.splice(isOpen || firstOpen < 0 ? items.length : firstOpen, 0, item);
  return { ...state, items, nextKey: state.nextKey + 1 };
}

export function moveBackIn(state: BuilderState, index: number): BuilderState {
  const cut = state.leftOut[index];
  if (!cut) return state;
  const next = addQuestion(
    state,
    {
      text: cut.text,
      type: "short_text",
      options: [],
      scale: null,
      required: false,
      sensitive: false,
      collects_personal_data: false,
      role: "attitude",
      reason: "Moved back in from the left-out list.",
      maps_to_decision: "",
      change: { action: "kept", source_id: cut.source_id, before: "", why: "" },
    },
    "you",
  );
  return { ...next, leftOut: next.leftOut.filter((_, i) => i !== index) };
}

export function applyFix(state: BuilderState, f: BiasFinding): BuilderState {
  const item = state.items.find((i) => i.key === f.id);
  if (!item) return state;
  const fix = f.suggested_fix;
  const patch: Partial<ShapedQuestion> = {};
  if (fix.text) patch.text = fix.text;
  if (fix.options.length) patch.options = fix.options;
  if (fix.scale) patch.scale = { ...fix.scale, point_labels: undefined };
  return editQuestion(state, f.id, patch);
}

export function dismiss(state: BuilderState, f: BiasFinding, reason: string): BuilderState {
  return { ...state, dismissed: [...state.dismissed, { key: f.id, category: f.category, reason }] };
}

function emptyShaper(): ShaperOutput {
  return {
    mode: "quick_prompt",
    status: "ready",
    summary_for_creator: "",
    decisions_informed: [],
    assumptions: [],
    clarifying_questions: [],
    conflict_explanation: "",
    declined: { request: "", reason: "" },
    purpose_line: "",
    consent_line: "",
    questions: [],
    cut_questions: [],
    notes_for_creator: [],
    flags: [],
  };
}
