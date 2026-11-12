import { type AskPlan, demoPlan, demoWrite } from "@/lib/ai/demo-ask";
import type { AskAnswer, SchemaField } from "@/lib/ai/types";
import type { ToolResult } from "@/lib/results/tools";

type Body =
  | { phase: "plan"; question: string; fields: SchemaField[] }
  | { phase: "answer"; question: string; fields: SchemaField[]; plan: AskPlan; results: ToolResult[] };

const FALLBACK = "I couldn’t answer that reliably. Try rephrasing.";

/**
 * POST /api/ai/ask: chat_with_data (demo stand-in) in two calls. `plan` returns the tool calls;
 * the client runs them in code (the data never leaves the compute engine); `answer` writes the
 * reply from the results. Code then checks every number in the answer against the tool results
 * and replaces any answer with an ungrounded number.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body || typeof body.question !== "string" || !body.question.trim() || body.question.length > 400 || !Array.isArray(body.fields)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (body.phase === "plan") {
    return Response.json({ engine: "demo", plan: demoPlan(body.question, body.fields) }, { headers: { "Cache-Control": "no-store" } });
  }
  if (body.phase !== "answer" || !Array.isArray(body.results) || !body.plan) return Response.json({ error: "bad_request" }, { status: 400 });

  const draft = demoWrite(body.question, body.plan, body.results, body.fields);
  const ungrounded = ungroundedNumbers(draft.answer, body.results);
  if (ungrounded.length) {
    console.warn(`[ask] removed an answer with ungrounded numbers: ${ungrounded.join(", ")}`);
    const safe: AskAnswer = { ...draft, answer: FALLBACK, quotes: [], suggested_chart: null, evidence: [] };
    return Response.json({ engine: "demo", answer: safe, removed: true }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ engine: "demo", answer: draft, removed: false }, { headers: { "Cache-Control": "no-store" } });
}

/** Every number in the answer must appear in a tool result (response and question IDs aside). */
function ungroundedNumbers(answer: string, results: ToolResult[]): string[] {
  const NUM = /[+-]?\d+(?:\.\d+)?/g;
  const known = new Set<string>();
  for (const m of JSON.stringify(results).matchAll(NUM)) {
    known.add(m[0]);
    known.add(m[0].replace(/^\+/, ""));
  }
  const text = answer.replace(/\bR-[A-Z0-9]+\b/g, "").replace(/\bQ\d+\b/g, "");
  return [...text.matchAll(NUM)].map((m) => m[0]).filter((n) => !known.has(n) && !known.has(n.replace(/^\+/, "")));
}
