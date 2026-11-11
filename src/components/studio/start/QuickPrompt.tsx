"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import { Sparkle } from "@/components/icons";
import { useSearchParam } from "@/lib/client-hooks";
import { useLocalDraft, writeDraft } from "@/lib/local-draft";
import { StartFrame, titleFrom, useStartFlow } from "./StartFlow";

export const PROMPT_EXAMPLES = [
  "Feedback for our college fest",
  "Would students pay for a laundry pickup app?",
  "Customer satisfaction for our café",
];
const KEY = "playsurvey:brief:prompt";
const INITIAL = { text: "" };

/** S3c "Quick prompt" (UI_UX_LAYOUT.md): one line is enough. Enter submits. */
export function QuickPrompt() {
  const flow = useStartFlow();
  const [d, setD] = useLocalDraft(KEY, INITIAL);
  const [hint, setHint] = useState(false);
  const fromLink = useSearchParam("q");
  const id = useId();

  // An example chip elsewhere (?q=…) fills the prompt in.
  useEffect(() => {
    if (fromLink) writeDraft(KEY, { text: fromLink.slice(0, 200) });
  }, [fromLink]);

  function go(text: string) {
    if (!text.trim()) {
      setHint(true);
      return;
    }
    setHint(false);
    void flow.submit(
      {
        mode: "quick_prompt",
        input: text.trim(),
        context: { audience: "", decision: "", known: "", anonymous: true, sensitive: false, time_limit_seconds: null },
      },
      titleFrom(text, "New survey"),
    );
  }

  return (
    <StartFrame crumb="Quick prompt" flow={flow}>
      <form
        className="prompt-hero"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          go(d.text);
        }}
      >
        <h1 className="prompt-hero__title" id={`${id}-title`}>
          What’s your survey about?
        </h1>
        <div className="prompt-input">
          <label htmlFor={`${id}-input`} className="sr-only">
            Describe your survey in one line
          </label>
          <input
            id={`${id}-input`}
            value={d.text}
            onChange={(e) => setD({ text: e.target.value })}
            placeholder="For example: feedback for our college fest"
            maxLength={200}
            aria-describedby={`${id}-hint`}
            autoComplete="off"
          />
          <button type="submit" className="btn btn--md btn--ai">
            <Sparkle size={18} /> Draft it
          </button>
        </div>
        <p className="prompt-hero__hint" id={`${id}-hint`} aria-live="polite">
          {hint ? "Type a few words about your survey, or try one of these:" : "One line is enough. You’ll review every question before anything is published."}
        </p>
        <div className="idea-chips" aria-label="Examples">
          {PROMPT_EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="chip"
              onClick={() => {
                setD({ text: ex });
                go(ex);
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>
    </StartFrame>
  );
}
