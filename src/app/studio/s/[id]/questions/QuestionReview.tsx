"use client";

import { CheckCircle, LockSimple, PencilSimple, Warning } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AiWorkingPanel } from "@/components/studio/AiWorkingPanel";
import { StepRail } from "@/components/studio/StepRail";
import { studioApi, surveyStep } from "@/components/studio/api";
import { Badge } from "@/components/ui/Badge";
import { storyAllowed } from "@/lib/survey/public";
import { formatAbout, plainSeconds } from "@/lib/survey/timing";
import type { BiasReport, Question, QuestionSet, Survey } from "@/lib/survey/types";

const PLACEHOLDER = /\[[^\]]+\]/;
const SEVERITY_CLASS = { critical: "banner--danger", major: "banner--warning", minor: "banner--info" } as const;
const CATEGORY: Record<string, string> = {
  leading: "Pushes an answer",
  loaded: "Loaded wording",
  presumptive: "Assumes something",
  double_barrelled: "Two questions in one",
  unbalanced_scale: "Unbalanced scale",
  incomplete_options: "Missing options",
  overlapping_options: "Overlapping options",
  absolute_wording: "Absolute wording",
  ambiguous: "Unclear wording",
  social_desirability: "Socially loaded",
  sensitive_not_optional: "Sensitive but required",
  order_effect: "Order effect",
  acquiescence: "All agree-worded",
  one_sided_set: "One-sided survey",
};

