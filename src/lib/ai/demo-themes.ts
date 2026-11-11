/**
 * DEMO stand-in for the theme_extractor stage (combined.system.txt). It codes answers with a
 * fixed set of plain-language rules and returns the exact theme_extractor JSON: themes with
 * coding rules and verbatim quotes, one assignment per response, minority mentions, flags and
 * notes. No counts, shares or rankings: code computes those. The Claude version replaces this.
 */
import type { Sentiment, Theme, ThemeOutput, ThemeRequest } from "./types";

type Rule = { key: string; label: string; description: string; re: RegExp; generic?: boolean };

const RULES: Rule[] = [
  { key: "breakfast", label: "Breakfast or brunch menu", description: "Asks for breakfast or brunch food (eggs, toast, poha, morning plates). Other menu ideas such as desserts or drinks do not belong.", re: /breakfast|brunch|\beggs?\b|toast|poha|upma/i },
  { key: "study", label: "Quiet place to study or work", description: "Wants a calmer space, quieter seating or plug points so they can study or work. General noise complaints belong only if they mention studying, working or wanting quiet.", re: /\bstudy(ing)?\b|quiet|silent|noisy|\bloud\b|\bplugs?\b/i },
  { key: "hours", label: "Opening earlier", description: "Asks for earlier opening times or says the current opening time is too late. Closing times do not belong.", re: /\bopen(ing)? (earlier|by|time)|\bopen earlier\b|opening time|too late for us/i },
  { key: "speed", label: "Slow service or long waits", description: "Says service, billing or orders were slow, or queues were long. Comments on how staff behaved do not belong.", re: /\bslow\b|\bwait(ed|ing)?\b|queue|long time|took ages/i },
  { key: "wifi", label: "Wi-Fi and charging points", description: "Mentions Wi-Fi quality or asks for charging points.", re: /wi-?fi|charging|internet/i },
  { key: "price", label: "Prices feel high", description: "Says prices are high or went up, or asks for a discount. Portion size does not belong.", re: /price|expensive|costly|discount|cheaper|afford/i },
  { key: "staff", label: "Friendly staff", description: "Praises the staff or baristas. Complaints about staff do not belong.", re: /\bstaff\b|barista|friendly|polite/i },
  { key: "drinks", label: "Keep a favourite drink the same", description: "Praises a specific drink and asks to keep it unchanged.", re: /keep it the same|love the (cold )?coffee/i },
  { key: "seating", label: "More seating", description: "Asks for more tables or outdoor seating.", re: /seating|more tables|outside seats?/i },
  { key: "heat", label: "Start earlier to avoid the heat", description: "Asks to start earlier or mentions the heat or sun. Other timing comments do not belong.", re: /\bhot\b|heat|harsh|\bthe sun\b|start earlier|begin at/i },
  { key: "water", label: "More drinking water", description: "Asks for more water or says the water ran out.", re: /\bwater\b/i },
  { key: "instructions", label: "Clearer instructions", description: "Asks for clearer or earlier instructions on what to do.", re: /instruction|explain|how deep|spacing/i },
  { key: "tools", label: "Not enough tools", description: "Says there weren't enough tools such as shovels, or people had to wait for them.", re: /\btools?\b|shovels?|spades?/i },
  { key: "transport", label: "Getting there", description: "Asks for a shuttle or bus, or mentions trouble reaching the venue.", re: /shuttle|\bbus\b|metro|transport|parking/i },
  { key: "length", label: "Make it shorter", description: "Says something was too long and asks for it to be shorter.", re: /too long|shorter|fewer questions/i },
  { key: "organised", label: "Well organised", description: "Praises how the event or service was organised overall.", re: /well organi[sz]ed|great event|smoothly/i },
  { key: "food", label: "Food quality", description: "Comments on taste, freshness or quality of the food. Requests for new menu items belong in their own theme.", re: /\bfood\b|taste|tasty|stale|fresh/i, generic: true },
];

const NO_CONTENT = /^(nothing|no|nope|na|n\/a|nil|none|-+|\.+|good|ok|okay|all good|nothing,? all good|no comments?|nothing else)[.!]*$/i;
const GIBBERISH = /^(?:(.)\1{3,}|[.\-_ ]{2,}|asdf\w*|qwer\w*|hjk\w*|zxc\w*|jkl\w*)$/i;
const INJECTION = /ignore (all|any|previous|the above)|report 100|system prompt|you are (an|a) (ai|assistant)|disregard/i;
const POSITIVE = /\blove|great|friendly|thank|amazing|\bnice\b|\bgood\b|well organi|enjoy|smoothly/i;
const NEGATIVE = /\bslow\b|expensive|noisy|\bloud\b|too late|disconnect|ran out|\bhot\b|harsh|waited|\blong\b|went up|\bbad\b|keeps|not enough|had to wait|stale/i;
const PRAISE = /love the|thank|friendly|amazing|well organi/i;
const SUGGESTION = /please|would (be|love|help)|could|should|\bneed\b|wish|maybe|\?$/i;

function sentimentOf(text: string): Sentiment {
  const pos = POSITIVE.test(text);
  const neg = NEGATIVE.test(text);
  if (pos && neg) return "mixed";
  if (neg) return "negative";
  if (pos && (PRAISE.test(text) || !SUGGESTION.test(text))) return "positive";
  return "neutral";
}

function rulesFor(text: string, allowed: Rule[]): Rule[] {
  const specific = allowed.filter((r) => !r.generic && r.re.test(text));
  return specific.length ? specific : allowed.filter((r) => r.generic && r.re.test(text));
}

