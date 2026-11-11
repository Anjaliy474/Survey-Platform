"use client";

import type { DragEvent, ReactNode } from "react";
import { useId, useState } from "react";
import { Check, Trash } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { Menu } from "@/components/ui/Menu";
import type { BiasFinding, ShapedQuestion } from "@/lib/ai/types";
import { wordDiff } from "@/lib/diff";
import type { BuilderItem } from "@/lib/studio/builder";
import { QuestionEditor } from "./QuestionEditor";

export const CATEGORY_LABEL: Record<string, string> = {
  leading: "Pushes an answer",
  loaded: "Loaded word",
  presumptive: "Assumes something",
  double_barrelled: "Two questions in one",
  unbalanced_scale: "Unbalanced scale",
  incomplete_options: "Missing an option",
  overlapping_options: "Options overlap",
  absolute_wording: "Absolute wording",
  ambiguous: "Unclear wording",
  social_desirability: "Socially loaded",
  sensitive_not_optional: "Sensitive, should be optional",
};
const CHANGE: Record<string, { label: string; kind: "ai" | "success" | "warning" }> = {
  new: { label: "New", kind: "ai" },
  kept: { label: "Kept as is", kind: "success" },
  rewritten: { label: "Reworded", kind: "ai" },
  split: { label: "Split in two", kind: "ai" },
  converted: { label: "Format changed", kind: "ai" },
  flagged_duplicate: { label: "Possible duplicate", kind: "warning" },
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
const SEVERITY_BADGE = { critical: "danger", major: "warning", minor: "sample" } as const;

/** Question text with [placeholders] as chips and bias evidence underlined in its severity colour. */
function MarkedText({ text, findings }: { text: string; findings: BiasFinding[] }) {
  const marks = findings.filter((f) => f.location === "text" && text.includes(f.evidence));
  const parts: ReactNode[] = [];
  let rest = text;
  let k = 0;
  while (rest) {
    const hit = marks
      .map((f) => ({ f, at: rest.indexOf(f.evidence) }))
      .filter((h) => h.at >= 0)
      .sort((a, b) => a.at - b.at)[0];
    const chunk = hit ? rest.slice(0, hit.at) : rest;
    chunk.split(/(\[[^\]]+\])/g).forEach((p) =>
      parts.push(
        /^\[[^\]]+\]$/.test(p) ? (
          <span key={k++} className="ph">
            {p}
          </span>
        ) : (
          p
        ),
      ),
    );
    if (!hit) break;
    parts.push(
      <mark key={k++} className={`evidence evidence--${hit.f.severity}`}>
        {hit.f.evidence}
      </mark>,
    );
    rest = rest.slice(hit.at + hit.f.evidence.length);
  }
  return <>{parts}</>;
}

