"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, LinkSimple, Quotes, Sparkle } from "@/components/icons";
import { Badge, ComputedMark } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Menu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { extractThemes } from "@/lib/ai/client";
import { maskPersonalData, splitMasks } from "@/lib/ai/masking";
import type { Sentiment } from "@/lib/ai/types";
import { useNowMinute } from "@/lib/client-hooks";
import { formatCount, percentsSummingTo100 } from "@/lib/compute";
import { isOpenEnded } from "@/lib/player/rules";
import { type ThemeStat, addCandidate, foldBatch, ignoreCandidate, mergeThemes, renameTheme, summarize, updatedAgo } from "@/lib/results/themes";
import { surveyHref } from "@/lib/studio/sections";
import { studio } from "@/lib/studio/store";
import type { StudioSurvey, ThemeState } from "@/lib/studio/types";
import { ResultsTabs } from "../ResultsTabs";
import { TopBar } from "../TopBar";
import { useResultsData } from "./ResultsView";

const MIN_TEXT = 10;
const SENTIMENTS: { key: Sentiment; label: string; color: string }[] = [
  { key: "positive", label: "Positive", color: "#0B6B66" },
  { key: "neutral", label: "Neutral", color: "#8A8296" },
  { key: "mixed", label: "Mixed", color: "#8A5300" },
  { key: "negative", label: "Negative", color: "#7E3A99" },
];

