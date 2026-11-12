/**
 * DEMO stand-in for the insight_report stage (combined.system.txt). It reads the code-built
 * analysis pack and writes the report JSON: data quality first, findings that cite evidence IDs
 * and copy their numbers exactly, hypotheses always marked as not proven, and the same facts
 * for every reader at a different depth. The Claude version replaces this file.
 */
import type { AnalysisPack, PackEntry } from "@/lib/results/pack";
import type { Finding, Level, Reader, ReportOutput } from "./types";

const pctOf = (s: string) => Number(/(\d+)%/.exec(s)?.[1] ?? NaN);

export function demoReport(pack: AnalysisPack, reader: Reader): ReportOutput {
  const q0 = pack.entries.find((e) => e.id === "Q0") as PackEntry;
  const dists = pack.entries.filter((e) => e.kind === "distribution");
  const ratings = dists.filter((e) => e.display.includes("positive"));
  const nps = pack.entries.find((e) => e.kind === "nps");
  const crosstabs = pack.entries.filter((e) => e.kind === "crosstab");
  const themes = pack.entries.filter((e) => e.kind === "theme");
  const minority = pack.entries.filter((e) => e.kind === "minority");
  const analyst = reader === "analyst";
  const lead = reader === "leadership";
  const findings: Finding[] = [];
  let f = 1;
  const add = (x: Omit<Finding, "finding_id" | "chart">) => {
    const id = `F${f++}`;
    findings.push({ ...x, finding_id: id, chart: null });
    return id;
  };

  // 1 · The clearest difference between groups, if one survives correction.
  const strong = crosstabs
    .filter((c) => c.test?.p_adj_label === "significant" && c.test.effect_label !== "negligible" && c.highest && c.lowest)
    .sort((a, b) => parseFloat(b.test!.effect.split("= ")[1]) - parseFloat(a.test!.effect.split("= ")[1]))[0];
  const weak = crosstabs.filter((c) => c !== strong && c.highest && c.lowest && c.details.length).sort((a, b) => a.test!.p.localeCompare(b.test!.p))[0];
  if (strong) {
    const [hi, lo] = strong.details[0].split(" vs ");
    add({
      title: `${strong.label}: ${strong.highest} leads, ${strong.lowest} trails`,
      statement:
        `${hi} compared with ${lo}, across ${strong.base} responses.` +
        (analyst ? ` ${strong.test!.name}: ${strong.test!.statistic}, ${strong.test!.p_adj}; ${strong.test!.effect} (${strong.test!.effect_label}).` : ""),
      evidence_type: "association",
      evidence_ids: [strong.id],
      who_it_affects: `People who answered “${strong.lowest}”.`,
      counter_evidence: strong.small_groups?.length ? `Some groups are small: ${strong.small_groups.join(", ")}.` : "",
      interpretation: { hypothesis: `Something about the experience at ${strong.lowest} may differ, such as how it’s prepared or served. This is a guess, not a finding.`, how_to_test: `Ask a follow-up at ${strong.lowest} about what made the experience worse, or compare it again after one change.` },
      practical_importance: strong.test!.effect_label === "small" ? "The gap is real but small; check it’s worth acting on before investing." : "The gap is large enough to matter in practice.",
      implication: `Look at ${strong.lowest} first.`,
      confidence: strong.small_groups?.length ? "medium" : strong.test!.effect_label === "small" ? "medium" : "high",
      confidence_reason: `Significant after Holm correction, ${strong.test!.effect_label} effect${strong.small_groups?.length ? ", but some groups are small" : ""}.`,
    });
  }

  // 2 · The single most-mentioned point in the written answers.
  const topTheme = themes.find((t) => t.details.includes("Single most mentioned"));
  if (topTheme) {
    add({
      title: `Most written answers ask for: ${topTheme.label.toLowerCase()}`,
      statement: `“${topTheme.label}” came up in ${topTheme.display}.`,
      evidence_type: "observed",
      evidence_ids: [topTheme.id],
      who_it_affects: "People who wrote an answer; not everyone writes one.",
      counter_evidence: "",
      interpretation: { hypothesis: "People may be telling you about a gap they feel each visit. This is a guess, not a finding.", how_to_test: `Ask everyone a closed question about it next time, for example “Would you use ${topTheme.label.toLowerCase()}?”` },
      practical_importance: "Written answers show what’s on people’s minds, not how many share the view.",
      implication: "A strong candidate for the next change, worth testing with a closed question first.",
      confidence: "medium",
      confidence_reason: "Observed in themes only; written answers come from a subset of people.",
    });
  }

  // 3 · The headline rating.
  const main = ratings[0];
  if (main) {
    add({
      title: `${main.label}: ${main.display.split(" (")[0]}`,
      statement:
        `${main.display.split(" ")[0]} of people rated ${main.label.toLowerCase()} on the positive side, across ${/n = (\d+)/.exec(main.display)?.[1] ?? ""} responses.` +
        (analyst ? ` Distribution: ${main.details.join(", ")}.` : ""),
      evidence_type: "observed",
      evidence_ids: [main.id],
      who_it_affects: "Everyone who answered.",
      counter_evidence: "",
      interpretation: { hypothesis: "", how_to_test: "" },
      practical_importance: pctOf(main.display) >= 70 ? "Most people are positive, so the gains are in the minority who aren’t." : "A large share isn’t positive; this is worth attention.",
      implication: pctOf(main.display) >= 70 ? "Protect what works while fixing the weaker spots." : "Treat this as a priority area.",
      confidence: "high",
      confidence_reason: "A direct count with an adequate base.",
    });
  }

  // 3b · The clearest single choice in a category or several-picks question.
  const pick = dists.find((d) => !d.display.includes("positive") && d.highest && d.details.some((x) => x.endsWith("of people")));
  if (pick) {
    add({
      title: `${pick.label}: “${pick.highest}” leads`,
      statement: `${pick.display.replace(" (n = ", " of people picked it, across ").replace(")", " responses")}. People could pick several.`,
      evidence_type: "observed",
      evidence_ids: [pick.id],
      who_it_affects: "Everyone who answered.",
      counter_evidence: "",
      interpretation: { hypothesis: "", how_to_test: "" },
      practical_importance: "Shows what people would welcome, not whether they’d come more often because of it.",
      implication: `“${pick.highest}” is the safest first pick.`,
      confidence: "high",
      confidence_reason: "A direct count with an adequate base.",
    });
  }

  // 4 · NPS, and whether it agrees with the rating.
  if (nps) {
    add({
      title: `Net Promoter Score: ${nps.display.split(" (")[0].replace("NPS ", "")}`,
      statement: `${nps.display}, from ${nps.details.join(" and ")}.` + (lead ? "" : " NPS is the share of promoters minus the share of detractors."),
      evidence_type: "observed",
      evidence_ids: [nps.id],
      who_it_affects: "Everyone who answered the recommendation question.",
      counter_evidence: "",
      interpretation: { hypothesis: "", how_to_test: "" },
      practical_importance: "NPS swings with small changes in a few answers; watch the trend, not one reading.",
      implication: "Use it as a trend to watch after changes.",
      confidence: "high",
      confidence_reason: "A direct count with an adequate base.",
    });
  }

  // 5 · A weaker signal worth checking (not significant after correction).
  if (weak && !lead && weak.test?.p_adj_label === "not_significant") {
    add({
      title: `Possible difference in ${weak.label.toLowerCase()}`,
      statement: `${weak.details[0]}, across ${weak.base} responses.` + (analyst ? ` ${weak.test.statistic}, ${weak.test.p_adj}.` : ""),
      evidence_type: "association",
      evidence_ids: [weak.id],
      who_it_affects: `People who answered “${weak.lowest}”.`,
      counter_evidence: "Not significant after correcting for the number of comparisons.",
      interpretation: { hypothesis: "It may be noise.", how_to_test: "Check it again with more responses." },
      practical_importance: "Too uncertain to act on yet.",
      implication: "Keep an eye on it; don’t act on it alone.",
      confidence: "low",
      confidence_reason: "Not significant after Holm correction.",
    });
  }

  const shown = lead ? findings.slice(0, 3) : findings;
  const quality = `${q0.display}. ${q0.details.join(". ")}.`;
  const decisions = pack.decisions_informed.map((d) => {
    const dl = d.toLowerCase();
    const match = shown.find((x) => x.title.toLowerCase().split(/\W+/).some((w) => w.length >= 4 && dl.includes(w)));
    return match
      ? { decision: d, what_the_data_says: `${match.title}. See ${match.finding_id}.`, finding_ids: [match.finding_id], confidence: match.confidence }
      : { decision: d, what_the_data_says: "The survey cannot answer this directly: no question measured it. See the unanswered questions below.", finding_ids: [], confidence: "low" as Level };
  });

  const contradictions: ReportOutput["contradictions_and_surprises"] = [];
  if (main && nps && pctOf(main.display) >= 70 && /NPS [+-]?\d/.test(nps.display) && Number(/NPS ([+-]?\d+)/.exec(nps.display)?.[1]) < 30) {
    contradictions.push({ statement: `${main.label} is ${main.display.split(" (")[0]}, yet the ${nps.display.split(" (")[0]}: people are pleased but not yet eager to recommend.`, evidence_ids: [main.id, nps.id] });
  }

  const priorities = shown.map((x) => ({
    finding_id: x.finding_id,
    frequency: (x.evidence_type === "observed" && x.evidence_ids[0].startsWith("E") ? "high" : "medium") as Level,
    severity: (x.evidence_type === "association" ? "medium" : "low") as Level,
    evidence_strength: x.confidence,
    feasibility: "unknown" as const,
    why_this_rank: x.evidence_type === "association" ? "A clear gap between groups that points to a specific place to act." : x.evidence_ids[0].startsWith("T") ? "A recurring request in people’s own words." : "Sets the baseline to measure changes against.",
  }));
  const rank = (p: (typeof priorities)[number]) => ({ high: 3, medium: 2, low: 1 })[p.evidence_strength] + ({ high: 3, medium: 2, low: 1 })[p.severity];
  priorities.sort((a, b) => rank(b) - rank(a));

  const recs: ReportOutput["recommendations"] = [];
  const assoc = shown.find((x) => x.evidence_type === "association" && x.confidence !== "low");
  if (assoc) recs.push({ horizon: "now", action: assoc.implication, finding_ids: [assoc.finding_id], metric_to_watch: `Share positive in the same comparison (${assoc.evidence_ids[0]})` });
  const themeF = shown.find((x) => x.evidence_ids[0]?.startsWith("T"));
  if (themeF) recs.push({ horizon: "next", action: "Test the most-requested change with a small pilot, and ask everyone a closed question about it.", finding_ids: [themeF.finding_id], metric_to_watch: "Share who say they would use it" });
  const npsF = shown.find((x) => x.evidence_ids.includes(nps?.id ?? "-"));
  if (npsF) recs.push({ horizon: "later", action: "Run the same survey again after changes to see whether recommendation moves.", finding_ids: [npsF.finding_id], metric_to_watch: "Net Promoter Score" });

  const limitations = [
    `These are ${pack.n_finished} people who chose to answer, not a random sample, so results describe them rather than all customers.`,
    "Differences between groups are associations: they show what goes together, not what causes it.",
    ...(q0.details[1] && !q0.details[1].startsWith("0 ") ? ["Flagged responses were left out; the Responses page shows them, and results with them included are close."] : []),
  ];
  const unanswered: ReportOutput["unanswered_questions"] = [];
  if (assoc) unanswered.push({ question: `Why does the lowest group trail?`, why_it_matters: "Knowing the reason tells you what to change.", suggested_survey_question: "What, if anything, made your last visit worse than usual?" });
  unanswered.push({ question: "Would people come more often if the top request were added?", why_it_matters: "It turns a request into a decision with expected impact.", suggested_survey_question: "If we added this, how often would you visit? (Less often / About the same / More often)" });

  const headlineFinding = shown[0];
  return {
    reader,
    headline: headlineFinding ? `${headlineFinding.title}.` : `${pack.n_finished} people answered; no single result stands out yet.`,
    executive_summary: shown.slice(0, lead ? 3 : 5).map((x) => ({ finding_id: x.finding_id, statement: x.title + ".", evidence_ids: x.evidence_ids })),
    decision_answers: decisions,
    data_quality: { summary: quality, evidence_ids: ["Q0"], could_change_conclusions: "" },
    findings: shown,
    segments: { status: "not_run", note: pack.segments.reason, profiles: [] },
    say_vs_do_gaps: [],
    contradictions_and_surprises: contradictions,
    minority_views: lead ? [] : minority.map((m) => ({ statement: "A point only one person made, worth a look.", quote: m.quote as { response_id: string; text: string } })),
    priorities,
    recommendations: recs,
    limitations: lead ? limitations.slice(0, 1) : limitations,
    unanswered_questions: lead ? unanswered.slice(0, 1) : unanswered,
    flags: [],
  };
}
