"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicSurvey, RevealData } from "@/lib/survey/public";
import type { Answer, ResponseRecord, StoryEventType } from "@/lib/survey/types";

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
  const queue = useRef<Pending[]>([]);

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
        writeLocal(key(slug, "response"), data.response.id);
        const pending = readLocal(key(slug, "queue"));
        queue.current = pending ? (JSON.parse(pending) as Pending[]) : [];
        const merged = { ...data.response, answers: { ...data.response.answers } };
        for (const p of queue.current) merged.answers[p.questionId] = p.answer;
        setSurvey(data.survey);
        setResponse(merged);
        setState(data.alreadyAnswered ? "already" : "ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, preview]);

  const flush = useCallback(async () => {
    if (preview || !response) return;
    while (queue.current.length) {
      const next = queue.current[0];
      try {
        const res = await fetch(`/api/play/${slug}/answer`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ responseId: response.id, ...next }),
        });
        if (!res.ok && res.status >= 500) throw new Error("server");
        queue.current.shift();
        setOffline(false);
      } catch {
        setOffline(true);
        break;
      } finally {
        writeLocal(key(slug, "queue"), queue.current.length ? JSON.stringify(queue.current) : null);
      }
    }
  }, [preview, response, slug]);

  useEffect(() => {
    const on = () => void flush();
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, [flush]);

  const answer = useCallback(
    (questionId: string, a: Answer) => {
      setResponse((r) => (r ? { ...r, answers: { ...r.answers, [questionId]: a } } : r));
      if (preview) return;
      queue.current = [...queue.current.filter((p) => p.questionId !== questionId), { questionId, answer: a }];
      writeLocal(key(slug, "queue"), JSON.stringify(queue.current));
      void flush();
    },
    [flush, preview, slug],
  );

  const complete = useCallback(
    async (enjoyment: number | null): Promise<RevealData | null> => {
      if (preview || !response) return null;
      await flush();
      const { data } = await post<{ response: ResponseRecord; reveal: RevealData | null }>(`/api/play/${slug}/complete`, {
        responseId: response.id,
        enjoyment,
      });
      if (data.response) setResponse((r) => (r ? { ...r, completedAt: data.response.completedAt } : r));
      return data.reveal ?? null;
    },
    [flush, preview, response, slug],
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