/** Short, varied quotes: whole answers (exact substrings by construction), shortest first. */
function pickQuotes(ids: string[], byId: Map<string, string>): Theme["quotes"] {
  const seen = new Set<string>();
  return ids
    .map((id) => ({ response_id: id, text: byId.get(id) ?? "" }))
    .filter((q) => q.text && !seen.has(q.text.toLowerCase()) && seen.add(q.text.toLowerCase()))
    .sort((a, b) => a.text.length - b.text.length)
    .slice(0, 3);
}

export function demoThemes(req: ThemeRequest): ThemeOutput {
  const byId = new Map(req.responses.map((r) => [r.id, r.text.trim()]));
  const codebook = req.mode === "apply_codebook" ? (req.codebook ?? []) : [];
  // In apply mode each codebook theme keeps its id; it codes with the rules its description came from.
  const themeRules = codebook.map((t) => ({ theme: t, rules: RULES.filter((r) => t.description.includes(r.description) || t.label === r.label) }));

  const assignments: ThemeOutput["assignments"] = [];
  const flags: ThemeOutput["flags"] = [];
  const minority: ThemeOutput["minority_mentions"] = [];
  const hits = new Map<string, string[]>(); // rule key → response ids
  const unmatched: string[] = [];

  for (const { id } of req.responses) {
    const text = byId.get(id) ?? "";
    const sentiment = sentimentOf(text);
    if (INJECTION.test(text)) {
      flags.push({ response_id: id, type: "suspected_manipulation", note: "Reads like an instruction to change the results; it was not acted on." });
      assignments.push({ response_id: id, theme_ids: [], sentiment: "neutral", status: "flagged" });
      continue;
    }
    if (GIBBERISH.test(text)) {
      flags.push({ response_id: id, type: "spam", note: "Looks like keyboard mashing, with no point to code." });
      assignments.push({ response_id: id, theme_ids: [], sentiment: "neutral", status: "flagged" });
      continue;
    }
    if (!text || NO_CONTENT.test(text)) {
      assignments.push({ response_id: id, theme_ids: [], sentiment: "neutral", status: "no_content" });
      continue;
    }
    if (req.mode === "apply_codebook") {
      const ids = themeRules.filter((t) => t.rules.some((r) => r.re.test(text))).map((t) => t.theme.theme_id);
      if (ids.length) {
        assignments.push({ response_id: id, theme_ids: ids, sentiment, status: "coded" });
        continue;
      }
    }
    const matched = rulesFor(text, req.mode === "apply_codebook" ? RULES.filter((r) => !themeRules.some((t) => t.rules.includes(r))) : RULES);
    if (matched.length) {
      matched.forEach((r) => hits.set(r.key, [...(hits.get(r.key) ?? []), id]));
      assignments.push({ response_id: id, theme_ids: matched.map((r) => `rule:${r.key}`), sentiment, status: "coded" });
    } else {
      unmatched.push(id);
      assignments.push({ response_id: id, theme_ids: [], sentiment, status: "minority" });
    }
  }

  // A theme needs at least two responses; single mentions become minority mentions.
  const themes: Theme[] = [];
  const candidates: ThemeOutput["candidate_new_themes"] = [];
  const keyToId = new Map<string, string>();
  let next = codebook.reduce((m, t) => Math.max(m, Number(t.theme_id.replace(/\D/g, "")) || 0), 0) + 1;
  for (const rule of RULES) {
    const ids = hits.get(rule.key) ?? [];
    if (ids.length < 2) continue;
    if (req.mode === "apply_codebook") {
      candidates.push({ label: rule.label, description: rule.description, response_ids: ids });
      continue;
    }
    // No hard cap: different ideas are never merged just to keep the list short.
    const themeId = `T${next++}`;
    keyToId.set(rule.key, themeId);
    themes.push({ theme_id: themeId, label: rule.label, description: rule.description, quotes: pickQuotes(ids, byId) });
  }

  for (const a of assignments) {
    if (!a.theme_ids.some((t) => t.startsWith("rule:"))) continue;
    const ids = a.theme_ids.map((t) => keyToId.get(t.slice(5))).filter((t): t is string => !!t);
    if (ids.length) a.theme_ids = ids;
    else {
      a.theme_ids = [];
      a.status = "minority";
      unmatched.push(a.response_id);
    }
  }
  for (const id of unmatched) {
    const text = byId.get(id) ?? "";
    minority.push({ response_id: id, note: text.length > 60 ? `${text.slice(0, 57)}…` : text, quote: text });
  }

  // Coding notes: themes that share responses sit close together.
  const notes: string[] = [];
  for (let i = 0; i < themes.length; i++)
    for (let j = i + 1; j < themes.length; j++) {
      const both = assignments.filter((a) => a.theme_ids.includes(themes[i].theme_id) && a.theme_ids.includes(themes[j].theme_id)).length;
      if (both) notes.push(`Some answers fit both “${themes[i].label}” and “${themes[j].label}”, so they were coded to both. Check whether these are one idea for your decision.`);
    }
  if (req.responses.some((r) => r.text.includes("removed]"))) notes.push("Some answers had personal data masked by code before coding; the masks are kept in quotes.");

  return {
    question_id: req.question.id,
    mode: req.mode,
    themes: req.mode === "apply_codebook" ? codebook.map((t) => ({ ...t, quotes: [] })) : themes,
    assignments,
    minority_mentions: minority,
    candidate_new_themes: candidates,
    flags,
    coding_notes: notes,
  };
}
