"use client";

import type { BiasOutput, ShapedQuestion, ShapeEvent, SurveyRequest } from "./types";

/** Run the create pipeline once and return the final result (no stage display). */
export async function shapeOnce(request: SurveyRequest): Promise<Extract<ShapeEvent, { type: "result" }> | null> {
  try {
    const res = await fetch("/api/ai/shape", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) return null;
    const lines = (await res.text()).trim().split("\n");
    for (const line of lines) {
      const event = JSON.parse(line) as ShapeEvent;
      if (event.type === "result") return event;
    }
    return null;
  } catch {
    return null;
  }
}

/** Re-run the bias_checker stage on the current questions ("Check again"). */
export async function checkBias(questions: ShapedQuestion[]): Promise<BiasOutput | null> {
  try {
    const res = await fetch("/api/ai/bias", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questions }),
    });
    return res.ok ? ((await res.json()) as BiasOutput) : null;
  } catch {
    return null;
  }
}
