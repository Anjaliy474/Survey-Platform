"use client";

import { useRouter } from "next/navigation";
import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Info, LockSimple, Plus, Sparkle, Warning } from "@/components/icons";
import { Badge, ComputedMark } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { checkBias, shapeOnce } from "@/lib/ai/client";
import { looksDuplicate } from "@/lib/ai/parse";
import type { BiasFinding, SurveyRequest } from "@/lib/ai/types";
import { useMediaQuery } from "@/lib/client-hooks";
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
  moveTo,
  nextGate,
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
import { ReviewPanel } from "./ReviewPanel";

const EMPTY_CONTEXT: SurveyRequest["context"] = { audience: "", decision: "", known: "", anonymous: true, sensitive: false, time_limit_seconds: null };

/**
 * S4 Question builder + review (UI_UX_LAYOUT.md), the heart of the product. The AI's proposal
 * arrives as suggestions; the creator accepts, edits or keeps their own wording for each one.
 */
export function BuilderView({ survey }: { survey: StudioSurvey }) {
  const router = useRouter();
  const toast = useToast();
  const narrow = useMediaQuery("(max-width: 1023px)");
  const state = useMemo<BuilderState | null>(
    () => survey.builder ?? (survey.ai ? createBuilderState(survey.ai.shaper, survey.ai.bias, survey.brief) : null),
    [survey.builder, survey.ai, survey.brief],
  );
  const shaper = survey.ai?.shaper;
  const timeLimit = survey.brief?.context.time_limit_seconds ?? null;

  const [flash, setFlash] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [openFinding, setOpenFinding] = useState<{ key: string; category: string } | null>(null);
  const [oneByOne, setOneByOne] = useState<{ total: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState<"" | "suggest" | "update" | "draft">("");
  const [adding, setAdding] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(() => shaper?.status === "conflict" && !survey.builder?.leftOutSeen && (shaper?.cut_questions.length ?? 0) > 0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [drag, setDrag] = useState<{ from: string | null; over: string | null }>({ from: null, over: null });
  const latest = useRef<{ accept: () => void; edit: () => void; keepMine: () => void } | null>(null);

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
  const current = oneByOne ? pending[0] : undefined;
  const findings = state ? openFindings(state) : [];
  const rules = state ? rulesFor(state, timeLimit) : null;
  const gate = state && rules ? nextGate(state, rules) : { ok: false, reasons: ["Draft some questions first."] };
  const biasStale = !!state && state.biasFor !== signature(state.items);
  const labelFor = (key: string) => {
    const i = state?.items.findIndex((x) => x.key === key) ?? -1;
    return i >= 0 ? `Q${i + 1}` : key;
  };

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

  const controls = current
    ? {
        accept: () => doAccept(current.key),
        edit: () => setEditingKey(current.key),
        keepMine: () => (current.original ? doKeepMine(current.key) : doRemove(current.key)),
      }
    : null;
  useEffect(() => {
    latest.current = controls;
  });

  // One-by-one review: focus each pending card in turn; A / E / K act on it.
  useEffect(() => {
    if (!oneByOne || !current) return;
    const el = document.getElementById(`card-${current.key}`);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [oneByOne, current]);

  useEffect(() => {
    if (!oneByOne) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "a") latest.current?.accept();
      else if (k === "e") latest.current?.edit();
      else if (k === "k") latest.current?.keepMine();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [oneByOne]);

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

  function goNext() {
    if (!gate.ok) return;
    if (survey.step === "build") studio.patch(survey.id, () => ({ step: "style" }));
    router.push(surveyHref(survey.id, "style"));
  }

  /* ---------------- drag and drop ---------------- */
  const dnd = (key: string, index: number) => ({
    over: drag.over === key && drag.from !== key,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", key);
      setDrag({ from: key, over: null });
    },
    onDragOver: (e: DragEvent) => {
      if (!drag.from) return;
      e.preventDefault();
      if (drag.over !== key) setDrag({ ...drag, over: key });
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (state && drag.from && drag.from !== key) save(moveTo(state, drag.from, index));
      setDrag({ from: null, over: null });
    },
  });

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
  const toFix = findings.filter((f) => f.severity !== "minor").length;

  const panel = (
    <ReviewPanel
      pendingCount={pendingUnits}
      oneByOne={oneByOne && current ? { index: oneByOne.total - pendingUnits, total: oneByOne.total } : null}
      onAcceptAll={() => {
        const keys = pending.map((p) => p.key);
        saveWithUndo(state, acceptAll(state), `Accepted ${pendingUnits} ${pendingUnits === 1 ? "suggestion" : "suggestions"}.`);
        flashKeys(keys);
        setPanelOpen(false);
      }}
      onStartOneByOne={() => {
        setOneByOne({ total: pendingUnits });
        setPanelOpen(false);
      }}
      onStopOneByOne={() => setOneByOne(null)}
      oneByOneControls={controls}
      findings={findings}
      overallNote={state.bias?.overall_note ?? ""}
      biasStale={biasStale}
      checking={checking}
      onCheckAgain={doCheckAgain}
      onShowFinding={(f: BiasFinding) => {
        setOpenFinding({ key: f.id, category: f.category });
        setPanelOpen(false);
        const el = document.getElementById(`card-${f.id}`);
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
        el?.focus({ preventScroll: true });
      }}
      leftOutCount={state.leftOut.length}
      onOpenLeftOut={() => {
        setLeftOpen(true);
        setPanelOpen(false);
      }}
      notes={shaper?.notes_for_creator ?? []}
      flags={shaper?.flags ?? []}
      labelFor={labelFor}
    />
  );

  return (
    <>
      <TopBar
        crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
        status="draft"
        saved
        secondary={[{ label: "Preview", onClick: () => setPreviewOpen(true) }]}
        primary={{ label: "Next: Style", Icon: ArrowRight, iconAfter: true, onClick: goNext, disabledReason: gate.ok ? undefined : gate.reasons[0] }}
      />
      <StepRail surveyId={survey.id} reached={survey.step} current="build" />

      <div className="rulesbar" role="status" aria-label="Rules check">
        <span className={`rulesbar__item is-${rules.countState}`}>
          <span className="rulesbar__segs" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} className={i < rules.questionCount ? "is-on" : ""} />
            ))}
          </span>
          Questions {rules.questionCount}/10
          <ComputedMark />
        </span>
        <span className="rulesbar__item">
          About {formatDuration(rules.seconds)}
          <ComputedMark />
        </span>
        <span className={`rulesbar__item ${rules.openLastAndOptional ? "is-ok" : "is-warning"}`}>Open {rules.openCount}/2 {rules.openLastAndOptional ? "✓" : "!"}</span>
        <span className={`rulesbar__item ${!rules.consentNeeded || rules.consentPresent ? "is-ok" : "is-blocked"}`}>
          Consent {!rules.consentNeeded ? "not needed" : rules.consentPresent ? "✓" : "missing"}
        </span>
        <span className={`rulesbar__item ${toFix ? "is-warning" : "is-ok"}`}>Bias: {toFix ? `${toFix} to fix` : "clear"}</span>
      </div>

      <div className="builder">
        <main className="builder__main">
          <h1 className="sr-only">Question builder: {survey.title}</h1>
          <div className="field builder__title">
            <label className="field__label" htmlFor="survey-title">
              Survey title
            </label>
            <input
              id="survey-title"
              className="input"
              value={survey.title}
              maxLength={80}
              onChange={(e) => studio.patch(survey.id, () => ({ title: e.target.value }))}
            />
          </div>

          {shaper && (
            <section className="card-s ai-summary" aria-labelledby="ai-sum">
              <div className="ai-summary__head">
                <Badge kind="ai" />
                <h2 id="ai-sum">{shaper.summary_for_creator}</h2>
              </div>
              {shaper.decisions_informed.length > 0 && (
                <details open>
                  <summary>This survey helps you decide ({shaper.decisions_informed.length})</summary>
                  <ul>
                    {shaper.decisions_informed.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </details>
              )}
              {shaper.assumptions.length > 0 && (
                <details open={shaper.mode === "quick_prompt"}>
                  <summary>Assumptions ({shaper.assumptions.length})</summary>
                  <ul>
                    {shaper.assumptions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                  <p className="field__help">To change an assumption, edit the questions below or update the draft from the brief.</p>
                </details>
              )}
            </section>
          )}

          {shaper?.status === "needs_clarification" && (
            <section className="status-banner status-banner--info" aria-labelledby="clarify-title">
              <strong id="clarify-title">A few details would make this better</strong>
              {shaper.clarifying_questions.map((q, i) => (
                <div className="field" key={q}>
                  <label className="field__label" htmlFor={`clarify-${i}`}>
                    {q}
                  </label>
                  <input
                    id={`clarify-${i}`}
                    className="input"
                    value={answers[i] ?? ""}
                    onChange={(e) => setAnswers((a) => Object.assign([...a], { [i]: e.target.value }))}
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn btn--sm btn--ai"
                disabled={busy === "update" || !answers.some((a) => a?.trim())}
                onClick={() => {
                  if (state.items.some((i) => i.status === "accepted")) return setConfirmReplace(true);
                  const req = updateDraftRequest();
                  if (req) void redraft(req);
                }}
              >
                <Sparkle size={16} /> {busy === "update" ? "Updating…" : "Update draft"}
              </button>
              <p>The draft below is based on our assumptions until you answer.</p>
            </section>
          )}
          {shaper?.status === "conflict" && !state.conflictConfirmed && (
            <section className="status-banner status-banner--warning">
              <strong>{shaper.conflict_explanation}</strong>
              <div className="finding__actions">
                <button type="button" className="btn btn--sm btn--primary" onClick={() => save({ ...state, conflictConfirmed: true })}>
                  Confirm core set
                </button>
                <button type="button" className="btn btn--sm btn--secondary" onClick={() => setLeftOpen(true)}>
                  See what was left out ({state.leftOut.length})
                </button>
              </div>
            </section>
          )}
          {shaper?.status === "declined_with_alternative" && (
            <section className="status-banner status-banner--danger">
              <strong>{shaper.declined.reason}</strong>
              <p>Report how many people answered and the exact wording of each question alongside any result.</p>
            </section>
          )}
          {(shaper?.flags ?? []).map((f) => (
            <p key={f} className="status-banner status-banner--danger">
              <Warning size={18} weight="regular" /> {f}
            </p>
          ))}

          <section className="consent-block" aria-labelledby="consent-title">
            <LockSimple size={18} weight="regular" />
            <div className="consent-block__fields">
              <h2 id="consent-title" className="consent-block__title">
                Purpose and consent <span className="field__help">Always shown first. You can edit it, not remove it.</span>
              </h2>
              <label className="field__label" htmlFor="purpose-line">
                Purpose
              </label>
              <textarea id="purpose-line" className="textarea textarea--short" value={state.purpose_line} onChange={(e) => save({ ...state, purpose_line: e.target.value })} />
              {(rules.consentNeeded || state.consent_line) && (
                <>
                  <label className="field__label" htmlFor="consent-line">
                    Consent {rules.consentNeeded && <span className="field__req">Required: personal or sensitive questions</span>}
                  </label>
                  <textarea id="consent-line" className="textarea textarea--short" value={state.consent_line} onChange={(e) => save({ ...state, consent_line: e.target.value })} />
                </>
              )}
            </div>
          </section>

          <ol className="builder__list" aria-label="Questions">
            {state.items.map((item, i) => (
              <li key={item.key}>
                <QuestionCard
                  item={item}
                  index={i}
                  total={state.items.length}
                  findings={findings.filter((f) => f.id === item.key)}
                  focused={current?.key === item.key}
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
                  dnd={dnd(item.key, i)}
                  editing={editingKey === item.key}
                  setEditing={(v) => setEditingKey(v ? item.key : null)}
                  openFinding={openFinding?.key === item.key ? openFinding.category : null}
                  setOpenFinding={(c) => setOpenFinding(c ? { key: item.key, category: c } : null)}
                />
              </li>
            ))}
          </ol>

          {adding ? (
            <div className="qcard qcard--solid">
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
            <div className="builder__add">
              <button type="button" className="btn btn--md btn--secondary" onClick={() => setAdding(true)}>
                <Plus size={16} /> Add question
              </button>
              <button type="button" className="btn btn--md btn--ai" onClick={doSuggestOne} disabled={busy === "suggest"}>
                <Sparkle size={16} /> {busy === "suggest" ? "Suggesting…" : "Suggest one more"}
              </button>
            </div>
          )}
          {!gate.ok && (
            <p className="builder__gate">
              <Info size={16} weight="regular" /> Before moving on: {gate.reasons.join(" ")}
            </p>
          )}
        </main>

        {!narrow && <aside className="builder__panel">{panel}</aside>}
      </div>

      {narrow && (
        <>
          <button type="button" className="peekbar" onClick={() => setPanelOpen(true)} aria-haspopup="dialog">
            {pendingUnits} {pendingUnits === 1 ? "suggestion" : "suggestions"} · {toFix} to fix <span aria-hidden="true">▲</span>
          </button>
          <Drawer open={panelOpen} title="Review" side="bottom" onClose={() => setPanelOpen(false)}>
            {panel}
          </Drawer>
        </>
      )}

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
                <p className="field__help">
                  {c.reason} Suggested home: {c.suggested_home === "later_pulse" ? "a later pulse survey" : c.suggested_home === "optional_section" ? "an optional section" : "drop it"}.
                </p>
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
