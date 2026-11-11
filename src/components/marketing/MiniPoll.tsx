"use client";

import { useState } from "react";

const CHOICES = [
  { id: "yes", face: "👍", label: "Let’s go", reply: "Got it. One line is enough to start." },
  { id: "later", face: "🤔", label: "Not yet", reply: "Got it. The demo poll is up top." },
] as const;

/** The 1-question mini poll in the final call to action. */
export function MiniPoll() {
  const [picked, setPicked] = useState<string | null>(null);
  const reply = CHOICES.find((c) => c.id === picked)?.reply ?? "";

  return (
    <div className="mini-poll">
      <div className="mini-poll__choices" role="radiogroup" aria-label="Ready to make your first survey?">
        {CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={picked === c.id}
            className={`pl-option mini-poll__choice ${picked === c.id ? "is-selected is-pop" : ""}`}
            onClick={() => setPicked(c.id)}
          >
            <span className="mini-poll__face" aria-hidden="true">
              {c.face}
            </span>
            {c.label}
          </button>
        ))}
      </div>
      <p className="mini-poll__reply" aria-live="polite">
        {reply}
      </p>
    </div>
  );
}
