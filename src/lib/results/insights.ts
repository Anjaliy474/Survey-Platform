/**
 * Insights beyond the direct answers. Everything here is computed in code from the response rows:
 * group differences (with a chi-square test and Holm correction), what drives the main score,
 * change over time, when people answer, words unhappy people use, and where people quit.
 * The sentences are templates filled with computed numbers, so every number is checkable.
 */
import { MIN_GROUP_SIZE, percent } from "@/lib/compute";
import { isOpenEnded, optionsFor, scaleLabels } from "@/lib/player/rules";
import type { Answer, PlayerSurvey, Question } from "@/lib/player/types";
import { chiSquare, holm } from "@/lib/stats/chi-square";
import type { ResultResponse } from "./data";
import { shortLabel } from "./schema";

export type InsightGroup = { label: string; pct: number; n: number; best?: boolean; worst?: boolean };
export type Confidence = "clear" | "likely" | "early";
export type Insight = {
  id: string;
  kind: "score" | "gap" | "driver" | "trend" | "demand" | "words" | "dropoff";
  tone: "good" | "bad" | "neutral";
  /** The finding, with its numbers. */
  headline: string;
  /** One supporting sentence. */
  detail: string;
  /** What to do about it. */
  action: string;
  confidence: Confidence;
  /** How sure: base size and, for comparisons, how unlikely chance is. */
  basis: string;
  groups?: InsightGroup[];
  words?: { word: string; count: number }[];
  /** Ranking weight; bigger is shown first. */
  weight: number;
};

export type InsightSet = {
  insights: Insight[];
  /** Why some kinds of insight are missing (shown as a quiet note). */
  notes: string[];
  base: number;
};

/* ---------------- what "positive" means for each kind of question ---------------- */

type Measure = {
  key: string;
  q: Question;
  label: string;
  /** After a percentage: "62% satisfied", "62% would recommend (9–10)". */
  phrase: string;
  /** After "are": "are satisfied", "found it clear". */
  verb: string;
  /** The positive people as a group: "satisfied people". */
  who: string;
  isPos: (a: Answer | undefined) => boolean | null;
};

function measureFor(q: Question): Measure | null {
  if (q.collects_personal_data) return null;
  if (q.type === "nps_0_10")
    return {
      key: q.id,
      q,
      label: "Recommending",
      phrase: "promoters",
      verb: "promoters",
      who: "promoters (9–10)",
      isPos: (a) => (typeof a === "number" ? a >= 9 : null),
    };
  if (q.type === "rating_scale") {
    const labels = scaleLabels(q);
    const top = labels.length >= 5 ? labels.length - 2 : labels.length - 1;
    const text = `${q.text} ${labels.join(" ")}`;
    const label = shortLabel(q);
    const words = /satisf/i.test(text)
      ? { phrase: "satisfied", verb: "satisfied", who: "satisfied people" }
      : /clear/i.test(text)
        ? { phrase: "found it clear", verb: "clear about it", who: "people who found it clear" }
        : /likely/i.test(text)
          ? { phrase: "said likely", verb: "likely", who: `people likely to say yes (${label.toLowerCase()})` }
          : /agree/i.test(text)
            ? { phrase: "agreed", verb: "in agreement", who: "people who agreed" }
            : { phrase: "positive", verb: "positive", who: `people positive on ${label.toLowerCase()}` };
    return { key: q.id, q, label, ...words, isPos: (a) => (typeof a === "number" ? a >= top : null) };
  }
  return null;
}

/* ---------------- ways to split people into groups ---------------- */

type Splitter = { key: string; label: string; groups: string[]; who?: string[]; of: (r: ResultResponse) => number | null; derived: boolean };

const HOUR_GROUPS = ["Morning (before 12)", "Afternoon (12–5)", "Evening (after 5)"];
const hourGroup = (t: number) => {
  const h = new Date(t).getHours();
  return h < 12 ? 0 : h < 17 ? 1 : 2;
};

