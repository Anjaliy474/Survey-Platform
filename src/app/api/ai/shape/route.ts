import { demoBiasCheck } from "@/lib/ai/demo-bias";
import { demoShape } from "@/lib/ai/demo-shaper";
import { applyRules } from "@/lib/ai/rules-engine";
import type { ShapeEvent, ShaperMode, SurveyRequest } from "@/lib/ai/types";

const MODES: ShaperMode[] = ["describe_research", "bring_questions", "quick_prompt"];
const MAX_INPUT = 20_000;

/** Validate and normalise the request; anything unexpected becomes a safe default. */
function parse(body: unknown): SurveyRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const mode = MODES.find((m) => m === b.mode);
  const input = typeof b.input === "string" ? b.input.slice(0, MAX_INPUT) : "";
  if (!mode || !input.trim()) return null;
  const c = (b.context && typeof b.context === "object" ? b.context : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 2000) : "");
  const limit = typeof c.time_limit_seconds === "number" && c.time_limit_seconds >= 30 && c.time_limit_seconds <= 1800 ? c.time_limit_seconds : null;
  return {
    mode,
    input,
    context: {
      audience: str(c.audience),
      decision: str(c.decision),
      known: str(c.known),
      anonymous: c.anonymous !== false,
      sensitive: c.sensitive === true,
      time_limit_seconds: limit,
    },
  };
}

/**
 * POST /api/ai/shape: the create pipeline from survey-platform-architecture.mmd
 * (question shaper → bias checker → rules engine + privacy rules), streamed as
 * newline-delimited JSON. A stage event is sent only after that stage has really finished,
 * so the AI working panel never shows fake progress.
 *
 * The shaper and bias checker are DEMO stand-ins (lib/ai/demo-*.ts) until the Claude call is
 * connected; they return the exact combined.system.txt schemas. The rules engine is real.
 */
export async function POST(request: Request) {
  let req: SurveyRequest | null = null;
  try {
    req = parse(await request.json());
  } catch {
    req = null;
  }
  if (!req) {
    return Response.json({ type: "error", message: "We couldn't read that request. Check the form and try again." }, { status: 400 });
  }

  const brief = req;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: ShapeEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        send({ type: "stage", stage: "reading" });
        const shaper = demoShape(brief);
        send({ type: "stage", stage: "shaping" });
        const bias = demoBiasCheck(shaper);
        send({ type: "stage", stage: "bias" });
        const rules = applyRules(shaper, brief.context.time_limit_seconds);
        send({ type: "stage", stage: "rules" });
        send({ type: "result", engine: "demo", shaper, bias, rules });
      } catch {
        send({ type: "error", message: "Something went wrong while drafting. Your input is saved; try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
