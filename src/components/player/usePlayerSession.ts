"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicSurvey, RevealData } from "@/lib/survey/public";
import { AnswerQueue } from "@/lib/survey/answer-queue";
import type { Answer, ResponseRecord, StoryEventType } from "@/lib/survey/types";

export type CompleteResult = { ok: true; reveal: RevealData | null } | { ok: false };

export type SessionState = "loading" | "ready" | "not_found" | "already" | "error";

type Pending = { questionId: string; answer: Answer };

const key = (slug: string, what: string) => `playsurvey:${slug}:${what}`;
function readLocal(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function writeLocal(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* private mode: answers still go to the server */
  }
}
function visitorId(): string {
  const existing = readLocal("playsurvey:visitor");
  if (existing) return existing;
  const id = crypto.randomUUID();
  writeLocal("playsurvey:visitor", id);
  return id;
}

async function post<T>(url: string, body: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, data: (await res.json()) as T };
}

/**
 * The respondent's session: starts or resumes a response, saves each answer as it is
 * given, queues answers while offline and resends them, and completes the response.
 * `preview` runs entirely in memory (Studio preview) and never writes.
 */
export function usePlayerSession(slug: string, preview?: PublicSurvey, previewArm: "story" | "plain" = "story") {
  const [state, setState] = useState<SessionState>(preview ? "ready" : "loading");
  const [survey, setSurvey] = useState<PublicSurvey | null>(preview ?? null);
  const [response, setResponse] = useState<ResponseRecord | null>(
    preview
      ? { id: "preview", surveyId: preview.id, arm: previewArm, switchedToPlain: false, answers: {}, startedAt: "", completedAt: null, enjoyment: null, visitorId: "preview" }
      : null,
  );
  const [offline, setOffline] = useState(false);
  const queue = useRef<AnswerQueue | null>(null);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = readLocal(key(slug, "response"));
        const { status, data } = await post<{ survey: PublicSurvey; response: ResponseRecord; alreadyAnswered: boolean }>(
          `/api/play/${slug}`,
          { visitorId: visitorId(), responseId: saved ?? undefined },
        );
        if (cancelled) return;
        if (status === 404) return setState("not_found");
        if (status >= 400) return setState("error");
        const responseId = data.response.id;
        writeLocal(key(slug, "response"), responseId);
        const stored = readLocal(key(slug, "queue"));
        let initial: [string, Answer][] = [];
        try {
          const parsed: unknown = stored ? JSON.parse(stored) : [];
          // Older builds stored [{ questionId, answer }]; this one stores [questionId, answer] pairs.
          if (Array.isArray(parsed)) {
            initial = parsed.map((p) => (Array.isArray(p) ? (p as [string, Answer]) : [(p as Pending).questionId, (p as Pending).answer]));
          }
        } catch {
          initial = [];
        }
        queue.current = new AnswerQueue(
          async (item) => {
            try {
              const res = await fetch(`/api/play/${slug}/answer`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ responseId, ...item }),
              });
              // 4xx can't succeed on retry (bad value, already finished): don't block the queue on it.
              const result = res.ok || res.status < 500 ? "ok" : "retry";
              setOffline(result === "retry");
              return result;
            } catch {
              setOffline(true);
              return "retry";
            }
          },
          (items) => writeLocal(key(slug, "queue"), items.length ? JSON.stringify(items) : null),
          initial,
        );
        const merged = { ...data.response, answers: { ...data.response.answers } };
        for (const [q, a] of initial) merged.answers[q] = a;
        setSurvey(data.survey);
        setResponse(merged);
        setState(data.alreadyAnswered ? "already" : "ready");
        if (initial.length) void queue.current.flush();
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, preview]);

  useEffect(() => {
    const on = () => void queue.current?.flush();
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, []);

  const answer = useCallback(
    (questionId: string, a: Answer) => {
      setResponse((r) => (r ? { ...r, answers: { ...r.answers, [questionId]: a } } : r));
      if (preview) return;
      queue.current?.set(questionId, a);
    },
    [preview],
  );

  /** Completes only once every answer has reached the server; otherwise reports `ok: false`. */
  const complete = useCallback(
    async (enjoyment: number | null): Promise<CompleteResult> => {
      if (preview || !response) return { ok: true, reveal: null };
      const drained = (await queue.current?.flush()) ?? true;
      if (!drained) {
        setOffline(true);
        return { ok: false };
      }
      try {
        const { status, data } = await post<{ response: ResponseRecord; reveal: RevealData | null }>(`/api/play/${slug}/complete`, {
          responseId: response.id,
          enjoyment,
        });
        if (status >= 500 || !data.response) {
          setOffline(true);
          return { ok: false };
        }
        setOffline(false);
        setResponse((r) => (r ? { ...r, completedAt: data.response.completedAt } : r));
        return { ok: true, reveal: data.reveal ?? null };
      } catch {
        setOffline(true);
        return { ok: false };
      }
    },
    [preview, response, slug],
  );

  const logEvent = useCallback(
    (type: StoryEventType, data?: Record<string, string | number>) => {
      if (preview || !response) return;
      void fetch(`/api/play/${slug}/event`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ responseId: response.id, type, data }),
      }).catch(() => undefined);
    },
    [preview, response, slug],
  );

  const switchToPlain = useCallback(() => {
    setResponse((r) => (r ? { ...r, switchedToPlain: true } : r));
    logEvent("story_switch_plain");
  }, [logEvent]);

  return { state, survey, response, offline, answer, complete, logEvent, switchToPlain };
}

export type PlayerSession = ReturnType<typeof usePlayerSession>;
