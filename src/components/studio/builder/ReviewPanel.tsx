"use client";

import { ArrowClockwise, Lightbulb, Warning } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import type { BiasFinding } from "@/lib/ai/types";
import { CATEGORY_LABEL } from "./QuestionCard";

/**
 * Review panel (UI_UX_LAYOUT.md S4): Suggestions, Bias check, Left out, Notes for you, Flags.
 * Sticky on the right on desktop; a bottom sheet on phones.
 */
export function ReviewPanel({
  pendingCount,
  oneByOne,
  onAcceptAll,
  onStartOneByOne,
  onStopOneByOne,
  oneByOneControls,
  findings,
  overallNote,
  biasStale,
  checking,
  onCheckAgain,
  onShowFinding,
  leftOutCount,
  onOpenLeftOut,
  notes,
  flags,
  labelFor,
}: {
  pendingCount: number;
  oneByOne: { index: number; total: number } | null;
  onAcceptAll: () => void;
  onStartOneByOne: () => void;
  onStopOneByOne: () => void;
  oneByOneControls: { accept: () => void; edit: () => void; keepMine: () => void } | null;
  findings: BiasFinding[];
  overallNote: string;
  biasStale: boolean;
  checking: boolean;
  onCheckAgain: () => void;
  onShowFinding: (f: BiasFinding) => void;
  leftOutCount: number;
  onOpenLeftOut: () => void;
  notes: string[];
  flags: string[];
  labelFor: (key: string) => string;
}) {
  const groups = (["critical", "major", "minor"] as const).map((sev) => ({ sev, list: findings.filter((f) => f.severity === sev) })).filter((g) => g.list.length);

  return (
    <div className="review">
      <section className="review__section" aria-labelledby="rv-sugg">
        <h2 id="rv-sugg">
          Suggestions <span className="review__count">{pendingCount}</span>
        </h2>
        {oneByOne && oneByOneControls ? (
          <div className="review__onebyone">
            <p className="review__progress">
              {oneByOne.index + 1} of {oneByOne.total}
            </p>
            <div className="review__btns">
              <button type="button" className="btn btn--sm btn--primary" onClick={oneByOneControls.accept}>
                Accept <kbd>A</kbd>
              </button>
              <button type="button" className="btn btn--sm btn--secondary" onClick={oneByOneControls.edit}>
                Edit <kbd>E</kbd>
              </button>
              <button type="button" className="btn btn--sm btn--ghost" onClick={oneByOneControls.keepMine}>
                Keep mine <kbd>K</kbd>
              </button>
            </div>
            <button type="button" className="btn btn--ghost review__stop" onClick={onStopOneByOne}>
              Stop reviewing one by one
            </button>
          </div>
        ) : pendingCount > 0 ? (
          <div className="review__btns">
            <button type="button" className="btn btn--sm btn--primary" onClick={onAcceptAll}>
              Accept all
            </button>
            <button type="button" className="btn btn--sm btn--secondary" onClick={onStartOneByOne}>
              Review one by one
            </button>
          </div>
        ) : (
          <p className="review__ok">Every suggestion is decided.</p>
        )}
      </section>

      <section className="review__section" aria-labelledby="rv-bias">
        <h2 id="rv-bias">
          Bias check <Badge kind="ai" />
        </h2>
        <p className="review__note">{findings.length ? overallNote : "No open flags. Every question reads neutrally."}</p>
        {biasStale && <p className="review__stale">Questions changed since the last check.</p>}
        {groups.map((g) => (
          <div key={g.sev} className="review__group">
            <p className={`review__sev review__sev--${g.sev}`}>
              {g.list.length} {g.sev}
            </p>
            <ul>
              {g.list.map((f) => (
                <li key={`${f.id}-${f.category}`}>
                  <button type="button" className="review__link" onClick={() => onShowFinding(f)}>
                    {labelFor(f.id)}: {CATEGORY_LABEL[f.category] ?? f.category}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <button type="button" className="btn btn--sm btn--secondary" onClick={onCheckAgain} disabled={checking} aria-busy={checking}>
          <ArrowClockwise size={16} weight="regular" /> {checking ? "Checking…" : "Check again"}
        </button>
      </section>

      {leftOutCount > 0 && (
        <section className="review__section" aria-labelledby="rv-left">
          <h2 id="rv-left">
            Left out <span className="review__count">{leftOutCount}</span>
          </h2>
          <button type="button" className="btn btn--sm btn--secondary" onClick={onOpenLeftOut}>
            See what was left out
          </button>
        </section>
      )}

      {notes.length > 0 && (
        <section className="review__section review__tip" aria-labelledby="rv-notes">
          <h2 id="rv-notes">
            <Lightbulb size={18} weight="regular" /> Notes for you
          </h2>
          <ul>
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      {flags.length > 0 && (
        <section className="review__section review__flags" aria-labelledby="rv-flags">
          <h2 id="rv-flags">
            <Warning size={18} weight="regular" /> Flags
          </h2>
          <ul>
            {flags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
