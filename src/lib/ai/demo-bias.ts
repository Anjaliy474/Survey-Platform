/**
 * DEMO stand-in for the bias_checker stage (combined.system.txt): pattern checks that return
 * the real bias_checker JSON schema. Evidence is always an exact substring of the item, as the
 * real stage requires. The Claude version replaces this file, not its callers.
 */
import type { BiasFinding, BiasOutput, ShaperOutput } from "./types";

type Check = {
  category: BiasFinding["category"];
  severity: BiasFinding["severity"];
  test: RegExp;
  explanation: string;
};

const TEXT_CHECKS: Check[] = [
  {
    category: "leading",
    severity: "critical",
    test: /\b(?:don'?t|wouldn'?t|isn'?t|aren'?t|wasn'?t) you\b|\b(?<!dis)agree that\b(?!.*\bdisagree\b)|\bhow (?:amazing|great|awesome|wonderful|fantastic|excellent)\b/i,
    explanation: "This wording signals the answer you hope for, so people tend to agree with it.",
  },
  {
    category: "loaded",
    severity: "major",
    test: /\b(wasteful|outdated|useless|ridiculous|terrible|awful|pathetic|lazy|disgusting)\b/i,
    explanation: "A charged word colours the answer before people have thought about it.",
  },
  {
    category: "presumptive",
    severity: "major",
    test: /\bhow often do you use our\b/i,
    explanation: "This assumes everyone uses it. Add a 'Never' option or ask first whether they use it.",
  },
  {
    category: "absolute_wording",
    severity: "minor",
    test: /\b(always|never|every time|all the time)\b/i,
    explanation: "Absolute words force an extreme; most people's honest answer is 'usually' or 'sometimes'.",
  },
];

const NEUTRAL_OPTION = /^(none|none of these|other|not applicable|n\/a|prefer not to say|nothing|no preference|i don'?t|would not pay|never|not sure|it varies)/i;
const POSITIVE = /\b(excellent|very good|good|great|amazing|satisfied|happy)\b/i;
const NEGATIVE = /\b(poor|bad|terrible|dissatisfied|unhappy|very poor)\b/i;

export function demoBiasCheck(shaper: ShaperOutput): BiasOutput {
  const findings: BiasFinding[] = [];
  const add = (f: Omit<BiasFinding, "scope" | "related_ids" | "suggested_fix"> & Partial<Pick<BiasFinding, "suggested_fix">>) =>
    findings.push({
      scope: "item",
      related_ids: [],
      suggested_fix: { text: "", options: [], scale: null, split_into: [] },
      ...f,
    });

  for (const q of shaper.questions) {
    for (const c of TEXT_CHECKS) {
      const m = q.text.match(c.test);
      if (m) add({ id: q.id, category: c.category, severity: c.severity, confidence: "medium", location: "text", evidence: m[0], explanation: c.explanation });
    }
    const choice = q.type === "single_choice" || q.type === "multi_choice";
    if (choice && q.options.length >= 3 && !q.options.some((o) => NEUTRAL_OPTION.test(o.trim()))) {
      add({
        id: q.id,
        category: "incomplete_options",
        severity: "major",
        confidence: "medium",
        location: "options",
        evidence: q.options[q.options.length - 1],
        explanation: "No 'None' or 'Other' option, so some people can't answer truthfully.",
        suggested_fix: { text: "", options: [...q.options, "Other"], scale: null, split_into: [] },
      });
    }
    if (choice && q.options.length >= 3) {
      const pos = q.options.filter((o) => POSITIVE.test(o)).length;
      const neg = q.options.filter((o) => NEGATIVE.test(o)).length;
      if (pos > neg + 1) {
        add({
          id: q.id,
          category: "unbalanced_scale",
          severity: "major",
          confidence: "medium",
          location: "options",
          evidence: q.options.find((o) => POSITIVE.test(o)) ?? q.options[0],
          explanation: "More positive choices than negative ones nudges answers upward.",
        });
      }
    }
    if (q.sensitive && q.required) {
      add({
        id: q.id,
        category: "sensitive_not_optional",
        severity: "major",
        confidence: "high",
        location: "text",
        evidence: q.text.slice(0, 40),
        explanation: "Sensitive questions must be optional, so no one feels forced to share.",
      });
    }
  }

  const flagged = new Set(findings.map((f) => f.id));
  const critical = findings.some((f) => f.severity === "critical");
  return {
    items_reviewed: shaper.questions.map((q) => ({ id: q.id, verdict: flagged.has(q.id) ? "flagged" : "clear" })),
    findings,
    overall_note: critical
      ? "Some questions push people toward an answer; fixing them will make your results trustworthy."
      : findings.length
        ? "A few questions could be clearer. Each suggestion keeps what you meant to ask."
        : "No problems found: every question reads neutrally.",
    flags: [],
  };
}