/** Masked personal data shows as a small pill (DESIGN.md §8.4). */
export function MaskedText({ text }: { text: string }) {
  return (
    <>
      {splitMasks(text).map((p, i) =>
        p.mask ? (
          <span key={i} className="mask-pill">
            {p.text.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/**
 * R3 Themes (UI_UX_LAYOUT.md): what people said in each open question. The AI groups answers and
 * picks verbatim quotes; code counts, ranks, labels ties and checks every quote.
 */
export function ThemesView({ survey }: { survey: StudioSurvey }) {
  const toast = useToast();
  const now = useNowMinute();
  const { player, rows, isSample } = useResultsData(survey);
  const openQs = useMemo(() => (player ? player.questions.filter((q) => isOpenEnded(q) && !q.collects_personal_data) : []), [player]);
  const personal = player ? player.questions.filter((q) => isOpenEnded(q) && q.collects_personal_data) : [];
  const [qid, setQid] = useState<string | null>(null);
  const current = openQs.find((q) => q.id === qid) ?? openQs[0];
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startedFor = useRef<string | null>(null);

  const review = survey.review;
  const textById = useMemo(() => {
    const m = new Map<string, string>();
    if (!current) return m;
    for (const r of rows) {
      if (r.submittedAt === null || review?.[r.id] === "exclude") continue;
      const a = r.answers[current.id];
      if (typeof a === "string" && a.trim()) m.set(r.id, maskPersonalData(a.trim()));
    }
    return m;
  }, [rows, current, review]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        openQs.map((q) => [q.id, rows.filter((r) => r.submittedAt !== null && review?.[r.id] !== "exclude" && typeof r.answers[q.id] === "string" && String(r.answers[q.id]).trim()).length]),
      ),
    [openQs, rows, review],
  );
  const state = current ? survey.themes?.[current.id] : undefined;
  const fresh = [...textById.keys()].filter((id) => !state?.coded.includes(id));
  const runKey = current ? `${current.id}:${textById.size}:${state ? "apply" : "discover"}` : "";
  const needsRun = !!current && textById.size >= MIN_TEXT && fresh.length > 0 && failedFor !== runKey;

  const save = (qId: string, change: (prev: ThemeState | undefined) => ThemeState | undefined) =>
    studio.patch(survey.id, (s) => {
      const next = change(s.themes?.[qId]);
      return next ? { themes: { ...(s.themes ?? {}), [qId]: next } } : {};
    });

  // Discover the first time; afterwards code only new answers against the codebook.
  useEffect(() => {
    if (!needsRun || !current || startedFor.current === runKey) return;
    startedFor.current = runKey;
    const mode = state ? "apply_codebook" : "discover";
    const batch = (mode === "discover" ? [...textById.keys()] : fresh).map((id) => ({ id, text: textById.get(id) ?? "" }));
    const qId = current.id;
    void extractThemes({
      question: { id: qId, text: current.text },
      mode,
      responses: batch,
      codebook: state?.result.themes.map(({ theme_id, label, description }) => ({ theme_id, label, description })),
    }).then((res) => {
      if (!res) {
        setFailedFor(runKey);
        return;
      }
      save(qId, (prev) => foldBatch(prev, res.result, batch.map((b) => b.id), res.engine, Date.now()));
    });
    // Runs once per question and answer count; the latest values are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsRun, runKey]);

  const top = (
    <>
      <TopBar
        crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
        status={survey.status}
        secondary={survey.slug ? [{ label: "View survey", href: `/s/${survey.slug}`, external: true, Icon: ArrowUpRight }] : []}
        primary={survey.status === "live" ? { label: "Share", Icon: LinkSimple, href: surveyHref(survey.id, "publish") } : undefined}
      />
      <ResultsTabs surveyId={survey.id} current="themes" hasResponses={rows.some((r) => r.submittedAt !== null)} />
    </>
  );

  if (!player || !current) {
    return (
      <>
        {top}
        <main className="page">
          <EmptyState symbol={<Quotes size={28} weight="fill" />} title="No open questions to theme" headingLevel={1}>
            {personal.length
              ? "This survey’s only written question collects personal data, which is never themed or sent to AI."
              : "Themes come from written answers. This survey has only closed questions; see Overview for their charts."}
          </EmptyState>
        </main>
      </>
    );
  }

  const present = new Set(textById.keys());
  const sum = state ? summarize(state, present) : null;

  return (
    <>
      {top}
      <div className="themes">
        <nav className="themes__nav" aria-label="Open questions">
          <h1 className="themes__title">
            Themes {isSample && <Badge kind="sample" />}
          </h1>
          <ul>
            {openQs.map((q) => (
              <li key={q.id}>
                <button type="button" className="themes__q" aria-current={q.id === current.id ? "true" : undefined} onClick={() => setQid(q.id)}>
                  <span className="themes__qtext">
                    <strong>{q.id}</strong> {q.text}
                  </span>
                  <span className="themes__qn">
                    {formatCount(counts[q.id] ?? 0)} <ComputedMark />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {personal.length > 0 && <p className="field__help">{personal.map((q) => q.id).join(", ")} collects personal data, so it is never themed or sent to AI.</p>}
        </nav>

        <div className="themes__select field">
          <label className="field__label" htmlFor="theme-q">
            Open question
          </label>
          <select id="theme-q" className="input" value={current.id} onChange={(e) => setQid(e.target.value)}>
            {openQs.map((q) => (
              <option key={q.id} value={q.id}>
                {q.id} · {q.text} ({counts[q.id] ?? 0})
              </option>
            ))}
          </select>
        </div>

        <main className="themes__main">
          <header className="themes__head">
            <h2>{current.text}</h2>
            <p className="themes__meta">
              <span>
                {formatCount(textById.size)} written {textById.size === 1 ? "answer" : "answers"}
                {sum && ` · ${formatCount(sum.withContent)} with content`}
                <ComputedMark />
              </span>
              {state && <span>{updatedAgo(state.updatedAt, now)}</span>}
            </p>
          </header>

          {textById.size < MIN_TEXT ? (
            <EmptyState symbol={<Quotes size={28} weight="fill" />} title={`Themes appear after ${MIN_TEXT} written answers`}>
              {textById.size} so far. Until then, you can read every answer in Responses.
            </EmptyState>
          ) : !sum ? (
            failedFor === runKey ? (
              <div className="status-banner status-banner--warning" role="alert">
                <strong>We couldn’t find themes just now.</strong>
                <button type="button" className="btn btn--sm btn--secondary" onClick={() => { startedFor.current = null; setFailedFor(null); }}>
                  Try again
                </button>
              </div>
            ) : (
              <div className="themes__loading" role="status" aria-live="polite">
                <p className="ai-writing">
                  <Sparkle size={16} weight="fill" aria-hidden="true" /> Reading {formatCount(textById.size)} answers and grouping them…
                </p>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="skeleton themes__skel" />
                ))}
              </div>
            )
          ) : (
            <Coded
              surveyId={survey.id}
              qId={current.id}
              state={state as ThemeState}
              sum={sum}
              textById={textById}
              busy={busy}
              onChange={(next, message) => {
                setBusy(true);
                const prev = state;
                save(current.id, () => next);
                setBusy(false);
                toast({ message, action: prev ? { label: "Undo", onClick: () => save(current.id, () => prev) } : undefined });
              }}
            />
          )}
        </main>
      </div>
    </>
  );
}

function Coded({
  surveyId,
  qId,
  state,
  sum,
  textById,
  busy,
  onChange,
}: {
  surveyId: string;
  qId: string;
  state: ThemeState;
  sum: NonNullable<ReturnType<typeof summarize>>;
  textById: Map<string, string>;
  busy: boolean;
  onChange: (next: ThemeState, message: string) => void;
}) {
  const [drawer, setDrawer] = useState<ThemeStat | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; label: string } | null>(null);
  const [merge, setMerge] = useState<{ from: ThemeStat; into: ThemeStat } | null>(null);
  const sentimentOf = new Map(state.result.assignments.map((a) => [a.response_id, a.sentiment]));

  return (
    <>
      {sum.stats.length === 0 && <p className="field__help">No theme has two or more answers yet. Single points are listed below.</p>}
      <ol className="themecards">
        {sum.stats.map((s) => (
          <li key={s.theme.theme_id}>
            <article className="themecard" aria-labelledby={`th-${s.theme.theme_id}`}>
              <div className="themecard__head">
                <Badge kind="ai" />
                {state.approved[s.theme.theme_id] && <Badge kind="human">You approved</Badge>}
                {sum.topId === s.theme.theme_id && <span className="themecard__top">Most mentioned</span>}
                <span className="themecard__menu">
                  <Menu
                    label={`More actions for ${s.theme.label}`}
                    items={[
                      { label: "Rename", onSelect: () => setRenaming({ id: s.theme.theme_id, label: s.theme.label }) },
                      ...sum.stats
                        .filter((o) => o !== s)
                        .map((o) => ({ label: `Merge into “${o.theme.label}”`, onSelect: () => setMerge({ from: s, into: o }) })),
                    ]}
                  />
                </span>
              </div>
              {renaming?.id === s.theme.theme_id ? (
                <form
                  className="themecard__rename"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const label = renaming.label.trim();
                    if (label && label !== s.theme.label) onChange(renameTheme(state, s.theme.theme_id, label), "Theme renamed. Its ID and answers stay the same.");
                    setRenaming(null);
                  }}
                >
                  <input className="input" aria-label="Theme name" value={renaming.label} maxLength={80} autoFocus onChange={(e) => setRenaming({ ...renaming, label: e.target.value })} />
                  <button type="submit" className="btn btn--sm btn--primary" disabled={busy}>
                    Save
                  </button>
                  <button type="button" className="btn btn--sm btn--secondary" onClick={() => setRenaming(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <h3 id={`th-${s.theme.theme_id}`}>{s.theme.label}</h3>
              )}
              <details className="themecard__rule">
                <summary>What belongs here</summary>
                <p>{s.theme.description}</p>
              </details>
              <p className="themecard__count">
                <strong>
                  {formatCount(s.count)} {s.count === 1 ? "response" : "responses"} · {s.pct}%
                </strong>
                <ComputedMark />
                {s.tiedWith.length > 0 && <span className="themecard__tie">Tied with {s.tiedWith.map((l) => `“${l}”`).join(", ")}</span>}
              </p>
              <SentimentBar counts={s.sentiment} />
              <ul className="quotes">
                {s.theme.quotes.map((q) => (
                  <li key={q.response_id}>
                    <blockquote>
                      “<MaskedText text={q.text} />”
                    </blockquote>
                    <span className="rid">{q.response_id}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn--ghost themecard__all" onClick={() => setDrawer(s)}>
                See all {formatCount(s.count)}
              </button>
            </article>
          </li>
        ))}
      </ol>

      {sum.minority.length > 0 && (
        <section className="themes__sec" aria-labelledby="minority-title">
          <h3 id="minority-title">Said by one person ({sum.minority.length})</h3>
          <p className="field__help">Points no one else made. They aren’t themes, but they can matter.</p>
          <ul className="quotes quotes--list">
            {sum.minority.map((m) => (
              <li key={m.response_id}>
                <blockquote>
                  “<MaskedText text={m.quote} />”
                </blockquote>
                <span className="rid">{m.response_id}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sum.candidates.length > 0 && (
        <section className="themes__sec" aria-labelledby="cand-title">
          <h3 id="cand-title">Possible new themes</h3>
          <p className="field__help">New answers that fit none of your themes. Add one to start counting it, or ignore it.</p>
          <ul className="candidates">
            {sum.candidates.map((c) => (
              <li key={c.label} className="candidate">
                <Badge kind="ai" />
                <h4>{c.label}</h4>
                <p className="field__help">{c.description}</p>
                <p className="themecard__count">
                  {formatCount(c.count)} answers <ComputedMark />
                </p>
                <div className="candidate__actions">
                  <button type="button" className="btn btn--sm btn--primary" onClick={() => onChange(addCandidate(state, c.label, textById), `“${c.label}” added as a theme.`)}>
                    Add as theme
                  </button>
                  <button type="button" className="btn btn--sm btn--secondary" onClick={() => onChange(ignoreCandidate(state, c.label), "Suggestion ignored.")}>
                    Ignore
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="themes__other">
        <summary>
          Other responses: {sum.noContent} no content · {sum.offTopic} off topic · {sum.flagged.length} flagged <ComputedMark />
        </summary>
        <ul>
          <li>
            <Link href={`${surveyHref(surveyId, "responses")}?q=${qId}&status=no_content`} className="link">
              {sum.noContent} with no content
            </Link>{" "}
            (“nothing”, “na”, “-”).
          </li>
          <li>{sum.offTopic} off topic.</li>
          {sum.flagged.map((f) => (
            <li key={f.id}>
              <span className="rid">{f.id}</span> flagged as {f.type.replace(/_/g, " ")}: {f.note}
            </li>
          ))}
        </ul>
      </details>

      {state.result.coding_notes.length > 0 && (
        <details className="themes__other">
          <summary>
            <Badge kind="ai" /> Coding notes ({state.result.coding_notes.length})
          </summary>
          <ul>
            {state.result.coding_notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      )}

      <Drawer open={drawer !== null} title={drawer ? `${drawer.theme.label}: all ${drawer.count}` : ""} onClose={() => setDrawer(null)}>
        {drawer && (
          <ul className="allquotes">
            {drawer.ids.map((id) => {
              const sent = sentimentOf.get(id) ?? "neutral";
              return (
                <li key={id}>
                  <p>
                    <MaskedText text={textById.get(id) ?? ""} />
                  </p>
                  <span className="rid">{id}</span>
                  <span className={`sent-chip sent-chip--${sent}`}>{sent}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Drawer>

      <ConfirmDialog
        open={merge !== null}
        title="Merge these themes?"
        confirmLabel="Merge"
        onConfirm={() => {
          if (merge) onChange(mergeThemes(state, merge.into.theme.theme_id, merge.from.theme.theme_id), `Merged into “${merge.into.theme.label}”.`);
          setMerge(null);
        }}
        onClose={() => setMerge(null)}
      >
        {merge && (
          <>
            Answers in “{merge.from.theme.label}” will count under “{merge.into.theme.label}”, which keeps its name and ID. Counts are recalculated. You can undo this right after.
          </>
        )}
      </ConfirmDialog>
    </>
  );
}

function SentimentBar({ counts }: { counts: Record<Sentiment, number> }) {
  const values = SENTIMENTS.map((s) => counts[s.key]);
  const pcts = percentsSummingTo100(values);
  const parts = SENTIMENTS.map((s, i) => ({ ...s, n: values[i], pct: pcts[i] })).filter((p) => p.n > 0);
  return (
    <div className="sentiment">
      <div className="sentiment__bar" role="img" aria-label={`Sentiment: ${parts.map((p) => `${p.label} ${p.pct}%`).join(", ")}`}>
        {parts.map((p) => (
          <span key={p.key} style={{ flexGrow: p.pct, background: p.color }} data-tip={`${p.label}: ${p.pct}% (${p.n})`} />
        ))}
      </div>
      <ul className="likert__legend">
        {parts.map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} aria-hidden="true" />
            {p.label} <span className="likert__val">{p.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
