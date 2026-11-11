"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import type { SurveyRequest } from "@/lib/ai/types";
import { surveyHref } from "@/lib/studio/sections";
import { studio } from "@/lib/studio/store";
import { StepRail } from "../StepRail";
import { TopBar } from "../TopBar";
import { AiWorkingPanel } from "./AiWorkingPanel";
import { useShape } from "./useShape";

/**
 * Shared frame for the three start pages: top bar, step rail (Questions is current), then the
 * form, which the AI working panel replaces on submit. A finished draft is saved as a new
 * survey and opens in the builder.
 */
export function useStartFlow() {
  const { state, run, reset } = useShape();
  const [draftHref, setDraftHref] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);
  const last = useRef<{ request: SurveyRequest; title: string } | null>(null);

  async function submit(request: SurveyRequest, title: string) {
    last.current = { request, title };
    setShowForm(false);
    setDraftHref(null);
    const ai = await run(request);
    if (ai) {
      const survey = studio.createDraft(title, request, ai);
      setDraftHref(surveyHref(survey.id, "build"));
    }
  }

  return {
    state,
    draftHref,
    showForm,
    submit,
    retry: () => {
      if (last.current) void submit(last.current.request, last.current.title);
    },
    edit: () => {
      reset();
      setShowForm(true);
    },
  };
}

export function StartFrame({
  crumb,
  flow,
  children,
}: {
  crumb: string;
  flow: ReturnType<typeof useStartFlow>;
  children: ReactNode;
}) {
  return (
    <>
      <TopBar crumbs={[{ label: "Home", href: "/app" }, { label: "New survey", href: "/app/new" }, { label: crumb }]} />
      <StepRail surveyId="" reached="build" current="build" />
      <main className="page start-page">
        {flow.showForm ? (
          children
        ) : (
          <AiWorkingPanel state={flow.state} draftHref={flow.draftHref} onRetry={flow.retry} onEdit={flow.edit} />
        )}
      </main>
    </>
  );
}

/** Title for a new draft, from what the creator wrote (they can rename it in the builder). */
export function titleFrom(text: string, fallback: string): string {
  const first = text.trim().split(/\r?\n|(?<=[.?!])\s/)[0]?.trim() ?? "";
  if (!first) return fallback;
  const clean = first.replace(/[.?!]+$/, "");
  return clean.length > 60 ? `${clean.slice(0, 57).trimEnd()}…` : clean.charAt(0).toUpperCase() + clean.slice(1);
}
