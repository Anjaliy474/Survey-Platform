"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Sparkle } from "@/components/icons";
import { parsePastedQuestions } from "@/lib/ai/parse";
import { useLocalDraft } from "@/lib/local-draft";
import { ChoiceChips, TIME_OPTIONS } from "./fields";
import { StartFrame, useStartFlow } from "./StartFlow";

const INITIAL = { text: "", audience: "", decision: "", time: null as number | null };
const CHECKS = [
  "Wording that pushes an answer",
  "Two questions in one",
  "Unbalanced scales",
  "Missing options",
  "Length and order",
  "Personal data",
];

/** S3a "Bring your questions" (UI_UX_LAYOUT.md): paste, see what we detected, improve with AI. */
export function BringQuestions() {
  const flow = useStartFlow();
  const [draft, setDraft] = useLocalDraft("playsurvey:brief:questions", INITIAL);
  const [error, setError] = useState("");
  const textId = useId();
  const parsed = parsePastedQuestions(draft.text);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (parsed.length === 0) {
      setError("Paste at least one question to improve.");
      document.getElementById(textId)?.focus();
      return;
    }
    setError("");
    void flow.submit(
      {
        mode: "bring_questions",
        input: draft.text,
        context: { audience: draft.audience, decision: draft.decision, known: "", anonymous: true, sensitive: false, time_limit_seconds: draft.time },
      },
      draft.decision.trim() ? draft.decision.trim().slice(0, 60) : "Survey from your questions",
    );
  }

  return (
    <StartFrame crumb="Bring your questions" flow={flow}>
      <form className="start-split" onSubmit={submit} noValidate>
        <div className="start-split__main">
          <h1 className="page__title">Paste your questions</h1>
          <div className="field">
            <label className="field__label" htmlFor={textId}>
              Your questions
            </label>
            <textarea
              id={textId}
              className={`textarea textarea--tall ${error ? "is-invalid" : ""}`}
              placeholder={"One question per line. Add options under a question with a dash (- Option)."}
              value={draft.text}
              onChange={(e) => {
                setDraft({ text: e.target.value });
                if (error) setError("");
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${textId}-help ${error ? `${textId}-error` : ""}`}
            />
            <p className="field__help" id={`${textId}-help`}>
              Saved as you type, so nothing is lost if you leave this page.
            </p>
            {error && (
              <p className="field__error" id={`${textId}-error`}>
                {error}
              </p>
            )}
          </div>

          {parsed.length > 0 && (
            <div className="parse-preview" aria-live="polite">
              <p className="parse-preview__count">
                {parsed.length} {parsed.length === 1 ? "question" : "questions"} found
              </p>
              <ol>
                {parsed.slice(0, 20).map((p) => (
                  <li key={p.id}>
                    {p.text}
                    {p.options.length > 0 && <span className="parse-preview__opts"> · {p.options.length} options</span>}
                  </li>
                ))}
              </ol>
              {parsed.length > 20 && <p className="field__help">…and {parsed.length - 20} more</p>}
            </div>
          )}

          <details className="optional-ctx">
            <summary>Optional context</summary>
            <div className="optional-ctx__body">
              <div className="field">
                <label className="field__label" htmlFor={`${textId}-aud`}>
                  Who will answer?
                </label>
                <input id={`${textId}-aud`} className="input" value={draft.audience} onChange={(e) => setDraft({ audience: e.target.value })} placeholder="For example, students in their first year" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`${textId}-dec`}>
                  What decision is this for?
                </label>
                <input id={`${textId}-dec`} className="input" value={draft.decision} onChange={(e) => setDraft({ decision: e.target.value })} placeholder="For example, whether to keep hybrid classes next term" />
              </div>
              <ChoiceChips label="Time limit" options={TIME_OPTIONS} value={draft.time} onChange={(time) => setDraft({ time })} />
            </div>
          </details>

          <div className="start-actions">
            <button type="submit" className="btn btn--lg btn--ai">
              <Sparkle size={18} /> Improve my questions
            </button>
            <button type="button" className="btn btn--lg btn--secondary" disabled aria-describedby={`${textId}-soon`}>
              Import from Google Forms
            </button>
            <span className="badge badge--sample" id={`${textId}-soon`}>
              Soon
            </span>
          </div>
        </div>

        <aside className="helper-card" aria-labelledby={`${textId}-checks`}>
          <h2 id={`${textId}-checks`}>What we’ll check</h2>
          <ul>
            {CHECKS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p>We fix only what needs fixing, explain every change, and leave good questions alone. Nothing changes until you accept it.</p>
        </aside>
      </form>
    </StartFrame>
  );
}