export function QuestionCard({
  item,
  index,
  total,
  findings,
  focused,
  flash,
  onAccept,
  onKeepMine,
  onRemove,
  onKeepBoth,
  onEdit,
  onMove,
  onApplyFix,
  onDismiss,
  dnd,
  editing,
  setEditing,
  openFinding,
  setOpenFinding,
}: {
  item: BuilderItem;
  index: number;
  total: number;
  findings: BiasFinding[];
  focused: boolean;
  flash: boolean;
  onAccept: () => void;
  onKeepMine: () => void;
  onRemove: () => void;
  onKeepBoth: () => void;
  onEdit: (patch: Partial<ShapedQuestion>) => void;
  onMove: (delta: number) => void;
  onApplyFix: (f: BiasFinding) => void;
  onDismiss: (f: BiasFinding, reason: string) => void;
  dnd: { onDragStart: (e: DragEvent) => void; onDragOver: (e: DragEvent) => void; onDrop: (e: DragEvent) => void; over: boolean };
  editing: boolean;
  setEditing: (v: boolean) => void;
  openFinding: string | null;
  setOpenFinding: (category: string | null) => void;
}) {
  const q = item.question;
  const [reason, setReason] = useState("");
  const titleId = useId();
  const action = q.change.action;
  const pending = item.status === "pending";
  const showDiff = pending && item.original && action !== "flagged_duplicate" && action !== "new";
  const change = CHANGE[action] ?? CHANGE.new;
  const finding = findings.find((f) => f.category === openFinding);
  const optionLine = q.options.length ? q.options : (q.scale?.point_labels ?? (q.scale ? [`${q.scale.min_label} … ${q.scale.max_label}`] : []));

  return (
    <article
      id={`card-${item.key}`}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={`qcard ${pending ? "qcard--draft" : "qcard--solid"} ${focused ? "is-focused" : ""} ${dnd.over ? "is-drop" : ""} ${findings.some((f) => f.severity === "critical") ? "qcard--flag-critical" : findings.length ? "qcard--flag" : ""}`}
      onDragOver={dnd.onDragOver}
      onDrop={dnd.onDrop}
    >
      <div className="qcard__top">
        <span className="qcard__handle" draggable onDragStart={dnd.onDragStart} title="Drag to reorder" aria-hidden="true">
          ⠿
        </span>
        <span className="qcard__num">Q{index + 1}</span>
        <h3 className="qcard__text" id={titleId}>
          <MarkedText text={q.text} findings={findings} />
        </h3>
        <Menu
          label={`More actions for question ${index + 1}`}
          items={[
            { label: "Edit", onSelect: () => setEditing(true) },
            ...(index > 0 ? [{ label: "Move up", onSelect: () => onMove(-1) }] : []),
            ...(index < total - 1 ? [{ label: "Move down", onSelect: () => onMove(1) }] : []),
            { label: "Delete", Icon: Trash, danger: true, onSelect: onRemove },
          ]}
        />
      </div>

      <div className="qcard__chips">
        {(pending || item.status === "accepted") && action !== "kept" && <span className={`badge badge--${change.kind}`}>{change.label}</span>}
        {flash && (
          <span className="badge badge--human badge--flash">
            <Check size={12} /> You approved
          </span>
        )}
        <span className="tag">{TYPE_LABEL[q.type]}</span>
        <span className={`tag tag--role-${q.role}`}>{q.role}</span>
        {!q.required && <span className="tag">Optional</span>}
        {q.sensitive && <span className="tag">Sensitive</span>}
        {q.collects_personal_data && <span className="tag">Personal data</span>}
        {findings.map((f) => (
          <button
            key={f.category}
            type="button"
            className={`badge badge--${SEVERITY_BADGE[f.severity]} bias-chip`}
            aria-expanded={openFinding === f.category}
            onClick={() => setOpenFinding(openFinding === f.category ? null : f.category)}
          >
            {CATEGORY_LABEL[f.category] ?? f.category}
            {f.confidence === "low" ? " · not sure" : ""}
          </button>
        ))}
        {findings.length === 0 && !pending && <span className="badge badge--success">Clear</span>}
      </div>

      {optionLine.length > 0 && <p className="qcard__options">{optionLine.join(" · ")}</p>}

      {showDiff && item.original && (
        <p className="qcard__diff" aria-label={`Changed from: ${item.original.text}`}>
          {wordDiff(item.original.text, q.text).map((p, i) =>
            p.kind === "same" ? <span key={i}>{p.text}</span> : p.kind === "del" ? <del key={i}>{p.text}</del> : <ins key={i}>{p.text}</ins>,
          )}
        </p>
      )}
      {action === "flagged_duplicate" && pending && item.original && <p className="qcard__before">Your wording: {item.original.text}</p>}

      <p className="qcard__why">
        <Badge kind="ai" /> {q.change.why || q.reason}
      </p>
      {q.maps_to_decision && !/^not given/i.test(q.maps_to_decision) && <p className="qcard__decides">Helps decide: {q.maps_to_decision}</p>}

      {finding && (
        <div className="finding" role="region" aria-label={`${CATEGORY_LABEL[finding.category] ?? finding.category} details`}>
          <p>{finding.explanation}</p>
          {finding.suggested_fix.options.length > 0 && <p className="finding__fix">Suggested options: {finding.suggested_fix.options.join(" · ")}</p>}
          {finding.suggested_fix.text && <p className="finding__fix">Suggested wording: {finding.suggested_fix.text}</p>}
          {finding.severity === "critical" && (
            <div className="field">
              <label className="field__label" htmlFor={`${titleId}-reason`}>
                Reason for dismissing (required for critical flags)
              </label>
              <input id={`${titleId}-reason`} className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
          <div className="finding__actions">
            {(finding.suggested_fix.text || finding.suggested_fix.options.length > 0) && (
              <button type="button" className="btn btn--sm btn--primary" onClick={() => onApplyFix(finding)}>
                Apply fix
              </button>
            )}
            <button type="button" className="btn btn--sm btn--secondary" onClick={() => setEditing(true)}>
              Edit myself
            </button>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              disabled={finding.severity === "critical" && !reason.trim()}
              onClick={() => {
                onDismiss(finding, reason.trim() || "Dismissed by the creator");
                setOpenFinding(null);
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {editing ? (
        <QuestionEditor
          initial={q}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSave={(patch) => {
            onEdit(patch);
            setEditing(false);
          }}
        />
      ) : (
        pending && (
          <div className="qcard__actions">
            {action === "flagged_duplicate" ? (
              <>
                <button type="button" className="btn btn--sm btn--primary" onClick={onRemove}>
                  Merge (remove this one)
                </button>
                <button type="button" className="btn btn--sm btn--secondary" onClick={onKeepBoth}>
                  Keep both
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn--sm btn--primary" onClick={onAccept}>
                  Accept
                </button>
                <button type="button" className="btn btn--sm btn--secondary" onClick={() => setEditing(true)}>
                  Edit
                </button>
                {item.original ? (
                  <button type="button" className="btn btn--sm btn--ghost" onClick={onKeepMine}>
                    Keep mine
                  </button>
                ) : (
                  <button type="button" className="btn btn--sm btn--ghost" onClick={onRemove}>
                    Remove
                  </button>
                )}
              </>
            )}
          </div>
        )
      )}
    </article>
  );
}
