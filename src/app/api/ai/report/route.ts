import { demoReport } from "@/lib/ai/demo-report";
import type { Reader, ReportOutput } from "@/lib/ai/types";
import type { AnalysisPack } from "@/lib/results/pack";

const READERS: Reader[] = ["creator", "analyst", "leadership"];

/**
 * POST /api/ai/report: insight_report (AI; demo stand-in) on the code-built analysis pack, then
 * code's evidence check: every number in a finding must appear in an entry it cites. Findings
 * that fail are dropped (and logged), along with every reference to them.
 */
export async function POST(request: Request) {
  let body: { reader: Reader; pack: AnalysisPack };
  try {
    body = (await request.json()) as { reader: Reader; pack: AnalysisPack };
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body || !READERS.includes(body.reader) || !Array.isArray(body.pack?.entries)) return Response.json({ error: "bad_request" }, { status: 400 });

  const draft = demoReport(body.pack, body.reader);
  const { report, dropped } = verify(draft, body.pack);
  if (dropped.length) console.warn(`[report] dropped ungrounded findings: ${dropped.join(", ")}`);
  return Response.json({ engine: "demo", report, dropped }, { headers: { "Cache-Control": "no-store" } });
}

const NUM = /[+-]?\d+(?:\.\d+)?/g;
const IDS = /\b(?:[QECTF]\d+|R-[A-Z0-9]+)\b/g;

function grounded(text: string, ids: string[], pack: AnalysisPack): boolean {
  const known = new Set<string>();
  for (const e of pack.entries.filter((x) => ids.includes(x.id))) {
    for (const m of JSON.stringify(e).matchAll(NUM)) {
      known.add(m[0]);
      known.add(m[0].replace(/^\+/, ""));
    }
  }
  return [...text.replace(IDS, "").matchAll(NUM)].every((m) => known.has(m[0]) || known.has(m[0].replace(/^\+/, "")));
}

function verify(r: ReportOutput, pack: AnalysisPack): { report: ReportOutput; dropped: string[] } {
  const dropped: string[] = [];
  const findings = r.findings.filter((f) => {
    const ok = grounded(`${f.title} ${f.statement}`, f.evidence_ids, pack);
    if (!ok) dropped.push(f.finding_id);
    return ok;
  });
  const keep = new Set(findings.map((f) => f.finding_id));
  const first = findings[0];
  return {
    dropped,
    report: {
      ...r,
      headline: first && grounded(r.headline, first.evidence_ids, pack) ? r.headline : first ? `${first.title}.` : "No result could be stated reliably; see data quality.",
      executive_summary: r.executive_summary.filter((s) => keep.has(s.finding_id) && grounded(s.statement, s.evidence_ids, pack)),
      decision_answers: r.decision_answers.map((d) => ({ ...d, finding_ids: d.finding_ids.filter((id) => keep.has(id)) })),
      data_quality: grounded(r.data_quality.summary, ["Q0"], pack) ? r.data_quality : { ...r.data_quality, summary: "See the Overview for completion and flagged responses." },
      findings,
      contradictions_and_surprises: r.contradictions_and_surprises.filter((c) => grounded(c.statement, c.evidence_ids, pack)),
      priorities: r.priorities.filter((p) => keep.has(p.finding_id)),
      recommendations: r.recommendations.map((x) => ({ ...x, finding_ids: x.finding_ids.filter((id) => keep.has(id)) })).filter((x) => x.finding_ids.length),
    },
  };
}