function splittersFor(survey: PlayerSurvey): Splitter[] {
  const out: Splitter[] = [];
  for (const q of survey.questions) {
    if (q.collects_personal_data) continue;
    if (q.type !== "single_choice" && q.type !== "yes_no" && q.type !== "number_band") continue;
    const groups = optionsFor(q);
    if (groups.length < 2 || groups.length > 6) continue;
    out.push({ key: q.id, label: shortLabel(q).toLowerCase(), groups, of: (r) => (typeof r.answers[q.id] === "number" ? (r.answers[q.id] as number) : null), derived: false });
  }
  out.push({ key: "time", label: "time of day", groups: HOUR_GROUPS, who: ["people answering in the morning", "people answering in the afternoon", "people answering in the evening"], of: (r) => (r.submittedAt ? hourGroup(r.submittedAt) : null), derived: true });
  out.push({
    key: "weekend",
    label: "day of the week",
    groups: ["Weekdays", "Weekends"],
    who: ["people answering on weekdays", "people answering at weekends"],
    of: (r) => {
      if (!r.submittedAt) return null;
      const d = new Date(r.submittedAt).getDay();
      return d === 0 || d === 6 ? 1 : 0;
    },
    derived: true,
  });
  return out;
}

/** "Yes"/"No" on their own read badly; name the question too. */
function groupName(s: Splitter, i: number): string {
  if (s.who) return s.who[i];
  const g = s.groups[i];
  if (/^(yes|no)$/i.test(g)) return `“${g}” to ${s.label}`;
  return g;
}

/* ---------------- tiny helpers ---------------- */

type Cell = { pos: number; n: number };
const pctOf = (c: Cell) => percent(c.pos, c.n);

