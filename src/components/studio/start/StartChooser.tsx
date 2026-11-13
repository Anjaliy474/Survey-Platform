"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useId, useState } from "react";
import { ArrowUp, ChartBar } from "@/components/icons";
import { parsePastedQuestions } from "@/lib/ai/parse";
import { writeDraft } from "@/lib/local-draft";
import { TopBar } from "../TopBar";
import { QUESTIONS_INITIAL, QUESTIONS_KEY } from "./BringQuestions";
import { PROMPT_EXAMPLES } from "./QuickPrompt";

/**
 * S2 New survey: one box for every way in. Describe the idea or the decision in a line, or paste
 * questions you already have; two or more pasted questions go to the question review, anything
 * else is drafted from the description.
 */
export function StartChooser() {
  const router = useRouter();
  const id = useId();
  const [text, setText] = useState("");
  const value = text.trim();
  const pasted = parsePastedQuestions(text);
  const asQuestions = pasted.length >= 2;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!value) return;
    if (asQuestions) {
      writeDraft(QUESTIONS_KEY, { ...QUESTIONS_INITIAL, text: value });
      router.push("/app/new/questions");
    } else router.push(`/app/new/prompt?q=${encodeURIComponent(value.slice(0, 200))}&go=1`);
  }

  return (
    <>
      <TopBar crumbs={[{ label: "Home", href: "/app" }, { label: "New survey" }]} />
      <main className="page start">
        <div className="start__head">
          <h1 className="start__title">What do you want to find out?</h1>
          <p>Describe it in a line, or paste questions you already have.</p>
        </div>

        <section className="start__area" aria-label="Start a survey">
          <form onSubmit={submit} className="composer">
            <label htmlFor={`${id}-text`} className="sr-only">
              Your idea, decision or questions
            </label>
            <textarea
              id={`${id}-text`}
              className="composer__input"
              rows={4}
              value={text}
              placeholder={"For example: Feedback for our college fest\nOr: Should our café open on Sundays?\nOr paste your questions, one per line"}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                // Enter drafts a one-liner; with several lines it's a new line, Ctrl/⌘ + Enter submits.
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey || (!e.shiftKey && !text.includes("\n")))) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="composer__bar">
              {value ? (
                <span className="composer__hint" aria-live="polite">
                  {asQuestions ? `${pasted.length} questions found. We’ll check each for bias and fix the wording with you.` : "We’ll draft the questions. You review every one."}
                </span>
              ) : (
                <div className="composer__chips" aria-label="Examples">
                  {PROMPT_EXAMPLES.map((ex) => (
                    <button key={ex} type="button" className="composer__chip" onClick={() => setText(ex)}>
                      {ex}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="submit"
                className="composer__send"
                disabled={!value}
                aria-label={asQuestions ? "Improve my questions" : "Draft my survey"}
                title={asQuestions ? "Improve my questions" : "Draft my survey"}
              >
                <ArrowUp size={18} weight="bold" aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>

        <p className="start__note">
          Already have answers?{" "}
          <Link href="/app/analyse" className="start__switch">
            <ChartBar size={16} weight="regular" aria-hidden="true" /> Analyse existing data
          </Link>
        </p>
      </main>
    </>
  );
}
