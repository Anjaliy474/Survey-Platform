import { demoThemes } from "@/lib/ai/demo-themes";
import { maskPersonalData } from "@/lib/ai/masking";
import type { ThemeOutput, ThemeRequest } from "@/lib/ai/types";

const MAX_RESPONSES = 2000;

/**
 * POST /api/ai/themes: personal-data masking (code) → theme_extractor (AI; demo stand-in) →
 * quote verification (code). Every quote must be an exact substring of the masked response it
 * cites and that response must be assigned to the theme; anything else is dropped and logged.
 */
export async function POST(request: Request) {
  let body: ThemeRequest;
  try {
    body = (await request.json()) as ThemeRequest;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const valid =
    body &&
    typeof body.question?.id === "string" &&
    typeof body.question?.text === "string" &&
    (body.mode === "discover" || body.mode === "apply_codebook") &&
    Array.isArray(body.responses) &&
    body.responses.length <= MAX_RESPONSES &&
    body.responses.every((r) => typeof r?.id === "string" && typeof r?.text === "string");
  if (!valid) return Response.json({ error: "bad_request" }, { status: 400 });

  // Responses are data, never instructions: they only ever travel as masked text with an ID.
  const responses = body.responses.map((r) => ({ id: r.id, text: maskPersonalData(r.text).slice(0, 2000) }));
  const output = demoThemes({ ...body, responses });
  const { result, dropped } = verify(output, new Map(responses.map((r) => [r.id, r.text])));
  if (dropped.length) console.warn(`[themes] dropped ${dropped.length} quote(s) that weren't exact substrings`, dropped);

  return Response.json({ engine: "demo", result, droppedQuotes: dropped.length }, { headers: { "Cache-Control": "no-store" } });
}

function verify(out: ThemeOutput, text: Map<string, string>): { result: ThemeOutput; dropped: string[] } {
  const dropped: string[] = [];
  const assigned = (rid: string, tid: string) => out.assignments.some((a) => a.response_id === rid && a.theme_ids.includes(tid));
  const themes = out.themes.map((t) => ({
    ...t,
    quotes: t.quotes.filter((q) => {
      const ok = !!q.text && (text.get(q.response_id) ?? "").includes(q.text) && assigned(q.response_id, t.theme_id);
      if (!ok) dropped.push(`${t.theme_id}/${q.response_id}`);
      return ok;
    }),
  }));
  // No theme without quotes (discover mode); apply mode keeps the existing codebook's quotes client-side.
  const keep = out.mode === "discover" ? themes.filter((t) => t.quotes.length > 0) : themes;
  const keepIds = new Set(keep.map((t) => t.theme_id));
  const minority = out.minority_mentions.filter((m) => {
    const ok = (text.get(m.response_id) ?? "").includes(m.quote);
    if (!ok) dropped.push(`minority/${m.response_id}`);
    return ok;
  });
  return {
    result: {
      ...out,
      themes: keep,
      assignments: out.assignments.map((a) => ({ ...a, theme_ids: a.theme_ids.filter((id) => keepIds.has(id)) })),
      minority_mentions: minority,
    },
    dropped,
  };
}
