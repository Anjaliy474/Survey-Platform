"use client";

import { Check, PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";

type Api = { onInteract: () => void };

/**
 * The three AI suggestions in "Three ways to start". Each one behaves like the Builder:
 * AI output is a draft until the visitor accepts it (DESIGN.md rule 3, §6.3).
 */

/** Bring your questions → a reworded question shown as a diff. */
export function DiffSuggestion({ onInteract }: Api) {
  const [state, setState] = useState<"pending" | "accepted" | "kept">("pending");
  const act = (s: "accepted" | "kept") => {
    onInteract();
    setState(s);
  };
  return (
    <div className={`sugg ${state === "pending" ? "sugg--draft" : ""}`}>
      <div className="sugg__chips">
        {state === "pending" && (
          <>
            <Badge kind="ai">Reworded</Badge>
            <Badge kind="warning">Pushes an answer</Badge>
          </>
        )}
        {state === "accepted" && <Badge kind="human" className="is-pop" />}
        {state === "kept" && <Badge kind="success">Kept as you wrote it</Badge>}
      </div>
      <p className="sugg__text">
        {state === "pending" && (
          <>
            How <del>amazing was</del> <ins>would you rate</ins> our new canteen menu?
          </>
        )}
        {state === "accepted" && "How would you rate our new canteen menu?"}
        {state === "kept" && "How amazing was our new canteen menu?"}
      </p>
      {state === "pending" ? (
        <>
          <p className="sugg__why">Why: “amazing” hints that people should answer positively.</p>
          <div className="sugg__actions">
            <button type="button" className="btn btn--sm btn--primary" onClick={() => act("accepted")}>
              Accept
            </button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => act("kept")}>
              Keep mine
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="btn btn--ghost sugg__reset" onClick={() => setState("pending")}>
          Show the suggestion again
        </button>
      )}
    </div>
  );
}

/** Describe your research → a new question with its role and reason. */
export function NewQuestionSuggestion({ onInteract }: Api) {
  const [added, setAdded] = useState(false);
  return (
    <div className={`sugg ${added ? "" : "sugg--draft"}`}>
      <div className="sugg__chips">
        {added ? <Badge kind="human" className="is-pop" /> : <Badge kind="ai">New</Badge>}
        <span className="role-chip">Behaviour</span>
      </div>
      <p className="sugg__text sugg__text--strong">Which days do you usually visit cafés near campus?</p>
      <p className="sugg__why">Why: what people do today comes before what they say they’d do.</p>
      <div className="sugg__actions">
        {added ? (
          <button type="button" className="btn btn--ghost" onClick={() => setAdded(false)}>
            Undo
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => {
              onInteract();
              setAdded(true);
            }}
          >
            Add to survey
          </button>
        )}
      </div>
    </div>
  );
}

/** Quick prompt → a draft with a [placeholder] to fill before publishing. */
export function DraftSuggestion({ onInteract, estimate }: Api & { estimate: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const filled = name.trim().length > 0 && !editing;

  return (
    <div className="sugg">
      <div className="sugg__chips">
        <Badge kind="ai">Draft</Badge>
        <Badge kind="computed">{estimate}</Badge>
      </div>
      <p className="sugg__text">
        How satisfied were you with{" "}
        {editing ? (
          <input
            ref={inputRef}
            className="ph-input"
            aria-label="Fest name"
            value={name}
            maxLength={24}
            placeholder="fest name"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            className={`ph-chip ${filled ? "is-filled" : ""}`}
            onClick={() => {
              onInteract();
              setEditing(true);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            {filled ? name.trim() : "[fest name]"}
            <PencilSimple size={12} weight="bold" aria-hidden="true" />
          </button>
        )}{" "}
        overall?
      </p>
      <p className={`sugg__why ${filled ? "is-done" : ""}`}>
        {filled ? (
          <>
            <Check size={14} weight="bold" aria-hidden="true" /> All blanks filled. Ready for review.
          </>
        ) : (
          "Tap the marked blank to fill it. Publishing waits until every blank is filled."
        )}
      </p>
    </div>
  );
}
