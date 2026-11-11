import { Info, Lightbulb, LockSimple, Warning } from "@/components/icons";
import { Badge, ComputedMark } from "@/components/ui/Badge";
import type { BiasFinding } from "@/lib/ai/types";
import { formatAbout } from "@/lib/compute";
import type { StudioSurvey } from "@/lib/studio/types";

const ACTION_LABEL: Record<string, { label: string; kind: "ai" | "success" | "warning" }> = {
  new: { label: "New", kind: "ai" },
  kept: { label: "Kept as is", kind: "success" },
  rewritten: { label: "Reworded", kind: "ai" },
  split: { label: "Split in two", kind: "ai" },
  converted: { label: "Format changed", kind: "ai" },
  flagged_duplicate: { label: "Possible duplicate", kind: "warning" },
};
const CATEGORY: Record<string, string> = {
  leading: "Pushes an answer",
  loaded: "Loaded word",
  presumptive: "Assumes something",
  double_barrelled: "Two questions in one",
  unbalanced_scale: "Unbalanced scale",
  incomplete_options: "Missing an option",
  absolute_wording: "Absolute wording",
  sensitive_not_optional: "Sensitive, should be optional",
};
const TYPE_LABEL: Record<string, string> = {
  single_choice: "Single choice",
  multi_choice: "Multi choice",
  rating_scale: "Scale",
  nps_0_10: "0–10",
  yes_no: "Yes / No",
  number_band: "Bands",
  short_text: "Short text",
  long_text: "Open text",
};

/** Placeholders like [organisation name] render as marigold dashed chips (DESIGN.md §6.2). */
function WithPlaceholders({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/g).map((part, i) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <span key={i} className="ph">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * Read-only view of the AI's draft (step 4). The full builder of build step 5 adds Accept /
 * Edit / Keep mine, bias fixes, reordering and the sticky rules meter on top of this.
 */
export function DraftPreview({ survey }: { survey: StudioSurvey }) {
  const ai = survey.ai!;
  const s = ai.shaper;
  const findings = new Map<string, BiasFinding[]>();
  for (const f of ai.bias.findings) findings.set(f.id, [...(findings.get(f.id) ?? []), f]);
  const toFix = ai.bias.findings.filter((f) => f.severity !== "minor").length;

  return (
    <div className="draft">
      <p className="draft__note">
        <Info size={18} weight="regular" /> Read-only preview. Accepting and editing each suggestion comes with the full builder (build step 5).
      </p>

      <div className="rules-meter" aria-label="Rules check">
        <span className={`rules-meter__item is-${ai.rules.countState}`}>
          Questions {ai.rules.questionCount}/10
          <ComputedMark />
        </span>
        <span className="rules-meter__item">
          {formatAbout(ai.rules.seconds)}
          <ComputedMark />
        </span>
        <span className={`rules-meter__item ${ai.rules.openLastAndOptional ? "is-ok" : "is-warning"}`}>Open {ai.rules.openCount}/2</span>
        <span className={`rules-meter__item ${!ai.rules.consentNeeded || ai.rules.consentPresent ? "is-ok" : "is-blocked"}`}>
          Consent {ai.rules.consentNeeded ? (ai.rules.consentPresent ? "✓" : "missing") : "not needed"}
        </span>
        <span className={`rules-meter__item ${toFix ? "is-warning" : "is-ok"}`}>Bias: {toFix ? `${toFix} to fix` : "clear"}</span>
      </div>

      <section className="card-s ai-summary" aria-labelledby="ai-summary-title">
        <div className="ai-summary__head">
          <Badge kind="ai" />
          <h2 id="ai-summary-title">{s.summary_for_creator}</h2>
        </div>
        {s.decisions_informed.length > 0 && (
          <details open>
            <summary>This survey helps you decide ({s.decisions_informed.length})</summary>
            <ul>
              {s.decisions_informed.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </details>
        )}
        {s.assumptions.length > 0 && (
          <details open={s.mode === "quick_prompt"}>
            <summary>Assumptions ({s.assumptions.length})</summary>
            <ul>
              {s.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {s.status === "needs_clarification" && (
        <div className="status-banner status-banner--info" role="status">
          <strong>A few details would make this better</strong>
          <ul>
            {s.clarifying_questions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p>The starter draft below is based on our assumptions.</p>
        </div>
      )}
      {s.status === "conflict" && (
        <div className="status-banner status-banner--warning" role="status">
          <strong>{s.conflict_explanation}</strong>
          <p>
            Left out for you to decide: {s.cut_questions.length} {s.cut_questions.length === 1 ? "question" : "questions"}.
          </p>
        </div>
      )}
      {s.status === "declined_with_alternative" && (
        <div className="status-banner status-banner--danger" role="status">
          <strong>{s.declined.reason}</strong>
        </div>
      )}
      {s.flags.map((f) => (
        <div key={f} className="status-banner status-banner--danger" role="status">
          <Warning size={18} weight="regular" /> {f}
        </div>
      ))}

      <section className="consent-block" aria-label="Purpose and consent">
        <LockSimple size={18} weight="regular" />
        <div>
          <p>
            <strong>Purpose:</strong> <WithPlaceholders text={s.purpose_line} />
          </p>
          {s.consent_line && (
            <p>
              <strong>Consent:</strong> {s.consent_line}
            </p>
          )}
        </div>
      </section>

      <ol className="draft__questions">
        {s.questions.map((q) => {
          const a = ACTION_LABEL[q.change.action];
          const qFindings = findings.get(q.id) ?? [];
          return (
            <li key={q.id} className={`qcard ${q.change.action === "kept" ? "" : "qcard--draft"}`}>
              <div className="qcard__top">
                <span className="qcard__num">{q.id}</span>
                <h3 className="qcard__text">
                  <WithPlaceholders text={q.text} />
                </h3>
              </div>
              <div className="qcard__chips">
                <span className={`badge badge--${a.kind}`}>{a.label}</span>
                <span className="tag">{TYPE_LABEL[q.type]}</span>
                <span className={`tag tag--role-${q.role}`}>{q.role}</span>
                {!q.required && <span className="tag">Optional</span>}
                {q.sensitive && <span className="tag">Sensitive</span>}
                {q.collects_personal_data && <span className="tag">Personal data</span>}
                {qFindings.map((f) => (
                  <span key={f.category} className={`badge badge--${f.severity === "critical" ? "danger" : f.severity === "major" ? "warning" : "sample"}`}>
                    {CATEGORY[f.category] ?? f.category}
                  </span>
                ))}
              </div>
              {(q.options.length > 0 || q.scale?.point_labels) && (
                <p className="qcard__options">{(q.options.length ? q.options : (q.scale?.point_labels ?? [])).join(" · ")}</p>
              )}
              {q.change.before && q.change.action !== "kept" && (
                <p className="qcard__before">
                  <span>Before:</span> {q.change.before}
                </p>
              )}
              <p className="qcard__why">
                <Badge kind="ai" /> {q.change.why || q.reason}
              </p>
            </li>
          );
        })}
      </ol>

      {s.cut_questions.length > 0 && (
        <details className="card-s">
          <summary>Left out ({s.cut_questions.length})</summary>
          <ul className="draft__cut">
            {s.cut_questions.map((c) => (
              <li key={`${c.source_id}-${c.text}`}>
                {c.text} <span className="field__help">{c.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {s.notes_for_creator.length > 0 && (
        <aside className="tip-card">
          <Lightbulb size={20} weight="regular" />
          <ul>
            {s.notes_for_creator.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
