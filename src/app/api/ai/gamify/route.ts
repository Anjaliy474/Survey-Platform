import { demoGamify, recommendStyle } from "@/lib/ai/demo-gamifier";
import { checkSurvey } from "@/lib/player/rules";
import type { PlayerSurvey, PlayfulLevel, PresentationStyle, Question } from "@/lib/player/types";

const STYLES: PresentationStyle[] = ["one_per_screen", "pages", "chat", "classic"];
const LEVELS: PlayfulLevel[] = ["off", "light", "medium"];

/**
 * POST /api/ai/gamify: the gamifier stage, then the Mechanics Library + Schema Check in code.
 * DEMO stand-in until the Claude call is connected; the response follows combined.system.txt.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const questions = (Array.isArray(body.questions) ? body.questions : []).slice(0, 20) as Question[];
  if (!questions.length || questions.some((q) => !q || typeof q.id !== "string" || typeof q.text !== "string")) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  // "auto" (first visit to the Style page): use the recommended style.
  const recommendation = recommendStyle(questions);
  const style = body.style === "auto" ? recommendation.style : (STYLES.find((s) => s === body.style) ?? "one_per_screen");
  const level = LEVELS.find((l) => l === body.level) ?? "light";
  const seed = typeof body.seed === "number" ? Math.abs(Math.floor(body.seed)) % 97 : 0;

  const gamified = demoGamify({ questions, style, level, seed });
  const problems = checkSurvey({
    slug: "check",
    status: "live",
    title: "",
    creator: { name: "" },
    theme: "marigold",
    purpose_line: typeof body.purpose_line === "string" && body.purpose_line ? body.purpose_line : "Purpose",
    consent_line: typeof body.consent_line === "string" ? body.consent_line : "",
    questions,
    gamified,
    aggregates: { completed: 0, counts: {}, isSample: false },
  } satisfies PlayerSurvey);

  return Response.json({ engine: "demo", gamified, recommendation, problems }, { headers: { "Cache-Control": "no-store" } });
}
