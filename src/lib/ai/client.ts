"use client";

import type { Gamified, PlayfulLevel, PresentationStyle, Question } from "@/lib/player/types";
import type { ToolResult } from "@/lib/results/tools";
import type { AnalysisPack } from "@/lib/results/pack";
import type { AskPlan } from "./demo-ask";
import type { AskAnswer, Reader, ReportOutput, BiasOutput, DashboardRequest, DashboardSpec, SchemaField, ShapedQuestion, ShapeEvent, SurveyRequest, ThemeOutput, ThemeRequest } from "./types";

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

export type GamifyResult = {
  engine: "demo" | "claude";
  gamified: Gamified;
  recommendation: { style: PresentationStyle; reason: string };
  problems: string[];
};

/** Run the gamifier stage: mechanics and on-screen words for a style and playful level. */
export async function gamify(input: {
  questions: Question[];
  style: PresentationStyle | "auto";
  level: PlayfulLevel;
  seed: number;
  purpose_line: string;
  consent_line: string;
}): Promise<GamifyResult | null> {
  try {
    const res = await fetch("/api/ai/gamify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.ok ? ((await res.json()) as GamifyResult) : null;
  } catch {
    return null;
  }
}

/** Run the theme_extractor stage (masking and quote checks happen on the server, in code). */
export async function extractThemes(req: ThemeRequest): Promise<{ engine: "demo" | "claude"; result: ThemeOutput } | null> {
  try {
    const res = await fetch("/api/ai/themes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    return res.ok ? ((await res.json()) as { engine: "demo" | "claude"; result: ThemeOutput }) : null;
  } catch {
    return null;
  }
}

/** Run the dashboard_spec stage; code re-checks the spec on the server before it comes back. */
export async function buildDashboard(req: DashboardRequest): Promise<{ engine: "demo" | "claude"; spec: DashboardSpec; codeNotes: string[] } | null> {
  try {
    const res = await fetch("/api/ai/dashboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    return res.ok ? ((await res.json()) as { engine: "demo" | "claude"; spec: DashboardSpec; codeNotes: string[] }) : null;
  } catch {
    return null;
  }
}

/** chat_with_data, step 1: which tools to call for this question. */
export async function askPlan(question: string, fields: SchemaField[]): Promise<AskPlan | null> {
  try {
    const res = await fetch("/api/ai/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase: "plan", question, fields }) });
    return res.ok ? ((await res.json()) as { plan: AskPlan }).plan : null;
  } catch {
    return null;
  }
}

/** chat_with_data, step 2: the answer from the tool results (grounding is checked on the server). */
export async function askAnswer(question: string, fields: SchemaField[], plan: AskPlan, results: ToolResult[]): Promise<{ answer: AskAnswer; removed: boolean } | null> {
  try {
    const res = await fetch("/api/ai/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase: "answer", question, fields, plan, results }) });
    return res.ok ? ((await res.json()) as { answer: AskAnswer; removed: boolean }) : null;
  } catch {
    return null;
  }
}

/** insight_report on the code-built analysis pack (numbers are checked against it on the server). */
export async function generateReport(reader: Reader, pack: AnalysisPack): Promise<{ report: ReportOutput; dropped: string[] } | null> {
  try {
    const res = await fetch("/api/ai/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reader, pack }) });
    return res.ok ? ((await res.json()) as { report: ReportOutput; dropped: string[] }) : null;
  } catch {
    return null;
  }
}
