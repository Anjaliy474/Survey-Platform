import { demoBiasCheck } from "@/lib/ai/demo-bias";
import type { ShapedQuestion, ShaperOutput } from "@/lib/ai/types";

/**
 * POST /api/ai/bias: the bias_checker stage on the builder's current questions ("Check again").
 * DEMO stand-in until the Claude call is connected; returns the combined.system.txt schema.
 */
export async function POST(request: Request) {
  let questions: ShapedQuestion[] = [];
  try {
    const body = (await request.json()) as { questions?: unknown };
    if (Array.isArray(body.questions)) questions = body.questions.slice(0, 40) as ShapedQuestion[];
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const valid = questions.filter((q) => q && typeof q.id === "string" && typeof q.text === "string" && Array.isArray(q.options));
  const shaper = { questions: valid } as unknown as ShaperOutput;
  return Response.json(demoBiasCheck(shaper), { headers: { "Cache-Control": "no-store" } });
}