function confidenceOf(p: number, n: number): Confidence {
  if (p < 0.01 && n >= 100) return "clear";
  if (p < 0.05) return "likely";
  return "early";
}
function basisOf(c: Confidence, n: number): string {
  const base = `Based on ${n} ${n === 1 ? "response" : "responses"}`;
  if (c === "clear") return `${base}. A gap this size is very unlikely to be chance.`;
  if (c === "likely") return `${base}. Unlikely to be chance, but worth watching.`;
  return `${base}. Few answers, so treat it as an early signal.`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const times = (a: number, b: number) => (b > 0 ? a / b : 0);

/* ---------------- words unhappy people use ---------------- */

const STOP = new Set(
  "the a an and or but to of in on at for with is are was were be been it its this that these those i me my we our you your they them their he she his her so very too more most much many some any all not no nothing just also would could should will can like get got have has had do does did from by as if when what which there here than then about into out up down over again really please make made one two us am gets getting nice great good well need want keep time place thing things maybe bit lot always still even every going come".split(
    " ",
  ),
);
function wordsIn(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/\d+/g, " ")
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

/* ---------------- the main entry ---------------- */

/**
 * @param used finished responses the charts use (flag rules already applied)
 * @param all every row, including people who left (for drop-off)
 */
export function computeInsights(survey: PlayerSurvey, used: readonly ResultResponse[], all: readonly ResultResponse[]): InsightSet {
  const n = used.length;
  const notes: string[] = [];
  const found: Insight[] = [];
  if (n === 0) return { insights: [], notes: ["No responses to analyse yet."], base: 0 };

  const measures = survey.questions.map(measureFor).filter((m): m is Measure => !!m);
  // The headline score: recommending if asked, else the first outcome scale, else any scale.
  const main = measures.find((m) => m.q.type === "nps_0_10") ?? measures.find((m) => m.q.role === "outcome") ?? measures[0];
  const satisfaction = measures.find((m) => m.q.type === "rating_scale" && m.q.role === "outcome") ?? measures.find((m) => m.q.type === "rating_scale");

  /* 1. The score, with what's behind it */
  if (main) {
    const answered = used.filter((r) => main.isPos(r.answers[main.q.id]) !== null);
    if (answered.length) {
      const pos = answered.filter((r) => main.isPos(r.answers[main.q.id])).length;
      const pct = percent(pos, answered.length);
      if (main.q.type === "nps_0_10") {
        const det = answered.filter((r) => (r.answers[main.q.id] as number) <= 6).length;
        const pas = answered.length - pos - det;
        const score = Math.round(((pos - det) / answered.length) * 100);
        const pasPct = percent(pas, answered.length);
        const biggest = pasPct >= pct && pasPct >= percent(det, answered.length);
        found.push({
          id: "score",
          kind: "score",
          tone: score >= 30 ? "good" : score < 0 ? "bad" : "neutral",
          headline: `Net Promoter Score is ${score > 0 ? "+" : ""}${score}: ${pct}% promoters, ${percent(det, answered.length)}% detractors.`,
          detail: biggest
            ? `The biggest group is the ${pasPct}% in the middle (7–8). They like you but aren’t telling friends yet.`
            : `${pct}% would actively recommend you; ${percent(det, answered.length)}% might talk you down.`,
          action: biggest ? "Find out what would turn a 7 or 8 into a 9; the drivers below are a good start." : "Use the drivers below to see what moves people up.",
          confidence: answered.length >= 30 ? "clear" : "early",
          basis: `Based on ${answered.length} answers to “${main.q.text}”`,
          groups: [
            { label: "Promoters (9–10)", pct, n: pos, best: true },
            { label: "Passives (7–8)", pct: pasPct, n: pas },
            { label: "Detractors (0–6)", pct: percent(det, answered.length), n: det, worst: true },
          ],
          weight: 100,
        });
      } else {
        found.push({
          id: "score",
          kind: "score",
          tone: pct >= 70 ? "good" : pct < 50 ? "bad" : "neutral",
          headline: `${pct}% are ${main.verb}.`,
          detail: `${pos} of ${answered.length} people picked one of the top two answers to “${main.q.text}”`,
          action: "The comparisons below show who is less happy and why.",
          confidence: answered.length >= 30 ? "clear" : "early",
          basis: `Based on ${answered.length} answers to “${main.q.text}”`,
          weight: 100,
        });
      }
    }
  }

  /* 2. Gaps between groups, for each score and for the top menu-style wishes */
  type Candidate = { insight: Insight; p: number };
  const candidates: Candidate[] = [];
  const splitters = splittersFor(survey);
  const outcomes: Measure[] = [...measures];
  for (const q of survey.questions) {
    if (q.type !== "multi_choice" || q.collects_personal_data) continue;
    const opts = optionsFor(q);
    const counts = opts.map((_, i) => used.filter((r) => Array.isArray(r.answers[q.id]) && (r.answers[q.id] as number[]).includes(i)).length);
    counts
      .map((c, i) => ({ c, i }))
      .filter(({ i }) => !/^(nothing|none)/i.test(opts[i]))
      .sort((a, b) => b.c - a.c)
      .slice(0, 3)
      .forEach(({ i }) =>
        outcomes.push({
          key: `${q.id}:${i}`,
          q,
          label: opts[i],
          phrase: `want ${opts[i].toLowerCase()}`,
          verb: `keen on ${opts[i].toLowerCase()}`,
          who: `people who want ${opts[i].toLowerCase()}`,
          isPos: (a) => (Array.isArray(a) ? a.includes(i) : null),
        }),
      );
  }

  let tooSmall = false;
  for (const m of outcomes) {
    for (const s of splitters) {
      if (s.key === m.q.id) continue;
      const cells: Cell[] = s.groups.map(() => ({ pos: 0, n: 0 }));
      for (const r of used) {
        const g = s.of(r);
        const v = m.isPos(r.answers[m.q.id]);
        if (g === null || v === null || !cells[g]) continue;
        cells[g].n += 1;
        if (v) cells[g].pos += 1;
      }
      const big = cells.map((c, i) => ({ ...c, i })).filter((c) => c.n >= MIN_GROUP_SIZE);
      if (cells.filter((c) => c.n > 0).length >= 2 && big.length < 2) tooSmall = true;
      if (big.length < 2) continue;
      const test = chiSquare(big.map((c) => [c.pos, c.n - c.pos]));
      if (!test) continue;
      const sorted = [...big].sort((a, b) => pctOf(b) - pctOf(a));
      const hi = sorted[0];
      const lo = sorted[sorted.length - 1];
      const gap = pctOf(hi) - pctOf(lo);
      if (gap < 12) continue;
      const menu = m.q.type === "multi_choice";
      const total = big.reduce((t, c) => t + c.n, 0);
      const groups: InsightGroup[] = big.map((c) => ({ label: s.groups[c.i], pct: pctOf(c), n: c.n, best: c.i === hi.i, worst: c.i === lo.i }));
      const headline = menu
        ? `${cap(m.label)} is wanted most by ${groupName(s, hi.i)}: ${pctOf(hi)}%, against ${pctOf(lo)}% for ${groupName(s, lo.i)}.`
        : `${cap(m.label)} is lowest for ${groupName(s, lo.i)}: ${pctOf(lo)}% ${m.phrase}, against ${pctOf(hi)}% for ${groupName(s, hi.i)}.`;
      const action = menu
        ? s.key === "time"
          ? `Time it: offer ${m.label.toLowerCase()} when ${s.groups[hi.i].split(" ")[0].toLowerCase()} visitors come in.`
          : `Start ${m.label.toLowerCase()} where it’s wanted most: ${groupName(s, hi.i)}.`
        : `Look at what’s different for ${groupName(s, lo.i)}; it trails by ${gap} points.`;
      candidates.push({
        p: test.p,
        insight: {
          id: `gap-${m.key}-${s.key}`,
          kind: menu ? "demand" : "gap",
          tone: menu ? "neutral" : "bad",
          headline,
          detail: menu
            ? `Across everyone it’s ${percent(big.reduce((t, c) => t + c.pos, 0), total)}%, but ${s.label} changes it a lot.`
            : `${cap(s.label)} makes a ${gap}-point difference to ${m.label.toLowerCase()}.`,
          action,
          confidence: "early",
          basis: "",
          groups,
          weight: gap * (m === main ? 1.4 : menu ? 0.9 : 1.1) * (s.derived ? 0.9 : 1),
        },
      });
    }
  }

  /* 3. Drivers: what goes with the main score */
  const target = main;
  if (target) {
    type Pred = { key: string; label: string; yes: string; no: string; of: (r: ResultResponse) => boolean | null };
    const preds: Pred[] = [];
    for (const m of measures) {
      if (m.q.id === target.q.id) continue;
      preds.push({ key: m.q.id, label: m.label, yes: m.who, no: "everyone else", of: (r) => m.isPos(r.answers[m.q.id]) });
    }
    for (const q of survey.questions) {
      if (q.type !== "yes_no" || q.collects_personal_data) continue;
      preds.push({ key: q.id, label: shortLabel(q), yes: `people who said “Yes” to ${shortLabel(q).toLowerCase()}`, no: "those who said “No”", of: (r) => (typeof r.answers[q.id] === "number" ? r.answers[q.id] === 0 : null) });
    }
    for (const p of preds) {
      const a: Cell = { pos: 0, n: 0 };
      const b: Cell = { pos: 0, n: 0 };
      for (const r of used) {
        const x = p.of(r);
        const y = target.isPos(r.answers[target.q.id]);
        if (x === null || y === null) continue;
        const c = x ? a : b;
        c.n += 1;
        if (y) c.pos += 1;
      }
      if (a.n < MIN_GROUP_SIZE || b.n < MIN_GROUP_SIZE) continue;
      const test = chiSquare([
        [a.pos, a.n - a.pos],
        [b.pos, b.n - b.pos],
      ]);
      if (!test) continue;
      const diff = pctOf(a) - pctOf(b);
      if (Math.abs(diff) < 12) continue;
      const up = diff > 0;
      const ratio = up ? times(pctOf(a), pctOf(b)) : times(pctOf(b), pctOf(a));
      const ratioText = ratio >= 1.5 && Number.isFinite(ratio) ? `${ratio.toFixed(1)}× as likely` : `${Math.abs(diff)} points more likely`;
      candidates.push({
        p: test.p,
        insight: {
          id: `driver-${p.key}`,
          kind: "driver",
          tone: "neutral",
          headline: up
            ? `${cap(p.yes)} are ${ratioText} to be ${target.verb}: ${pctOf(a)}% against ${pctOf(b)}% of ${p.no}.`
            : `${cap(p.yes)} are less often ${target.verb}: ${pctOf(a)}% against ${pctOf(b)}% of ${p.no}.`,
          detail: `${p.label} moves with ${target.label.toLowerCase()} more than most things in this survey.`,
          action: up ? `Raising ${p.label.toLowerCase()} is a direct lever on ${target.label.toLowerCase()}.` : `Check why ${p.label.toLowerCase()} pulls ${target.label.toLowerCase()} down.`,
          confidence: "early",
          basis: "",
          groups: [
            { label: cap(p.yes), pct: pctOf(a), n: a.n, best: up, worst: !up },
            { label: cap(p.no), pct: pctOf(b), n: b.n, best: !up, worst: up },
          ],
          weight: Math.abs(diff) * 1.3,
        },
      });
    }
  }

  // One family-wide correction across every comparison we tried, then keep what holds up.
  const adjusted = holm(candidates.map((c) => c.p));
  candidates.forEach((c, i) => {
    const p = adjusted[i];
    if (p >= 0.05) return;
    const base = c.insight.groups?.reduce((t, g) => t + g.n, 0) ?? n;
    const conf = confidenceOf(p, base);
    found.push({ ...c.insight, confidence: conf, basis: basisOf(conf, base), weight: c.insight.weight * (conf === "clear" ? 1.2 : 1) });
  });

  /* 4. Trend: the last two days against before */
  const scoreForTrend = satisfaction ?? main;
  if (scoreForTrend) {
    const stamped = used.filter((r) => r.submittedAt !== null && scoreForTrend.isPos(r.answers[scoreForTrend.q.id]) !== null);
    const days = [...new Set(stamped.map((r) => new Date(r.submittedAt as number).toDateString()))];
    if (days.length >= 4) {
      const last = Math.max(...stamped.map((r) => r.submittedAt as number));
      const cut = new Date(last);
      cut.setHours(0, 0, 0, 0);
      const from = cut.getTime() - 24 * 3600_000;
      const recent: Cell = { pos: 0, n: 0 };
      const before: Cell = { pos: 0, n: 0 };
      for (const r of stamped) {
        const c = (r.submittedAt as number) >= from ? recent : before;
        c.n += 1;
        if (scoreForTrend.isPos(r.answers[scoreForTrend.q.id])) c.pos += 1;
      }
      if (recent.n >= 20 && before.n >= 20) {
        const test = chiSquare([
          [recent.pos, recent.n - recent.pos],
          [before.pos, before.n - before.pos],
        ]);
        const diff = pctOf(recent) - pctOf(before);
        if (test && test.p < 0.05 && Math.abs(diff) >= 8) {
          const conf = confidenceOf(test.p, recent.n + before.n);
          found.push({
            id: "trend",
            kind: "trend",
            tone: diff < 0 ? "bad" : "good",
            headline: `${cap(scoreForTrend.label)} ${diff < 0 ? "dipped" : "rose"} in the last two days: ${pctOf(recent)}% ${scoreForTrend.phrase}, against ${pctOf(before)}% before.`,
            detail: `${recent.n} answers in the last two days, ${before.n} before that.`,
            action: diff < 0 ? "Check what changed this week: staff, stock, crowds or prices." : "Something recent is working; find out what and keep it.",
            confidence: conf,
            basis: basisOf(conf, recent.n + before.n),
            groups: [
              { label: "Before", pct: pctOf(before), n: before.n, best: diff < 0, worst: diff > 0 },
              { label: "Last two days", pct: pctOf(recent), n: recent.n, best: diff > 0, worst: diff < 0 },
            ],
            weight: Math.abs(diff) * 1.5,
          });
        }
      }
    }
  }

  /* 5. Words unhappy people use more than happy ones */
  const openQ = survey.questions.find((q) => isOpenEnded(q) && !q.collects_personal_data && q.type === "long_text");
  const mood = satisfaction ?? main;
  if (openQ && mood) {
    const unhappy: Set<string>[] = [];
    const others: Set<string>[] = [];
    for (const r of used) {
      const text = r.answers[openQ.id];
      const v = mood.isPos(r.answers[mood.q.id]);
      if (typeof text !== "string" || !text.trim() || v === null) continue;
      (v ? others : unhappy).push(wordsIn(text));
    }
    if (unhappy.length >= 8) {
      const count = (docs: Set<string>[], w: string) => docs.filter((d) => d.has(w)).length;
      const vocab = new Set(unhappy.flatMap((d) => [...d]));
      const ranked = [...vocab]
        .map((w) => {
          const u = count(unhappy, w);
          const o = count(others, w);
          const lift = u / unhappy.length / ((o + 0.5) / Math.max(others.length, 1));
          return { word: w, count: u, lift };
        })
        .filter((x) => x.count >= 3 && x.lift >= 2)
        .sort((a, b) => b.count * Math.log(b.lift) - a.count * Math.log(a.lift))
        .slice(0, 5);
      if (ranked.length) {
        found.push({
          id: "words",
          kind: "words",
          tone: "bad",
          headline: `People who weren’t ${mood.phrase} keep mentioning: ${ranked.map((x) => x.word).join(", ")}.`,
          detail: `These words show up far more in their comments than in comments from happier people (${unhappy.length} unhappy comments read).`,
          action: "Open Themes to read the exact comments behind these words.",
          confidence: unhappy.length >= 30 ? "likely" : "early",
          basis: `Based on ${unhappy.length + others.length} written answers to “${openQ.text}”`,
          words: ranked.map(({ word, count }) => ({ word, count })),
          weight: 30 + ranked[0].count,
        });
      }
    }
  }

  /* 6. Where people quit */
  const leavers = all.filter((r) => r.submittedAt === null && r.leftAt !== null);
  if (leavers.length >= 10) {
    const byQ = survey.questions.map((_, i) => leavers.filter((r) => r.leftAt === i).length);
    const top = byQ.indexOf(Math.max(...byQ));
    const share = percent(byQ[top], leavers.length);
    if (share >= 35) {
      const q = survey.questions[top];
      found.push({
        id: "dropoff",
        kind: "dropoff",
        tone: "bad",
        headline: `${share}% of people who quit did so at Q${top + 1}: “${q.text}”`,
        detail: `${byQ[top]} of ${leavers.length} who left stopped there; no other question comes close.`,
        action: q.type === "multi_choice" ? "Cut its options to five or fewer, or make it optional." : "Make it shorter, clearer or optional.",
        confidence: leavers.length >= 30 ? "clear" : "likely",
        basis: `Based on ${leavers.length} people who started but didn’t finish`,
        weight: share * 0.6,
      });
    }
  }

  if (tooSmall) notes.push(`Group comparisons appear once each group has ${MIN_GROUP_SIZE} responses.`);
  if (!openQ) notes.push("Add an open question to see what unhappy people talk about.");

  // Score first, then the strongest; keep one per question pair so the list stays varied.
  const seen = new Set<string>();
  const ordered = found
    .sort((a, b) => b.weight - a.weight)
    .filter((i) => {
      const key = i.kind === "gap" || i.kind === "demand" ? i.id.split("-").slice(0, 2).join("-") : i.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 7);
  return { insights: ordered, notes, base: n };
}

/** The single most useful line for a summary card (skips the plain score). */
export function topInsight(set: InsightSet): Insight | null {
  return set.insights.find((i) => i.kind !== "score") ?? set.insights[0] ?? null;
}
