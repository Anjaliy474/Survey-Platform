"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ShapeEvent, ShapeStage, SurveyRequest } from "@/lib/ai/types";
import type { DraftAi } from "@/lib/studio/types";

/** Minimum time each finished stage stays on screen, so people can read it. Stages are never shown before the server reports them. */
const READABLE_MS = 450;

export type ShapeState =
  | { phase: "idle" }
  | { phase: "working"; done: ShapeStage[] }
  | { phase: "done"; done: ShapeStage[]; ai: DraftAi }
  | { phase: "error"; message: string };

/** Calls POST /api/ai/shape and follows its newline-delimited stage events. */
export function useShape() {
  const [state, setState] = useState<ShapeState>({ phase: "idle" });
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const run = useCallback(async (request: SurveyRequest): Promise<DraftAi | null> => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const done: ShapeStage[] = [];
    setState({ phase: "working", done: [] });
    let lastShown = performance.now();
    const pace = async () => {
      const wait = READABLE_MS - (performance.now() - lastShown);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastShown = performance.now();
    };

    try {
      const res = await fetch("/api/ai/shape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("bad response");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ShapeEvent;
          await pace();
          if (controller.signal.aborted) return null;
          if (event.type === "stage") {
            done.push(event.stage);
            setState({ phase: "working", done: [...done] });
          } else if (event.type === "result") {
            const ai: DraftAi = { engine: event.engine, shaper: event.shaper, bias: event.bias, rules: event.rules, createdAt: Date.now() };
            setState({ phase: "done", done: [...done], ai });
            return ai;
          } else {
            setState({ phase: "error", message: event.message });
            return null;
          }
        }
      }
      throw new Error("stream ended early");
    } catch {
      if (controller.signal.aborted) return null;
      setState({ phase: "error", message: "We couldn’t reach the AI just now. Your input is saved. Try again." });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    abort.current?.abort();
    setState({ phase: "idle" });
  }, []);

  return { state, run, reset };
}
