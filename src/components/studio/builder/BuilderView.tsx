"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { ArrowRight, Plus, Sparkle } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useMe } from "@/lib/account";
import { checkBias, shapeOnce } from "@/lib/ai/client";
import { looksDuplicate } from "@/lib/ai/parse";
import type { SurveyRequest } from "@/lib/ai/types";
import { formatDuration } from "@/lib/compute";
import {
  type BuilderState,
  accept,
  acceptAll,
  addQuestion,
  applyFix,
  createBuilderState,
  currentQuestions,
  dismiss,
  editQuestion,
  keepMine,
  moveBackIn,
  move,
  nextGate,
  allPlaceholders,
  fillPlaceholder,
  placeholdersIn,
  type GateTarget,
  type NextGate,
  openFindings,
  pendingCount,
  pendingItems,
  removeItem,
  rulesFor,
  settle,
  signature,
} from "@/lib/studio/builder";
import { surveyHref } from "@/lib/studio/sections";
import { studio } from "@/lib/studio/store";
import { toPlayerSurvey } from "@/lib/studio/to-player";
import type { StudioSurvey } from "@/lib/studio/types";
import { StepRail } from "../StepRail";
import { TopBar } from "../TopBar";
import { PreviewModal } from "./PreviewModal";
import { QuestionCard } from "./QuestionCard";
import { QuestionEditor } from "./QuestionEditor";

const EMPTY_CONTEXT: SurveyRequest["context"] = { audience: "", decision: "", known: "", anonymous: true, sensitive: false, time_limit_seconds: null };

/**
 * S4 Question builder + review (UI_UX_LAYOUT.md), the heart of the product. The AI's proposal
 * arrives as suggestions; the creator accepts, edits or keeps their own wording for each one.
 */
