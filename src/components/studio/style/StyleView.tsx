"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowClockwise, ArrowRight, Check, Info, LockSimple, Sparkle, Warning, X } from "@/components/icons";
import { Badge, ComputedMark } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { gamify } from "@/lib/ai/client";
import { useMediaQuery } from "@/lib/client-hooks";
import { revealEligible } from "@/lib/player/rules";
import type { Mechanic, PlayfulLevel, PresentationStyle, Question, Shape, ThemeName } from "@/lib/player/types";
import { surveyHref } from "@/lib/studio/sections";
import { studio } from "@/lib/studio/store";
import {
  type CopyField,
  LEVEL_INFO,
  MECHANIC_LABEL,
  STYLE_INFO,
  fieldLimit,
  fieldPath,
  fieldProblem,
  getField,
  initialLook,
  keepChoices,
  lookToPlayer,
  mechanicOptions,
  questionsSig,
  restyle,
  setField,
  styleGate,
  styleQuestions,
  themeCheck,
  wordCount,
} from "@/lib/studio/style";
import type { StudioSurvey, StyleSettings } from "@/lib/studio/types";
import { StepRail } from "../StepRail";
import { TopBar } from "../TopBar";
import { StylePreview } from "./StylePreview";

const STYLES: PresentationStyle[] = ["one_per_screen", "pages", "chat", "classic"];
const LEVELS: PlayfulLevel[] = ["off", "light", "medium"];
const THEMES: { value: ThemeName | "custom"; label: string }[] = [
  { value: "marigold", label: "Marigold" },
  { value: "lagoon", label: "Lagoon" },
  { value: "night", label: "Night" },
  { value: "custom", label: "Custom" },
];
const SHAPES: { value: Shape; label: string }[] = [
  { value: "soft", label: "Soft" },
  { value: "round", label: "Round" },
  { value: "pill", label: "Pill" },
];
const MAX_REVEAL = 3;

/**
 * S5 Style and gamify (UI_UX_LAYOUT.md): how the survey feels, never what it asks. The
 * gamifier writes the on-screen words; the creator can edit or rewrite every line, and the
 * phone preview is the real Player.
 */
