"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { Trash } from "@/components/icons";
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

/**
 * One question as a quiet list row (Apple-style): number, wording, answers in grey, and a "…" menu.
 * An AI suggestion shows one small label and Accept / Edit / Keep mine; a bias flag shows one line.
 */
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
  const sub = [optionLine.join(" · "), q.required ? "" : "Optional"].filter(Boolean).join(" · ");

  return (
    <article
      id={`card-${item.key}`}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={`qcard mbq ${pending ? "qcard--draft is-suggested" : ""} ${focused ? "is-focused" : ""} ${flash ? "is-flash" : ""}`}
    >
      <div className="mbq__row">
        <span className="mbq__num" aria-hidden="true">
          {index + 1}
        </span>
        <div className="mbq__body">
          {pending && <span className={`mbq__tag mbq__tag--${change.kind}`}>{action === "new" ? "Suggested" : change.label}</span>}
          <h3 className="qcard__text mbq__text" id={titleId}>
            <span className="sr-only">Question {index + 1}: </span>
            <MarkedText text={q.text} findings={findings} />
          </h3>
          {sub && (
            <p className="mbq__sub">
              {sub.split(/(\[[^\]]+\])/g).map((part, i) =>
                /^\[[^\]]+\]$/.test(part) ? (
                  <span key={i} className="ph">
                    {part}
                  </span>
                ) : (
                  part
                ),
              )}
            </p>
          )}
          {showDiff && item.original && (
            <p className="qcard__diff mbq__was" aria-label={`Changed from: ${item.original.text}`}>
              {wordDiff(item.original.text, q.text).map((p, i) =>
                p.kind === "same" ? <span key={i}>{p.text}</span> : p.kind === "del" ? <del key={i}>{p.text}</del> : <ins key={i}>{p.text}</ins>,
              )}
            </p>
          )}
          {action === "flagged_duplicate" && pending && item.original && <p className="mbq__sub">Your wording: {item.original.text}</p>}
          {findings.map((f) => (
            <button
              key={f.category}
              type="button"
              className={`mbq__flag mbq__flag--${f.severity}`}
              aria-expanded={openFinding === f.category}
              onClick={() => setOpenFinding(openFinding === f.category ? null : f.category)}
            >
              {CATEGORY_LABEL[f.category] ?? f.category}
            </button>
          ))}
        </div>
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

      {finding && (
        <div className="mbq__finding" role="region" aria-label={`${CATEGORY_LABEL[finding.category] ?? finding.category} details`}>
          <p>{finding.explanation}</p>
          {finding.suggested_fix.options.length > 0 && <p className="mbq__sub">Suggested options: {finding.suggested_fix.options.join(" · ")}</p>}
          {finding.suggested_fix.text && <p className="mbq__sub">Suggested wording: {finding.suggested_fix.text}</p>}
          {finding.severity === "critical" && (
            <div className="field">
              <label className="field__label" htmlFor={`${titleId}-reason`}>
                Why keep it as is? (needed to dismiss)
              </label>
              <input id={`${titleId}-reason`} className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
          <div className="mbq__actions">
            {(finding.suggested_fix.text || finding.suggested_fix.options.length > 0) && (
              <button type="button" className="btn btn--sm btn--primary" onClick={() => onApplyFix(finding)}>
                Apply fix
              </button>
            )}
            <button
              type="button"
              className="mbq__textbtn"
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
        <div className="mbq__edit">
          <QuestionEditor
            initial={q}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            onSave={(patch) => {
              onEdit(patch);
              setEditing(false);
            }}
          />
        </div>
      ) : (
        pending && (
          <div className="qcard__actions mbq__actions">
            {action === "flagged_duplicate" ? (
              <>
                <button type="button" className="btn btn--sm btn--primary" onClick={onRemove}>
                  Remove duplicate
                </button>
                <button type="button" className="mbq__textbtn" onClick={onKeepBoth}>
                  Keep both
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn--sm btn--primary" onClick={onAccept}>
                  Accept
                </button>
                <button type="button" className="mbq__textbtn" onClick={() => setEditing(true)}>
                  Edit
                </button>
                {item.original ? (
                  <button type="button" className="mbq__textbtn" onClick={onKeepMine}>
                    Keep mine
                  </button>
                ) : (
                  <button type="button" className="mbq__textbtn" onClick={onRemove}>
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
