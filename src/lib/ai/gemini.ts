import { readFileSync } from "node:fs";
import path from "node:path";
import type { z } from "zod";

/** Gemini 2.5 Flash over REST (Google AI Studio free tier). Server-only. */
const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 45_000;
/** Route handlers have 60 s; every AI chain shares this budget so fallbacks run in time. */
export const AI_BUDGET_MS = 50_000;
const MIN_CALL_MS = 5_000;
const MARGIN_MS = 1_000;

export function aiDeadline(): number {
  return Date.now() + AI_BUDGET_MS;
}

export class AiError extends Error {}

export const NOT_CONNECTED = "AI isn't connected yet. Add a Gemini key or try one of the prepared examples.";
export const NO_RESPONSE = "The AI didn't respond properly. Try again, or use a prepared example.";

export function aiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

let systemPrompt: string | null = null;
function system(): string {
  systemPrompt ??= readFileSync(path.join(process.cwd(), "combined.system.txt"), "utf8");
  return systemPrompt;
}

async function once(rootTag: string, payload: unknown, timeoutMs: number): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system() }] },
      contents: [{ role: "user", parts: [{ text: `<${rootTag}>\n${JSON.stringify(payload)}\n</${rootTag}>` }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new AiError(`${NO_RESPONSE} (HTTP ${res.status})`);
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

/**
 * Calls one stage and parses its JSON through `schema`. A reply that isn't valid JSON
 * or doesn't match the schema is retried once; a second failure throws AiError.
 */
export async function callGemini<T>(
  rootTag: string,
  payload: unknown,
  schema: z.ZodType<T>,
  deadline: number = aiDeadline(),
): Promise<T> {
  if (!aiAvailable()) throw new AiError(NOT_CONNECTED);
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = deadline - Date.now() - MARGIN_MS;
    if (left < MIN_CALL_MS) throw new AiError(`${NO_RESPONSE} (out of time)`);
    try {
      const text = await once(rootTag, payload, Math.min(TIMEOUT_MS, left));
      const parsed = schema.safeParse(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.message;
    } catch (e) {
      if (e instanceof AiError && attempt === 1) throw e;
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new AiError(`${NO_RESPONSE} ${lastError}`.trim());
}