export function StyleView({ survey }: { survey: StudioSurvey }) {
  const router = useRouter();
  const toast = useToast();
  const narrow = useMediaQuery("(max-width: 1023px)");
  const questions = useMemo(() => styleQuestions(survey), [survey]);
  const sig = questionsSig(questions);
  const look: StyleSettings = survey.look ?? initialLook();
  const g = look.gamified;

  const [busy, setBusy] = useState<"" | "all" | string>("");
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { style: PresentationStyle; level: PlayfulLevel } | "regenerate">(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const startedFor = useRef<string | null>(null);

  const needsWords = !g || look.questionsSig !== sig;
  const autoFailed = failedFor === sig;
  const writing = busy === "all" || (needsWords && !autoFailed);
  const previewSlug = `preview-style-${survey.id}`;
  const player = useMemo(() => lookToPlayer(survey, look, previewSlug, "Your organisation"), [survey, look, previewSlug]);
  const gate = styleGate(survey, survey.look);
  const check = themeCheck(look);

  const save = (change: (current: StyleSettings) => Partial<StyleSettings>) =>
    studio.patch(survey.id, (s) => {
      const current = s.look ?? initialLook();
      return { look: { ...current, ...change(current) } };
    });

  /** Ask the gamifier for words. Returns false when it couldn't be reached. */
  async function writeWords(style: PresentationStyle | "auto", level: PlayfulLevel): Promise<boolean> {
    const seed = look.seed + 1;
    const res = await gamify({
      questions,
      style,
      level,
      seed,
      purpose_line: survey.builder?.purpose_line ?? "",
      consent_line: survey.builder?.consent_line ?? "",
    });
    if (!res) return false;
    save((current) => ({
      style: res.gamified.style,
      level,
      seed,
      gamified: keepChoices(res.gamified, current.questionsSig === sig ? current.gamified : null, questions),
      editedFields: [],
      recommendation: res.recommendation,
      questionsSig: sig,
      engine: res.engine,
    }));
    return true;
  }

  // First visit, or the questions changed in Build: write the words (UI_UX_LAYOUT.md S5 "Data").
  useEffect(() => {
    if (!needsWords || autoFailed || startedFor.current === sig || questions.length === 0) return;
    startedFor.current = sig;
    const refresh = !!survey.look?.gamified;
    void writeWords(refresh ? look.style : "auto", look.level).then((ok) => {
      if (!ok) setFailedFor(sig);
      else if (refresh) toast({ message: "Your questions changed, so the on-screen words were written again." });
    });
    // writeWords reads the latest survey; re-running only when the question set changes is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsWords, autoFailed, sig, questions.length]);

  async function regenerate(style: PresentationStyle, level: PlayfulLevel) {
    setBusy("all");
    // Show the new style straight away; the new words follow.
    if (g) save(() => ({ style, level, gamified: restyle(g, questions, style, level) }));
    const ok = await writeWords(style, level);
    setBusy("");
    if (!ok) toast({ message: "We couldn’t write new words just now. Your current words are kept." });
  }

  function choose(style: PresentationStyle, level: PlayfulLevel) {
    if (style === look.style && level === look.level) return;
    if (!g) {
      save(() => ({ style, level }));
      return;
    }
    if (look.editedFields.length) setConfirm({ style, level });
    else void regenerate(style, level);
  }

  function keepEdits(style: PresentationStyle, level: PlayfulLevel) {
    if (g) save(() => ({ style, level, gamified: restyle(g, questions, style, level) }));
  }

  function editLine(f: CopyField, value: string) {
    if (!g) return;
    const path = fieldPath(f);
    save((current) => ({
      gamified: current.gamified ? setField(current.gamified, f, value) : current.gamified,
      editedFields: current.editedFields.includes(path) ? current.editedFields : [...current.editedFields, path],
    }));
  }

  async function rewriteLine(f: CopyField) {
    if (!g) return;
    const path = fieldPath(f);
    const before = getField(g, f);
    setBusy(path);
    let seed = look.seed;
    let text: string | null = null;
    for (let tries = 0; tries < 3; tries++) {
      seed += 1;
      const res = await gamify({ questions, style: look.style, level: look.level, seed, purpose_line: "", consent_line: "" });
      if (!res) break;
      text = getField(res.gamified, f);
      if (text && text !== before) break;
    }
    setBusy("");
    if (text === null) {
      toast({ message: "We couldn’t rewrite that line just now. Try again in a moment." });
      return;
    }
    save((current) => ({
      seed,
      gamified: current.gamified ? setField(current.gamified, f, text) : current.gamified,
      editedFields: current.editedFields.filter((p) => p !== path),
    }));
    toast({ message: "Line rewritten.", action: { label: "Undo", onClick: () => save((c) => ({ gamified: c.gamified ? setField(c.gamified, f, before) : c.gamified })) } });
  }

  function setMechanic(q: Question, mechanic: Mechanic) {
    save((current) =>
      current.gamified
        ? {
            gamified: {
              ...current.gamified,
              items: current.gamified.items.map((i) =>
                i.question_id === q.id ? { ...i, mechanic, mechanic_params: { emoji_set: mechanic === "emoji_scale" ? "faces_5" : "none" } } : i,
              ),
            },
          }
        : {},
    );
  }

  function toggleReveal(id: string, on: boolean) {
    save((current) => {
      if (!current.gamified) return {};
      const chosen = new Set(current.gamified.reveal.question_ids);
      if (on) chosen.add(id);
      else chosen.delete(id);
      const ordered = questions.map((q) => q.id).filter((x) => chosen.has(x)).slice(0, MAX_REVEAL);
      return { gamified: { ...current.gamified, reveal: { ...current.gamified.reveal, question_ids: ordered } } };
    });
  }

  function goNext() {
    if (!gate.ok) return;
    if (survey.step !== "publish") studio.patch(survey.id, () => ({ step: "publish" }));
    router.push(surveyHref(survey.id, "publish"));
  }

  const lineProps = (f: CopyField) => ({
    field: f,
    value: g ? getField(g, f) : "",
    edited: look.editedFields.includes(fieldPath(f)),
    loading: writing || busy === fieldPath(f),
    disabled: writing || !!busy,
    onChange: (v: string) => editLine(f, v),
    onRewrite: () => void rewriteLine(f),
  });

  const playful = look.level !== "off" && look.style !== "classic";
  const qLabel = (id: string) => {
    const q = questions.find((x) => x.id === id);
    return q ? `${q.id} · ${q.text}` : id;
  };

  const preview = (frame: "phone" | "sheet") => <StylePreview survey={player} frame={frame} />;

  return (
    <>
      <TopBar
        crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
        status="draft"
        saved
        secondary={[{ label: "Desktop preview", onClick: () => setDesktopOpen(true) }]}
        primary={{ label: "Next: Publish", Icon: ArrowRight, iconAfter: true, onClick: goNext, disabledReason: gate.ok ? undefined : gate.reasons[0] }}
      />
      <StepRail surveyId={survey.id} reached={survey.step} current="style" />

      <div className="stylepage">
        <main className="stylepage__main">
          <h1 className="stylepage__title">How should it feel?</h1>
          <p className="stylepage__lede">
            Pick a style and a theme. The questions stay exactly as you approved them.{" "}
            <Link href={surveyHref(survey.id, "build")} className="link">
              Change the questions
            </Link>
          </p>

          {autoFailed && !g && (
            <div className="status-banner status-banner--warning" role="alert">
              <strong>We couldn’t write the on-screen words.</strong>
              <span>The preview uses plain default words for now.</span>
              <button
                type="button"
                className="btn btn--sm btn--secondary"
                onClick={() => {
                  setFailedFor(null);
                  startedFor.current = null;
                }}
              >
                Try again
              </button>
            </div>
          )}

          {/* 1 · Style */}
          <section className="stylesec" aria-labelledby="sec-style">
            <SectionTitle n={1} id="sec-style" title="Style" />
            <div className="stylecards" role="radiogroup" aria-labelledby="sec-style">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={look.style === s}
                  className="stylecard"
                  onClick={() => choose(s, look.level)}
                  disabled={busy === "all"}
                >
                  <StyleThumb style={s} />
                  <span className="stylecard__name">
                    {STYLE_INFO[s].label}
                    {look.recommendation?.style === s && <span className="stylecard__rec">Recommended</span>}
                  </span>
                  <span className="stylecard__about">{STYLE_INFO[s].about}</span>
                  {look.style === s && (
                    <span className="stylecard__check" aria-hidden="true">
                      <Check size={14} weight="bold" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            {look.recommendation && (
              <p className="stylerec">
                <Badge kind="ai" />
                <span>
                  Recommends <strong>{STYLE_INFO[look.recommendation.style].label}</strong>: {look.recommendation.reason}
                </span>
              </p>
            )}
          </section>

          {/* 2 · Playful level */}
          <section className="stylesec" aria-labelledby="sec-level">
            <SectionTitle n={2} id="sec-level" title="Playful level" />
            <div className="segmented" role="group" aria-labelledby="sec-level">
              {LEVELS.map((l) => (
                <button key={l} type="button" aria-pressed={look.level === l} onClick={() => choose(look.style, l)} disabled={busy === "all"}>
                  {LEVEL_INFO[l].label}
                </button>
              ))}
            </div>
            <p className="field__help">{LEVEL_INFO[look.level].about}</p>
            {look.style === "classic" && look.level !== "off" && (
              <p className="field__help">Classic is a plain form, so it shows no lead-ins or feedback at any level.</p>
            )}
            <p className="stylenote">
              <LockSimple size={14} weight="bold" aria-hidden="true" /> No points, prizes, timers or sliders. They reward certain answers or make people rush.
            </p>
          </section>

          {/* 3 · Theme */}
          <section className="stylesec" aria-labelledby="sec-theme">
            <SectionTitle n={3} id="sec-theme" title="Theme" />
            <div className="swatches" role="radiogroup" aria-labelledby="sec-theme">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={look.theme === t.value}
                  className={`swatch swatch--${t.value}`}
                  onClick={() => save(() => ({ theme: t.value }))}
                  style={t.value === "custom" ? { ["--sw-bg" as string]: look.custom.bg, ["--sw-btn" as string]: check?.theme.button ?? look.custom.button } : undefined}
                >
                  <span className="swatch__chip" aria-hidden="true">
                    <i />
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
            {look.theme === "custom" && check && (
              <div className="customtheme">
                <ColorField label="Background" value={look.custom.bg} onChange={(bg) => save((c) => ({ custom: { ...c.custom, bg } }))} />
                <ColorField label="Button" value={look.custom.button} onChange={(button) => save((c) => ({ custom: { ...c.custom, button } }))} />
                <div className={`contrast ${check.ok ? "is-ok" : "is-bad"}`} role="status">
                  <strong>
                    {check.ok ? <Check size={14} weight="bold" aria-hidden="true" /> : <X size={14} weight="bold" aria-hidden="true" />}
                    {check.ok ? "Readable" : "Too hard to read"}
                  </strong>
                  <span>
                    Text {ratio(check.ratios.text)} · Button {ratio(check.ratios.button)} · Links {ratio(check.ratios.link)}
                    <ComputedMark />
                  </span>
                  <span className="contrast__rule">Every pair needs 4.5:1 or more.</span>
                  {check.adjusted && check.ok && (
                    <span>
                      We darkened your button a little (<code>{check.theme.button}</code>) so its words stay readable.
                    </span>
                  )}
                  {!check.ok && <span>Pick a lighter or darker background.</span>}
                </div>
              </div>
            )}
            <div className="segmented segmented--sm" role="group" aria-label="Roundness">
              {SHAPES.map((s) => (
                <button key={s.value} type="button" aria-pressed={look.shape === s.value} onClick={() => save(() => ({ shape: s.value }))}>
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* 4 · Words on screen */}
          <section className="stylesec" aria-labelledby="sec-words" aria-busy={writing}>
            <div className="stylesec__head">
              <SectionTitle n={4} id="sec-words" title="Words on screen" />
              <button
                type="button"
                className="btn btn--sm btn--ai"
                disabled={!g || !!busy || writing}
                onClick={() => (look.editedFields.length ? setConfirm("regenerate") : void regenerate(look.style, look.level))}
              >
                <ArrowClockwise size={16} weight="bold" aria-hidden="true" /> Regenerate words
              </button>
            </div>
            {writing && (
              <p className="ai-writing" role="status">
                <Sparkle size={16} weight="fill" aria-hidden="true" /> Writing the on-screen words…
              </p>
            )}

            <fieldset className="copygroup">
              <legend>Welcome</legend>
              <CopyLine label="Welcome title" {...lineProps({ kind: "intro", key: "title" })} />
              <CopyLine label="Start button" {...lineProps({ kind: "intro", key: "start_button" })} />
              <p className="field__help">The purpose and consent lines show here too, exactly as approved in Questions.</p>
            </fieldset>

            <fieldset className="copygroup">
              <legend>During</legend>
              {!playful && (
                <p className="field__help">
                  <Info size={14} weight="bold" aria-hidden="true" />{" "}
                  {look.style === "classic" ? "Classic shows no lead-ins or feedback." : "Off shows no lead-ins, feedback or progress messages."}
                </p>
              )}
              {playful &&
                (g?.items ?? []).map((item) => (
                  <div key={item.question_id} className="copyq">
                    <p className="copyq__q">{qLabel(item.question_id)}</p>
                    <CopyLine label="Lead-in" {...lineProps({ kind: "item", id: item.question_id, key: "lead_in" })} />
                    {look.level === "medium" && (
                      <CopyLine label="After any answer" {...lineProps({ kind: "item", id: item.question_id, key: "feedback_after_answer" })} />
                    )}
                  </div>
                ))}
              {playful &&
                (g?.milestones ?? []).map((m, index) => (
                  <CopyLine key={`m-${index}`} label={`Progress message after ${m.after_question_id}`} {...lineProps({ kind: "milestone", index })} />
                ))}
              {look.style === "pages" &&
                (g?.screens ?? []).map((s, index) =>
                  index === 0 ? null : <CopyLine key={s.screen_id} label={`Before page ${index + 1}`} {...lineProps({ kind: "page", index })} />,
                )}
            </fieldset>

            <fieldset className="copygroup">
              <legend>End</legend>
              <CopyLine label="Thank-you message" {...lineProps({ kind: "closing", key: "thank_you" })} />
              <CopyLine label="Enjoyment question" {...lineProps({ kind: "closing", key: "enjoyment_prompt" })} />
            </fieldset>
          </section>

          {/* 5 · How each question is answered */}
          <section className="stylesec" aria-labelledby="sec-mech">
            <details className="mechlist">
              <summary>
                <SectionTitle n={5} id="sec-mech" title="How each question is answered" as="span" />
                <span className="mechlist__count">{questions.length} questions</span>
              </summary>
              <p className="field__help">Only the answer styles allowed for each question type are offered. Wording, options and scales can’t change here.</p>
              <ol className="mechlist__list">
                {questions.map((q) => {
                  const options = mechanicOptions(q);
                  const current = g?.items.find((i) => i.question_id === q.id)?.mechanic ?? options[0];
                  return (
                    <li key={q.id} className="mechrow">
                      <span className="mechrow__q">
                        <strong>{q.id}</strong> {q.text}
                      </span>
                      {options.length > 1 ? (
                        <select
                          className="input mechrow__select"
                          aria-label={`Answer style for ${q.id}`}
                          value={current}
                          disabled={!g}
                          onChange={(e) => setMechanic(q, e.target.value as Mechanic)}
                        >
                          {options.map((m) => (
                            <option key={m} value={m}>
                              {MECHANIC_LABEL[m]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="mechrow__only">{MECHANIC_LABEL[current]}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
              <Link href={surveyHref(survey.id, "build")} className="link">
                Edit the questions in Questions
              </Link>
            </details>
          </section>

          {/* 6 · Results reveal */}
          <section className="stylesec" aria-labelledby="sec-reveal">
            <SectionTitle n={6} id="sec-reveal" title="Results reveal" />
            <p className="field__help">
              After they submit, people can see how everyone answered up to {MAX_REVEAL} questions. It shows only once 20 or more people have answered, as group totals.
            </p>
            <ul className="revealpick">
              {questions.map((q) => {
                const why = revealEligible(q);
                const chosen = g?.reveal.question_ids.includes(q.id) ?? false;
                const full = (g?.reveal.question_ids.length ?? 0) >= MAX_REVEAL;
                return (
                  <li key={q.id}>
                    <label className={`revealpick__row ${why ? "is-off" : ""}`}>
                      <input type="checkbox" checked={chosen} disabled={!g || !!why || (!chosen && full)} onChange={(e) => toggleReveal(q.id, e.target.checked)} />
                      <span>
                        <strong>{q.id}</strong> {q.text}
                        {why && <span className="revealpick__why">{why}</span>}
                        {!why && !chosen && full && <span className="revealpick__why">Up to {MAX_REVEAL}. Untick one to swap.</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {(g?.reveal.question_ids.length ?? 0) > 0 && <CopyLine label="Reveal heading" {...lineProps({ kind: "reveal_intro" })} />}
            <CopyLine label="Before 20 people have answered" {...lineProps({ kind: "closing", key: "reveal_teaser" })} />
          </section>

          {!gate.ok && g && (
            <p className="builder__gate" role="status">
              <Warning size={16} weight="bold" aria-hidden="true" /> {gate.reasons[0]}
            </p>
          )}
        </main>

        {!narrow && (
          <aside className="stylepage__preview" aria-label="Live preview">
            {desktopOpen ? <p className="field__help">Showing the desktop preview.</p> : preview("phone")}
          </aside>
        )}
      </div>

      {narrow && (
        <button type="button" className="peekbar" onClick={() => setSheetOpen(true)}>
          Preview on a phone
        </button>
      )}
      <Drawer open={sheetOpen} title="Preview" side="bottom" onClose={() => setSheetOpen(false)}>
        {sheetOpen && preview("sheet")}
      </Drawer>

      <DesktopPreview open={desktopOpen} onClose={() => setDesktopOpen(false)}>
        {desktopOpen && <StylePreview survey={player} frame="desktop" />}
      </DesktopPreview>

      <ConfirmDialog
        open={confirm !== null && confirm !== "regenerate"}
        title="Write new words for this style?"
        confirmLabel="Write new words"
        cancelLabel="Keep my edits"
        onConfirm={() => {
          if (confirm && confirm !== "regenerate") void regenerate(confirm.style, confirm.level);
          setConfirm(null);
        }}
        onClose={() => {
          if (confirm && confirm !== "regenerate") keepEdits(confirm.style, confirm.level);
          setConfirm(null);
        }}
      >
        You edited some on-screen words. New words would fit the new style better, but your edits would be replaced. Mechanics and the reveal stay as you set them.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "regenerate"}
        title="Replace your edited words?"
        confirmLabel="Write new words"
        cancelLabel="Keep my edits"
        onConfirm={() => {
          setConfirm(null);
          void regenerate(look.style, look.level);
        }}
        onClose={() => setConfirm(null)}
      >
        Every line on screen will be written again, including the ones you changed.
      </ConfirmDialog>
    </>
  );
}

/* ---------------- pieces ---------------- */

/** Rounded down, so a failing 4.47 never reads as a passing 4.5. */
const ratio = (r: number) => `${(Math.floor(r * 10) / 10).toFixed(1)}:1`;

function SectionTitle({ n, id, title, as = "h2" }: { n: number; id: string; title: string; as?: "h2" | "span" }) {
  const Tag = as;
  return (
    <Tag id={id} className="stylesec__title">
      <span className="stylesec__n" aria-hidden="true">
        {n}
      </span>
      {title}
    </Tag>
  );
}

function StyleThumb({ style }: { style: PresentationStyle }) {
  return (
    <span className={`thumb thumb--${style}`} aria-hidden="true">
      {style === "one_per_screen" && (
        <>
          <i className="thumb__line" />
          <i className="thumb__tile" />
          <i className="thumb__tile" />
          <i className="thumb__btn" />
        </>
      )}
      {style === "pages" && (
        <>
          <i className="thumb__line" />
          <i className="thumb__mini" />
          <i className="thumb__line" />
          <i className="thumb__mini" />
          <i className="thumb__btn" />
        </>
      )}
      {style === "chat" && (
        <>
          <i className="thumb__bubble" />
          <i className="thumb__bubble thumb__bubble--me" />
          <i className="thumb__bubble" />
        </>
      )}
      {style === "classic" && (
        <>
          <i className="thumb__line" />
          <i className="thumb__field" />
          <i className="thumb__line" />
          <i className="thumb__field" />
          <i className="thumb__line" />
        </>
      )}
    </span>
  );
}

function CopyLine({
  label,
  field,
  value,
  edited,
  loading,
  disabled,
  onChange,
  onRewrite,
}: {
  label: string;
  field: CopyField;
  value: string;
  edited: boolean;
  loading: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onRewrite: () => void;
}) {
  const id = useId();
  const words = wordCount(value);
  const limit = fieldLimit(field);
  const problem = loading ? null : fieldProblem(field, value);
  return (
    <div className={`copyline ${problem ? "has-problem" : ""}`}>
      <div className="copyline__head">
        <label htmlFor={id} className="field__label">
          {label}
        </label>
        {edited ? <Badge kind="human">You edited</Badge> : <Badge kind="ai" />}
      </div>
      {loading ? (
        <span className="skeleton copyline__skeleton" aria-hidden="true" />
      ) : (
        <input
          id={id}
          className="input"
          value={value}
          maxLength={160}
          aria-invalid={problem ? true : undefined}
          aria-describedby={`${id}-meta`}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <div className="copyline__meta" id={`${id}-meta`}>
        <span className={`copyline__count ${words > limit ? "is-over" : ""}`}>
          {words}/{limit} words
        </span>
        {problem && (
          <span className="copyline__problem">
            <Warning size={14} weight="bold" aria-hidden="true" /> {problem}
          </span>
        )}
        <button type="button" className="copyline__rewrite" onClick={onRewrite} disabled={disabled}>
          <Sparkle size={14} weight="fill" aria-hidden="true" /> Rewrite
        </button>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="colorfield">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="colorfield__row">
        <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <input
          className="input colorfield__hex"
          aria-label={`${label} colour code`}
          value={draft ?? value}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.trim();
            setDraft(v);
            if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase());
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
    </div>
  );
}

function DesktopPreview({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal modal--desktop"
      aria-label="Desktop preview"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button type="button" className="phone-frame__close" aria-label="Close preview" onClick={onClose}>
        <X size={18} weight="bold" />
      </button>
      {children}
    </dialog>
  );
}