function withPlaceholders(text: string) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    PLACEHOLDER.test(part) ? (
      <span key={i} className="ph">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** Question review (simplified S4): accept or edit each AI-shaped question before any story is built. */
export function QuestionReview({ id }: { id: string }) {
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void studioApi.get(id).then((r) => {
      if (!r.ok) return setError(r.error);
      setSurvey(r.data.survey);
      setSet(r.data.survey.questionSet);
      if (r.data.survey.questionsApproved) setAccepted(new Set(r.data.survey.questionSet?.questions.map((q) => q.id)));
    });
  }, [id]);

  const bias: BiasReport | null = survey?.bias ?? null;
  const findingsFor = (qid: string) => (bias?.findings ?? []).filter((f) => f.id === qid || f.related_ids.includes(qid));
  const openCritical = useMemo(
    () => (bias?.findings ?? []).filter((f, i) => f.severity === "critical" && !dismissed[`${f.id}-${i}`]),
    [bias, dismissed],
  );

  if (error && !survey) return <p className="banner banner--danger">{error}</p>;
  if (!survey || !set) return <p className="muted">Loading…</p>;

  const blocked = !storyAllowed({ questionSet: set });
  const placeholders = set.questions.filter((q) => PLACEHOLDER.test(q.text) || q.options.some((o) => PLACEHOLDER.test(o)));
  const allAccepted = set.questions.every((q) => accepted.has(q.id));
  const noPurpose = !set.purpose_line.trim();
  const canNext = allAccepted && openCritical.length === 0 && placeholders.length === 0 && set.questions.length <= 15 && !noPurpose;
  const live = survey.status === "live";

  function updateQuestion(qid: string, patch: Partial<Question>) {
    setSet((s) => (s ? { ...s, questions: s.questions.map((q) => (q.id === qid ? { ...q, ...patch } : q)) } : s));
    setAccepted((a) => new Set([...a].filter((x) => x !== qid)));
  }

  async function next() {
    setBusy(true);
    setError("");
    const changed = JSON.stringify(set) !== JSON.stringify(survey!.questionSet);
    if (changed) {
      const r = await studioApi.patch(id, { questionSet: set });
      if (!r.ok) return (setBusy(false), setError(r.error));
    }
    const r = await studioApi.patch(id, { questionsApproved: true });
    if (!r.ok) return (setBusy(false), setError(r.error));
    router.push(`/studio/s/${id}/${blocked ? "publish" : "story"}`);
  }

  if (busy) return <AiWorkingPanel title="Saving and preparing the playful layer" steps={["Saving your questions", "Choosing how each question is answered"]} />;

  return (
    <>
      <StepRail surveyId={id} current="questions" reached={surveyStep(survey, blocked)} storyBlocked={blocked} />
      <div className="s-row s-row--between">
        <h1>Review the questions</h1>
        <span className="badge badge--computed">
          {set.questions.length} questions · {formatAbout(plainSeconds(set.questions))}
        </span>
      </div>

      <div className="s-card">
        <div className="s-row">
          <Badge kind="ai" />
          {survey.prepared && <Badge kind="sample">Prepared example</Badge>}
        </div>
        <p>{set.summary_for_creator}</p>
        {set.assumptions.length > 0 && (
          <details>
            <summary className="s-label">Assumptions ({set.assumptions.length})</summary>
            <ul>
              {set.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {blocked && <p className="banner banner--info">Story Mode is off for sensitive topics, so the survey stays calm and private. You&apos;ll publish a plain survey.</p>}
      {bias?.flags.includes("bias_check_not_run") && <p className="banner banner--warning">{bias.overall_note}</p>}
      {bias && !bias.flags.includes("bias_check_not_run") && (
        <p className={`banner ${bias.findings.length ? "banner--warning" : "banner--success"}`}>
          {bias.findings.length ? <Warning size={18} weight="bold" aria-hidden="true" /> : <CheckCircle size={18} weight="bold" aria-hidden="true" />} {bias.overall_note}
        </p>
      )}

      <div className="lock-block">
        <span className="s-row s-label">
          <LockSimple size={16} weight="bold" aria-hidden="true" /> Purpose and consent (always shown first)
        </span>
        <label className="s-help" htmlFor="purpose">
          Purpose line
        </label>
        <input id="purpose" className="s-input" value={set.purpose_line} disabled={live} onChange={(e) => setSet({ ...set, purpose_line: e.target.value })} />
        {set.consent_line && (
          <>
            <label className="s-help" htmlFor="consent">
              Consent line
            </label>
            <input id="consent" className="s-input" value={set.consent_line} disabled={live} onChange={(e) => setSet({ ...set, consent_line: e.target.value })} />
          </>
        )}
      </div>

      {set.questions.map((q, i) => {
        const findings = findingsFor(q.id);
        const isEditing = editing === q.id;
        const ok = accepted.has(q.id);
        return (
          <article key={q.id} className={`s-card ${ok ? "" : "s-card--draft"} ${findings.some((f) => f.severity === "critical") ? "s-card--danger" : findings.length ? "s-card--flag" : ""}`}>
            <div className="q-card__head">
              <span className="q-card__num">Q{i + 1}</span>
              <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <input className="s-input" aria-label={`Question ${i + 1} text`} value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} />
                ) : (
                  <h3>{withPlaceholders(q.text)}</h3>
                )}
                <div className="s-row">
                  <span className="badge badge--sample">{q.type.replace(/_/g, " ")}</span>
                  <span className="badge badge--sample">{q.role}</span>
                  {!q.required && <span className="badge badge--sample">Optional</span>}
                  {q.sensitive && <span className="badge badge--warning">Sensitive</span>}
                  {ok && <Badge kind="human" />}
                </div>
                {q.options.length > 0 &&
                  (isEditing ? (
                    <div className="s-field">
                      <label className="s-help" htmlFor={`opts-${q.id}`}>
                        Options, one per line
                      </label>
                      <textarea
                        id={`opts-${q.id}`}
                        className="s-textarea"
                        value={q.options.join("\n")}
                        onChange={(e) => updateQuestion(q.id, { options: e.target.value.split("\n") })}
                        onBlur={() => updateQuestion(q.id, { options: q.options.map((o) => o.trim()).filter(Boolean) })}
                      />
                    </div>
                  ) : (
                    <div className="q-card__opts">
                      {q.options.map((o) => (
                        <span key={o} className="q-card__opt">
                          {withPlaceholders(o)}
                        </span>
                      ))}
                    </div>
                  ))}
                {q.scale && (
                  <p className="s-help">
                    {q.scale.points}-point scale: {q.scale.min_label} → {q.scale.max_label}
                  </p>
                )}
                <p className="s-help">
                  <Badge kind="ai" /> {q.reason}
                </p>
                {findings.map((f, k) => {
                  const key = `${f.id}-${(bias?.findings ?? []).indexOf(f)}`;
                  if (dismissed[key] !== undefined) return null;
                  return (
                    <div key={k} className={`banner ${SEVERITY_CLASS[f.severity]}`} style={{ display: "grid" }}>
                      <strong>
                        {CATEGORY[f.category] ?? f.category} {f.confidence === "low" && "(not sure)"}
                      </strong>
                      <span>{f.explanation}</span>
                      {f.suggested_fix.text && <span>Suggested: “{f.suggested_fix.text}”</span>}
                      <span className="s-row">
                        {(f.suggested_fix.text || f.suggested_fix.options.length > 0) && (
                          <button
                            type="button"
                            className="btn btn--sm btn--secondary"
                            onClick={() => {
                              updateQuestion(q.id, {
                                ...(f.suggested_fix.text ? { text: f.suggested_fix.text } : {}),
                                ...(f.suggested_fix.options.length ? { options: f.suggested_fix.options } : {}),
                              });
                              setDismissed((d) => ({ ...d, [key]: "fixed" }));
                            }}
                          >
                            Apply fix
                          </button>
                        )}
                        <DismissButton critical={f.severity === "critical"} onDismiss={(reason) => setDismissed((d) => ({ ...d, [key]: reason }))} />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {!live && (
              <div className="s-row">
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  disabled={ok}
                  onClick={() => {
                    setAccepted((a) => new Set(a).add(q.id));
                    setEditing(null);
                  }}
                >
                  {ok ? "Accepted" : "Accept"}
                </button>
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => setEditing(isEditing ? null : q.id)}>
                  <PencilSimple size={14} weight="bold" aria-hidden="true" /> {isEditing ? "Done editing" : "Edit"}
                </button>
              </div>
            )}
          </article>
        );
      })}

      {error && <p className="banner banner--danger">{error}</p>}
      {!live && (
        <div className="sticky-actions">
          <span className="s-help">
            {!allAccepted
              ? `${set.questions.filter((q) => !accepted.has(q.id)).length} still to accept`
              : noPurpose
                ? "Add a purpose line first"
                : placeholders.length
                ? "Fill every marked blank first"
                : openCritical.length
                  ? "Fix or dismiss the critical flag first"
                  : "All set"}
          </span>
          <span className="s-row">
            <button type="button" className="btn btn--md btn--secondary" onClick={() => setAccepted(new Set(set.questions.map((q) => q.id)))}>
              Accept all
            </button>
            <button type="button" className="btn btn--md btn--primary" disabled={!canNext} onClick={() => void next()}>
              {blocked ? "Next: Publish" : "Next: Story"}
            </button>
          </span>
        </div>
      )}
    </>
  );
}

function DismissButton({ critical, onDismiss }: { critical: boolean; onDismiss: (reason: string) => void }) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  if (!critical) {
    return (
      <button type="button" className="btn btn--sm btn--ghost" onClick={() => onDismiss("")}>
        Dismiss
      </button>
    );
  }
  if (!asking) {
    return (
      <button type="button" className="btn btn--sm btn--ghost" onClick={() => setAsking(true)}>
        Dismiss with a reason
      </button>
    );
  }
  return (
    <span className="s-row">
      <input className="s-input" style={{ width: 220 }} aria-label="Reason for dismissing" value={reason} onChange={(e) => setReason(e.target.value)} />
      <button type="button" className="btn btn--sm btn--secondary" disabled={reason.trim().length < 3} onClick={() => onDismiss(reason.trim())}>
        Dismiss
      </button>
    </span>
  );
}