export function BuilderView({ survey }: { survey: StudioSurvey }) {
  const router = useRouter();
  const toast = useToast();
  const me = useMe();
  const state = useMemo<BuilderState | null>(
    () => survey.builder ?? (survey.ai ? createBuilderState(survey.ai.shaper, survey.ai.bias, survey.brief) : null),
    [survey.builder, survey.ai, survey.brief],
  );
  const shaper = survey.ai?.shaper;
  const timeLimit = survey.brief?.context.time_limit_seconds ?? null;

  const [flash, setFlash] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [openFinding, setOpenFinding] = useState<{ key: string; category: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState<"" | "suggest" | "update" | "draft">("");
  const [adding, setAdding] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(() => shaper?.status === "conflict" && !survey.builder?.leftOutSeen && (shaper?.cut_questions.length ?? 0) > 0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const save = (next: BuilderState) => studio.patch(survey.id, () => ({ builder: next }));
  const saveWithUndo = (prev: BuilderState, next: BuilderState, message: string) => {
    save(next);
    toast({ message, action: { label: "Undo", onClick: () => save(prev) } });
  };
  const flashKeys = (keys: string[]) => {
    setFlash(keys);
    window.setTimeout(() => setFlash([]), 2400);
  };

  const pending = state ? pendingItems(state) : [];
  const pendingUnits = state ? pendingCount(state) : 0;
  const findings = state ? openFindings(state) : [];
  const purposeGaps = state ? placeholdersIn(state.purpose_line) : [];
  const gaps = state ? allPlaceholders(state) : [];
  const fillAll = (word: string, value: string) => {
    if (!state) return;
    const n = gaps.find((g) => g.word === word)?.count ?? 0;
    saveWithUndo(state, fillPlaceholder(state, word, value), `Replaced ${word} in ${n} ${n === 1 ? "place" : "places"}.`);
  };
  const suggestFor = (word: string) => (/organi[sz]ation|company|team|club|school|college/i.test(word) ? me?.org ?? "" : "");
  const rules = state ? rulesFor(state, timeLimit) : null;
  const gate: NextGate = state && rules ? nextGate(state, rules) : { ok: false, reasons: ["Draft some questions first."], blockers: [] };
  const biasStale = !!state && state.biasFor !== signature(state.items);

  /* ---------------- actions ---------------- */

  function doAccept(key: string) {
    if (!state) return;
    const group = state.items.find((i) => i.key === key)?.group;
    save(accept(state, key));
    flashKeys(group ? state.items.filter((i) => i.group === group).map((i) => i.key) : [key]);
  }
  function doKeepMine(key: string) {
    if (state) save(keepMine(state, key));
  }
  function doRemove(key: string) {
    if (state) saveWithUndo(state, removeItem(state, key), "Question removed.");
  }

  async function doCheckAgain() {
    if (!state) return;
    setChecking(true);
    const out = await checkBias(state.items.map((i) => ({ ...i.question, id: i.key })));
    setChecking(false);
    if (!out) return toast({ message: "We couldn’t reach the bias check just now. Try again." });
    save({ ...state, bias: out, biasFor: signature(state.items) });
    toast({ message: out.findings.length ? "Bias check updated." : "Bias check: no problems found." });
  }

  async function doSuggestOne() {
    if (!state) return;
    setBusy("suggest");
    const res = await shapeOnce({ mode: "quick_prompt", input: survey.title, context: survey.brief?.context ?? EMPTY_CONTEXT });
    setBusy("");
    const candidate = res?.shaper.questions.find((q) => !state.items.some((i) => looksDuplicate(i.question.text, q.text)));
    if (!candidate) return toast({ message: "No new suggestions right now. Try editing the brief." });
    const { id: _id, ...rest } = candidate;
    void _id;
    save(addQuestion(state, { ...rest, change: { action: "new", source_id: "", before: "", why: "" } }, "ai"));
    toast({ message: "Suggested one more question. Accept it or remove it." });
  }

  async function redraft(request: SurveyRequest) {
    setBusy("update");
    const res = await shapeOnce(request);
    setBusy("");
    if (!res) return toast({ message: "We couldn’t reach the AI just now. Your draft is unchanged." });
    studio.patch(survey.id, () => ({
      brief: request,
      ai: { engine: res.engine, shaper: res.shaper, bias: res.bias, rules: res.rules, createdAt: Date.now() },
      builder: createBuilderState(res.shaper, res.bias, request),
    }));
    setAnswers([]);
    toast({ message: "Draft updated with your answers." });
  }

  function updateDraftRequest(): SurveyRequest | null {
    if (!survey.brief || !shaper) return null;
    const qa = shaper.clarifying_questions.map((q, i) => (answers[i]?.trim() ? `${q} ${answers[i].trim()}` : "")).filter(Boolean);
    const who = shaper.clarifying_questions.findIndex((q) => /who will answer/i.test(q));
    return {
      ...survey.brief,
      context: {
        ...survey.brief.context,
        audience: who >= 0 && answers[who]?.trim() ? answers[who].trim() : survey.brief.context.audience,
        known: [survey.brief.context.known, ...qa].filter(Boolean).join("\n"),
      },
    };
  }

  /** Take the creator to the thing that is holding "Next" back. */
  function showBlocker(target: GateTarget) {
    const focusEl = (id: string, select?: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.focus({ preventScroll: true });
      if (select && el instanceof HTMLTextAreaElement) {
        const at = el.value.indexOf(select);
        if (at >= 0) el.setSelectionRange(at, at + select.length);
      }
    };
    switch (target.kind) {
      case "purpose":
        return focusEl("purpose-line", placeholdersIn(state?.purpose_line ?? "")[0]);
      case "consent":
        return focusEl("consent-line");
      case "question":
        setEditingKey(target.key);
        focusEl(`card-${target.key}`);
        // Once the editor is open, put the cursor on the first [placeholder], in whichever box holds it.
        window.setTimeout(() => {
          const boxes = document.querySelectorAll<HTMLTextAreaElement>(`#card-${CSS.escape(target.key)} textarea`);
          const box = [...boxes].find((b) => placeholdersIn(b.value).length);
          if (!box) return;
          const word = placeholdersIn(box.value)[0];
          const at = box.value.indexOf(word);
          box.focus({ preventScroll: true });
          box.setSelectionRange(at, at + word.length);
          box.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 60);
        return;
      case "finding": {
        const f = findings.find((x) => x.id === target.key && x.severity === "critical");
        if (f) setOpenFinding({ key: f.id, category: f.category });
        return focusEl(`card-${target.key}`);
      }
      case "suggestions":
        return focusEl("mb-suggest");
      case "conflict":
        return focusEl("conflict-banner");
      case "questions":
        return focusEl("builder-questions");
    }
  }

  /** Put the cursor in a blank's box (the given [word], or the first one). Returns false when there are none. */
  function focusBlank(word?: string) {
    const boxes = [...document.querySelectorAll<HTMLInputElement>(".mb__fill-input")];
    const box = boxes.find((b) => b.dataset.word === word) ?? boxes[0];
    if (!box) return false;
    box.scrollIntoView({ block: "center", behavior: "smooth" });
    box.focus({ preventScroll: true });
    return true;
  }

  function goNext() {
    if (!gate.ok) {
      // Blanks first: put the cursor in the first empty box.
      if (focusBlank()) return;
      if (gate.blockers[0]) showBlocker(gate.blockers[0].target);
      return;
    }
    if (survey.step === "build") studio.patch(survey.id, () => ({ step: "style" }));
    router.push(surveyHref(survey.id, "style"));
  }

  /* ---------------- no draft yet (sample drafts) ---------------- */
  if (!state || !rules) {
    return (
      <>
        <TopBar crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]} status="draft" />
        <StepRail surveyId={survey.id} reached={survey.step} current="build" />
        <main className="page">
          <h1 className="sr-only">Question builder: {survey.title}</h1>
          <EmptyState
            symbol={<Sparkle size={28} weight="bold" />}
            title="No questions yet"
            actions={
              <button
                type="button"
                className="btn btn--md btn--ai"
                disabled={busy === "draft"}
                onClick={async () => {
                  setBusy("draft");
                  const request: SurveyRequest = { mode: "quick_prompt", input: survey.title, context: EMPTY_CONTEXT };
                  const res = await shapeOnce(request);
                  setBusy("");
                  if (!res) return toast({ message: "We couldn’t reach the AI just now. Try again." });
                  studio.patch(survey.id, () => ({
                    brief: request,
                    ai: { engine: res.engine, shaper: res.shaper, bias: res.bias, rules: res.rules, createdAt: Date.now() },
                    builder: createBuilderState(res.shaper, res.bias, request),
                  }));
                }}
              >
                <Sparkle size={18} /> {busy === "draft" ? "Drafting…" : "Draft questions from the title"}
              </button>
            }
          >
            This sample draft has a title but no questions. Draft some from its title, then review each one.
          </EmptyState>
        </main>
      </>
    );
  }

  const preview = toPlayerSurvey({
    slug: `preview-${survey.id}`,
    title: survey.title,
    creatorName: "Preview",
    theme: "marigold",
    purpose_line: state.purpose_line,
    consent_line: state.consent_line,
    questions: currentQuestions(state),
  });
  // Blanks are fixed in their own group; the rest of the gate shows as one quiet line each.
  const otherBlockers = gate.blockers.filter((b) => b.target.kind !== "purpose" && b.target.kind !== "question" && b.target.kind !== "suggestions");
  const count = rules.questionCount;
  const acceptEverything = () => {
    const keys = pending.map((p) => p.key);
    saveWithUndo(state, acceptAll(state), `Accepted ${pendingUnits} ${pendingUnits === 1 ? "suggestion" : "suggestions"}.`);
    flashKeys(keys);
  };

  return (
    <>
      <TopBar
        crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
        status="draft"
        saved
        secondary={[{ label: "Preview", onClick: () => setPreviewOpen(true) }]}
        primary={{ label: "Next: Style", Icon: ArrowRight, iconAfter: true, onClick: goNext, disabledReason: gate.ok ? undefined : gate.reasons[0], onDisabledClick: goNext }}
      />
      <StepRail surveyId={survey.id} reached={survey.step} current="build" />

      <main
        className="mb"
        onClick={(e) => {
          const ph = (e.target as HTMLElement).closest(".ph, .mbq__ph");
          if (ph) focusBlank(ph.textContent?.trim());
        }}
      >
        <h1 className="sr-only">Question builder: {survey.title}</h1>
        <header className="mb__head">
          <label className="sr-only" htmlFor="survey-title">
            Survey title
          </label>
          <input id="survey-title" className="mb__title" value={survey.title} maxLength={80} onChange={(e) => studio.patch(survey.id, () => ({ title: e.target.value }))} />
          <p className="mb__meta">
            {count} {count === 1 ? "question" : "questions"} · about {formatDuration(rules.seconds)}
            {rules.countState === "blocked" && <span className="mb__warn"> · too many, keep 15 or fewer</span>}
            {shaper && (
              <>
                {" · "}
                <button type="button" className="mb__link" onClick={() => setDetailsOpen(true)}>
                  Draft details
                </button>
              </>
            )}
          </p>
        </header>

        {shaper?.status === "needs_clarification" && (
          <section className="mb__notice" aria-labelledby="clarify-title">
            <h2 id="clarify-title" className="mb__notice-title">
              A few details would make this better
            </h2>
            {shaper.clarifying_questions.map((q, i) => (
              <div className="field" key={q}>
                <label className="field__label" htmlFor={`clarify-${i}`}>
                  {q}
                </label>
                <input id={`clarify-${i}`} className="input" value={answers[i] ?? ""} onChange={(e) => setAnswers((a) => Object.assign([...a], { [i]: e.target.value }))} />
              </div>
            ))}
            <div>
              <button
                type="button"
                className="btn btn--sm btn--primary"
                disabled={busy === "update" || !answers.some((a) => a?.trim())}
                onClick={() => {
                  if (state.items.some((i) => i.status === "accepted")) return setConfirmReplace(true);
                  const req = updateDraftRequest();
                  if (req) void redraft(req);
                }}
              >
                {busy === "update" ? "Updating…" : "Update draft"}
              </button>
            </div>
          </section>
        )}
        {shaper?.status === "conflict" && !state.conflictConfirmed && (
          <section id="conflict-banner" tabIndex={-1} className="mb__notice">
            <p>{shaper.conflict_explanation}</p>
            <div className="mb__notice-actions">
              <button type="button" className="btn btn--sm btn--primary" onClick={() => save({ ...state, conflictConfirmed: true })}>
                Confirm core set
              </button>
              <button type="button" className="mb__textbtn" onClick={() => setLeftOpen(true)}>
                See what was left out ({state.leftOut.length})
              </button>
            </div>
          </section>
        )}
        {shaper?.status === "declined_with_alternative" && (
          <section className="mb__notice mb__notice--danger">
            <p>{shaper.declined.reason}</p>
          </section>
        )}
        {(shaper?.flags ?? []).map((f) => (
          <p key={f} className="mb__notice mb__notice--danger">
            {f}
          </p>
        ))}

        {pendingUnits > 0 && (
          <section id="mb-suggest" tabIndex={-1} className="mb__notice mb__notice--ai" aria-label="Suggestions">
            <p>
              <Sparkle size={16} /> {pendingUnits} {pendingUnits === 1 ? "suggestion" : "suggestions"} from AI. Check them below, or accept them all.
            </p>
            <button type="button" className="btn btn--sm btn--primary" onClick={acceptEverything}>
              Accept all
            </button>
          </section>
        )}

        <section className="mb__group" aria-labelledby="mb-intro">
          <h2 id="mb-intro" className="mb__label">
            Shown before the questions
          </h2>
          <div className="mb__card">
            <label className="sr-only" htmlFor="purpose-line">
              Purpose
            </label>
            <textarea
              id="purpose-line"
              className={`mb__text${purposeGaps.length ? " is-blank" : ""}`}
              rows={2}
              value={state.purpose_line}
              onChange={(e) => save({ ...state, purpose_line: e.target.value })}
            />
            {(rules.consentNeeded || state.consent_line) && (
              <>
                <label className="mb__rowlabel" htmlFor="consent-line">
                  Consent{rules.consentNeeded ? " (required)" : ""}
                </label>
                <textarea id="consent-line" className="mb__text" rows={2} value={state.consent_line} onChange={(e) => save({ ...state, consent_line: e.target.value })} />
              </>
            )}
          </div>
        </section>

        <section className="mb__group" aria-labelledby="mb-qs">
          <h2 id="mb-qs" className="mb__label">
            Questions
          </h2>
          <ol id="builder-questions" tabIndex={-1} className="mb__card mb__list builder__list" aria-label="Questions">
            {state.items.map((item, i) => (
              <li key={item.key}>
                <QuestionCard
                  item={item}
                  index={i}
                  total={state.items.length}
                  findings={findings.filter((f) => f.id === item.key)}
                  focused={false}
                  flash={flash.includes(item.key)}
                  onAccept={() => doAccept(item.key)}
                  onKeepMine={() => doKeepMine(item.key)}
                  onRemove={() => doRemove(item.key)}
                  onKeepBoth={() => save(settle(state, item.key))}
                  onEdit={(patch) => {
                    save(editQuestion(state, item.key, patch));
                    flashKeys([item.key]);
                  }}
                  onMove={(delta) => save(move(state, item.key, delta))}
                  onApplyFix={(f) => {
                    save(applyFix(state, f));
                    setOpenFinding(null);
                    flashKeys([item.key]);
                  }}
                  onDismiss={(f, reason) => save(dismiss(state, f, reason))}
                  editing={editingKey === item.key}
                  setEditing={(v) => setEditingKey(v ? item.key : null)}
                  openFinding={openFinding?.key === item.key ? openFinding.category : null}
                  setOpenFinding={(c) => setOpenFinding(c ? { key: item.key, category: c } : null)}
                />
              </li>
            ))}
            <li className="mb__addrow">
              {adding ? (
                <div className="mbq__edit">
                  <QuestionEditor
                    initial={{ type: "single_choice", required: true }}
                    submitLabel="Add question"
                    onCancel={() => setAdding(false)}
                    onSave={(patch) => {
                      save(
                        addQuestion(
                          state,
                          {
                            text: "",
                            type: "single_choice",
                            options: [],
                            scale: null,
                            required: true,
                            sensitive: false,
                            collects_personal_data: false,
                            role: "attitude",
                            reason: "Added by you.",
                            maps_to_decision: "",
                            change: { action: "kept", source_id: "", before: "", why: "" },
                            ...patch,
                          },
                          "you",
                        ),
                      );
                      setAdding(false);
                    }}
                  />
                </div>
              ) : (
                <div className="mb__addbtns">
                  <button type="button" className="mb__add" onClick={() => setAdding(true)}>
                    <Plus size={18} weight="bold" /> Add question
                  </button>
                  <button type="button" className="mb__textbtn" onClick={doSuggestOne} disabled={busy === "suggest"}>
                    {busy === "suggest" ? "Suggesting…" : "Suggest one"}
                  </button>
                </div>
              )}
            </li>
          </ol>
        </section>

        {gaps.length > 0 && (
          <section id="mb-blanks-group" className="mb__group mb__group--blanks" aria-labelledby="mb-blanks">
            <h2 id="mb-blanks" className="mb__label">
              Fill in {gaps.length === 1 ? "the blank" : `${gaps.length} blanks`} to continue
            </h2>
            <div className="mb__card">
              {gaps.map((g) => (
                <FillRow key={g.word} word={g.word} initial={suggestFor(g.word)} onFill={fillAll} />
              ))}
            </div>
            <p className="mb__foot">Type once and press Done. It is filled in everywhere it appears.</p>
          </section>
        )}

        {!gate.ok && (
          <div className="mb__gate builder__gate" role="status">
            {gaps.length > 0 ? (
              <button type="button" className="mb__link" onClick={() => focusBlank()}>
                Fill in the blanks above, then Next: Style turns on.
              </button>
            ) : pendingUnits > 0 ? (
              <p>Accept or change each suggestion to continue.</p>
            ) : (
              otherBlockers.map((b) => (
                <button key={b.text} type="button" className="mb__link" onClick={() => showBlocker(b.target)}>
                  {b.text}
                </button>
              ))
            )}
          </div>
        )}
      </main>

      <Drawer open={detailsOpen} title="Draft details" onClose={() => setDetailsOpen(false)}>
        <div className="mb-details">
          {shaper && <p>{shaper.summary_for_creator}</p>}
          {shaper && shaper.decisions_informed.length > 0 && (
            <section>
              <h3>Helps you decide</h3>
              <ul>
                {shaper.decisions_informed.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
          )}
          {shaper && shaper.assumptions.length > 0 && (
            <section>
              <h3>What the AI assumed</h3>
              <ul>
                {shaper.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          )}
          {(shaper?.notes_for_creator.length ?? 0) > 0 && (
            <section>
              <h3>Tips</h3>
              <ul>
                {shaper?.notes_for_creator.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h3>Bias check</h3>
            <p>{findings.length ? state.bias?.overall_note : "Every question reads neutrally."}</p>
            {biasStale && <p className="mb__foot">Questions changed since the last check.</p>}
            <button type="button" className="btn btn--sm btn--secondary" onClick={doCheckAgain} disabled={checking} aria-busy={checking}>
              {checking ? "Checking…" : "Check again"}
            </button>
          </section>
          {state.leftOut.length > 0 && (
            <section>
              <h3>Left out</h3>
              <button
                type="button"
                className="mb__link"
                onClick={() => {
                  setDetailsOpen(false);
                  setLeftOpen(true);
                }}
              >
                See {state.leftOut.length} {state.leftOut.length === 1 ? "question" : "questions"} left out
              </button>
            </section>
          )}
        </div>
      </Drawer>

      <Drawer
        open={leftOpen}
        title="Left out"
        onClose={() => {
          setLeftOpen(false);
          if (!state.leftOutSeen) save({ ...state, leftOutSeen: true });
        }}
      >
        {state.leftOut.length === 0 ? (
          <p>Nothing was left out.</p>
        ) : (
          <ul className="leftout">
            {state.leftOut.map((c, i) => (
              <li key={`${c.source_id}-${i}`} className="leftout__item">
                <p className="leftout__text">{c.text}</p>
                <p className="field__help">{c.reason}</p>
                <button type="button" className="btn btn--sm btn--secondary" onClick={() => saveWithUndo(state, moveBackIn(state, i), "Moved back in.")}>
                  Move back in
                </button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>

      <PreviewModal open={previewOpen} survey={preview} onClose={() => setPreviewOpen(false)} />

      <ConfirmDialog
        open={confirmReplace}
        title="Update the whole draft?"
        confirmLabel="Update draft"
        onClose={() => setConfirmReplace(false)}
        onConfirm={() => {
          setConfirmReplace(false);
          const req = updateDraftRequest();
          if (req) void redraft(req);
        }}
      >
        <p>The AI will write a new draft from your answers. Changes you accepted in this draft will be replaced.</p>
      </ConfirmDialog>
    </>
  );
}

/** One blank: type the real words once and they replace it everywhere. */
function FillRow({ word, initial, onFill }: { word: string; initial: string; onFill: (word: string, value: string) => void }) {
  const id = useId();
  const [value, setValue] = useState(initial);
  return (
    <form
      className="mb__fill"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onFill(word, value);
      }}
    >
      <label htmlFor={id} className="mb__fill-label">
        {word.slice(1, -1)}
      </label>
      <input id={id} className="mb__fill-input" data-word={word} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Type here" autoComplete="off" />
      <button type="submit" className="mb__textbtn" disabled={!value.trim()}>
        Done
      </button>
    </form>
  );
}
