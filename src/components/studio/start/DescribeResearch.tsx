"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Sparkle } from "@/components/icons";
import { useLocalDraft } from "@/lib/local-draft";
import { ChoiceChips, Segmented, Switch, TIME_OPTIONS } from "./fields";
import { StartFrame, titleFrom, useStartFlow } from "./StartFlow";

const AUDIENCES = ["Customers", "Students", "Employees", "Event attendees", "Other"];
export const RESEARCH_KEY = "playsurvey:brief:research";
export const RESEARCH_INITIAL = {
  decision: "",
  audience: "",
  audienceOther: "",
  known: "",
  privacy: "anonymous" as "anonymous" | "contact",
  time: 120 as number | null,
  sensitive: false,
};

/** S3b "Describe your research" (UI_UX_LAYOUT.md): a friendly brief; only the decision is required. */
export function DescribeResearch() {
  const flow = useStartFlow();
  const [d, setD] = useLocalDraft(RESEARCH_KEY, RESEARCH_INITIAL);
  const [error, setError] = useState("");
  const id = useId();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!d.decision.trim()) {
      setError("Tell us the decision this survey should help you make.");
      document.getElementById(`${id}-decision`)?.focus();
      return;
    }
    setError("");
    const audience = d.audience === "Other" ? d.audienceOther.trim() : d.audience;
    void flow.submit(
      {
        mode: "describe_research",
        input: d.decision,
        context: {
          audience,
          decision: d.decision,
          known: d.known,
          anonymous: d.privacy === "anonymous",
          sensitive: d.sensitive,
          time_limit_seconds: d.time,
        },
      },
      titleFrom(d.decision, "New research survey"),
    );
  }

  return (
    <StartFrame crumb="Describe your research" flow={flow}>
      <form className="brief" onSubmit={submit} noValidate>
        <h1 className="page__title">Describe your research</h1>
        <p className="brief__intro">Tell us what you need to decide. We’ll suggest what to ask, with a reason for every question.</p>

        <div className="field">
          <label className="field__label" htmlFor={`${id}-decision`}>
            What decision should this survey help you make? <span className="field__req">Required</span>
          </label>
          <textarea
            id={`${id}-decision`}
            className={`textarea ${error ? "is-invalid" : ""}`}
            value={d.decision}
            onChange={(e) => {
              setD({ decision: e.target.value });
              if (error) setError("");
            }}
            placeholder="For example: We run a café near campus. Should we open on Sundays?"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {error && (
            <p className="field__error" id={`${id}-error`}>
              {error}
            </p>
          )}
        </div>

        <ChoiceChips label="Who will answer?" options={AUDIENCES.map((a) => ({ value: a, label: a }))} value={d.audience} onChange={(audience) => setD({ audience })} />
        {d.audience === "Other" && (
          <div className="field">
            <label className="field__label" htmlFor={`${id}-other`}>
              Who, exactly?
            </label>
            <input id={`${id}-other`} className="input" value={d.audienceOther} onChange={(e) => setD({ audienceOther: e.target.value })} />
          </div>
        )}

        <div className="field">
          <label className="field__label" htmlFor={`${id}-known`}>
            Anything you already know or suspect? <span className="field__opt">Optional</span>
          </label>
          <textarea id={`${id}-known`} className="textarea textarea--short" value={d.known} onChange={(e) => setD({ known: e.target.value })} />
        </div>

        <Segmented
          label="Is it anonymous?"
          options={[
            { value: "anonymous", label: "Anonymous" },
            { value: "contact", label: "Need some contact details" },
          ]}
          value={d.privacy}
          onChange={(privacy) => setD({ privacy })}
        />

        <ChoiceChips label="Time limit" options={TIME_OPTIONS} value={d.time} onChange={(time) => setD({ time })} />

        <Switch
          label="Sensitive topic"
          help={d.sensitive ? "Answers will be anonymous and every sensitive question optional." : "Health, money, the workplace or identity."}
          checked={d.sensitive}
          onChange={(sensitive) => setD({ sensitive })}
        />

        <div className="start-actions">
          <button type="submit" className="btn btn--lg btn--ai">
            <Sparkle size={18} /> Suggest questions
          </button>
        </div>
      </form>
    </StartFrame>
  );
}
