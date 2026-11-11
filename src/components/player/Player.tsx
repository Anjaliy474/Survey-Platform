"use client";

import { ArrowLeft, CloudSlash, LockSimple } from "@/components/icons";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/Badge";
import { useFinePointer, usePrefersReducedMotion } from "@/lib/client-hooks";
import { useOnline, useProgress } from "@/lib/player/progress-store";
import { newResponseId, recordResponse, updateResponse } from "@/lib/player/published-store";
import { computePlayerReveal } from "@/lib/player/reveal";
import {
  AUTO_ADVANCE_MS,
  SINGLE_VALUE,
  buildScreens,
  fillTokens,
  firstMissingRequired,
  isAnswered,
  remainingLabel,
  summarize,
  surveyLengthLabel,
} from "@/lib/player/rules";
import type { Answer, PlayerSurvey, PlayfulLevel, PresentationStyle, Question, ThemeName } from "@/lib/player/types";
import { Burst, RevealRow } from "./Celebration";
import { EmojiScale, FACES_5, ProgressBar, RemainingPill } from "./mechanics";
import { QuestionBlock, headingId } from "./QuestionBlock";

const STYLES: PresentationStyle[] = ["one_per_screen", "pages", "chat", "classic"];
const LEVELS: PlayfulLevel[] = ["off", "light", "medium"];
const THEMES: ThemeName[] = ["marigold", "lagoon", "night"];
const ENJOYMENT = ["Not at all", "Not really", "It was okay", "Enjoyable", "Very enjoyable"];

/** Preview overrides (?style=chat&level=medium&theme=night), used for demos and the Studio preview. */
function subscribeUrl(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}
function usePreviewOverrides() {
  const search = useSyncExternalStore(subscribeUrl, () => window.location.search, () => "");
  return useMemo(() => {
    const p = new URLSearchParams(search);
    const pick = <T extends string>(key: string, allowed: T[]) => allowed.find((v) => v === p.get(key));
    return { style: pick("style", STYLES), level: pick("level", LEVELS), theme: pick("theme", THEMES) };
  }, [search]);
}

/** The theme class, plus inline colours for a creator's custom theme (already contrast-checked). */
function themeLook(survey: PlayerSurvey, override?: ThemeName): { className: string; style?: CSSProperties } {
  const shape = survey.shape && survey.shape !== "round" ? ` player--shape-${survey.shape}` : "";
  const c = survey.customTheme;
  if (override || !c) return { className: `theme-${override ?? survey.theme}${shape}` };
  const dark = c.text.toLowerCase() === "#ffffff";
  return {
    className: `theme-${dark ? "night" : "marigold"}${shape}`,
    style: {
      "--theme-bg": c.bg,
      "--theme-text": c.text,
      "--theme-button": c.button,
      "--theme-button-text": c.buttonText,
      "--theme-accent": c.button,
      "--theme-link": c.link,
      "--theme-tile": dark ? `color-mix(in srgb, ${c.bg} 86%, #ffffff)` : "#ffffff",
      "--theme-tile-border": `color-mix(in srgb, ${c.text} 16%, ${c.bg})`,
      "--theme-selected": `color-mix(in srgb, ${c.button} 14%, ${c.bg})`,
      "--theme-pill": `color-mix(in srgb, ${c.button} 18%, ${c.bg})`,
    } as CSSProperties,
  };
}

/**
 * The survey Player (UI_UX_LAYOUT.md P1): Welcome → questions → Submit → Thank-you → reveal.
 * Public, no login, one 560px column on the creator's theme.
 *
 * `preview` is the Studio's phone preview: it never scrolls the page around it, and the
 * Thank-you screen always shows the thank-you words.
 */
export function Player({ survey, preview = false }: { survey: PlayerSurvey; preview?: boolean }) {
  const overrides = usePreviewOverrides();
  const style = (!preview && overrides.style) || survey.gamified.style;
  const level = (!preview && overrides.level) || survey.gamified.playful_level;
  const look = themeLook(survey, preview ? undefined : overrides.theme);
  const reduce = usePrefersReducedMotion();
  const fine = useFinePointer();
  const online = useOnline();
  const { progress, store } = useProgress(survey.slug);

  const [justSubmitted, setJustSubmitted] = useState(false);
  const [direction, setDirection] = useState(1);
  const [missingId, setMissingId] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const focusPending = useRef(false);

  const screens = useMemo(() => buildScreens(survey, style), [survey, style]);
  const questionById = useMemo(() => new Map(survey.questions.map((q) => [q.id, q])), [survey]);
  const itemById = useMemo(() => new Map(survey.gamified.items.map((i) => [i.question_id, i])), [survey]);
  const q = (id: string) => questionById.get(id) as Question;

  const view: "welcome" | "answering" | "done" =
    progress.status === "submitted" ? "done" : progress.status === "answering" ? "answering" : "welcome";
  const index = Math.min(progress.screen, screens.length - 1);
  const current = screens[index].map(q);
  const questionsFromHere = screens.slice(index).flat().map(q);
  const answers = progress.answers;
  const playful = level !== "off" && style !== "classic";
  const showFeedback = level === "medium" && style !== "classic";
  const pop = level === "medium" && !reduce;

  // After a screen change: move focus to the first question and bring it into view.
  const screenKey = `${view}-${index}-${style}`;
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    const target = view === "answering" ? headingId(screens[index][0]) : "player-title";
    const el = document.getElementById(target);
    el?.focus({ preventScroll: true });
    if (preview) {
      const box = el?.closest<HTMLElement>("[data-preview-scroll]");
      box?.scrollTo({ top: style === "chat" && view === "answering" ? box.scrollHeight : 0, behavior: reduce ? "auto" : "smooth" });
      return;
    }
    if (style === "chat" && view === "answering") {
      document.getElementById("chat-current")?.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    }
  }, [screenKey, screens, index, style, view, reduce, preview]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function goTo(target: number) {
    window.clearTimeout(timer.current);
    setMissingId(null);
    focusPending.current = true;
    if (target < 0) {
      store.update((p) => ({ ...p, status: "new" }));
      return;
    }
    if (target >= screens.length) {
      submit();
      return;
    }
    setDirection(target >= index ? 1 : -1);
    store.update((p) => ({ ...p, status: "answering", screen: target }));
    store.logEvent({ type: "screen", screen: target });
  }

  function start() {
    focusPending.current = true;
    setDirection(1);
    store.update((p) => ({ ...p, status: "answering", screen: p.screen ?? 0, startedAt: p.startedAt ?? Date.now() }));
    store.logEvent({ type: "start" });
  }

  function answer(question: Question, value: Answer, singlePick: boolean) {
    store.saveAnswer(question.id, value);
    if (missingId === question.id) setMissingId(null);
    window.clearTimeout(timer.current);
    const mechanic = itemById.get(question.id)?.mechanic;
    const auto = singlePick && mechanic && SINGLE_VALUE.includes(mechanic) && (style === "one_per_screen" || style === "chat");
    if (auto && index < screens.length - 1) {
      const from = index;
      timer.current = window.setTimeout(() => goTo(from + 1), AUTO_ADVANCE_MS);
    }
  }

  function submit() {
    const missing = firstMissingRequired(survey.questions, store.getSnapshot().answers);
    if (missing) {
      setMissingId(missing.id);
      if (style === "classic") {
        const el = document.getElementById(headingId(missing.id));
        el?.focus({ preventScroll: true });
        el?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      } else {
        goTo(screens.findIndex((s) => s.includes(missing.id)));
      }
      return;
    }
    focusPending.current = true;
    store.update((p) => ({ ...p, status: "submitted", submittedAt: Date.now(), pendingSync: !navigator.onLine, responseId: newResponseId() }));
    store.logEvent({ type: "submit" });
    const done = store.getSnapshot();
    if (!preview && done.responseId) {
      recordResponse(survey.slug, { id: done.responseId, startedAt: done.startedAt, submittedAt: done.submittedAt ?? 0, answers: done.answers, enjoyment: null });
    }
    setJustSubmitted(true);
  }

  function resetDemo() {
    focusPending.current = true;
    setJustSubmitted(false);
    store.reset();
  }

  /* ---------- top bar ---------- */
  const progressValue =
    view === "done" ? 1 : view === "welcome" ? 0 : style === "classic" ? survey.questions.filter((x) => isAnswered(x, answers[x.id])).length / survey.questions.length : index / screens.length;
  const leftLabel =
    style === "classic"
      ? remainingLabel(survey.questions.filter((x) => !isAnswered(x, answers[x.id])))
      : remainingLabel(questionsFromHere);
  const announce =
    style === "classic" ? `${survey.questions.length} questions on one page` : style === "pages" ? `Page ${index + 1} of ${screens.length}` : `Question ${index + 1} of ${screens.length}`;

  const header = (
    <>
      <div className="player__progress">
        <ProgressBar value={progressValue} />
      </div>
      {!online && (
        <p className="player__offline" role="status">
          <CloudSlash size={16} weight="bold" aria-hidden="true" /> You’re offline. We’ll send your answers when you’re back.
        </p>
      )}
      <div className="player__top">
        {survey.creator.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- creator logos are external, sized by CSS
          <img className="player__logo" src={survey.creator.logoUrl} alt={survey.creator.name} />
        ) : (
          <span className="player__creator">{survey.creator.name}</span>
        )}
        {view === "answering" && <RemainingPill>{leftLabel}</RemainingPill>}
      </div>
    </>
  );

  /* ---------- welcome ---------- */
  if (view === "welcome") {
    return (
      <div className={`player ${look.className}`} style={look.style}>
        {header}
        <main className="player__main">
          <div className="pl-screen pl-welcome">
            <h1 id="player-title" tabIndex={-1} className="pl-welcome__title">
              {survey.gamified.intro.title}
            </h1>
            <p className="pl-purpose">{survey.purpose_line}</p>
            {survey.consent_line && (
              <p className="pl-consent">
                <LockSimple size={16} weight="bold" aria-hidden="true" />
                <span>{survey.consent_line}</span>
              </p>
            )}
            <RemainingPill>{surveyLengthLabel(survey.questions)}</RemainingPill>
          </div>
        </main>
        <div className="player__bar">
          <button type="button" className="pl-next" onClick={start}>
            {Object.keys(answers).length > 0 ? "Continue" : survey.gamified.intro.start_button}
          </button>
        </div>
      </div>
    );
  }

  /* ---------- thank-you and reveal ---------- */
  if (view === "done") {
    const reveal = computePlayerReveal(survey, answers);
    return (
      <div className={`player ${look.className}`} style={look.style}>
        {header}
        <main className="player__main">
          <div className="pl-screen pl-done">
            {justSubmitted && !reduce && <Burst />}
            <h1 id="player-title" tabIndex={-1} className="pl-welcome__title">
              {justSubmitted || preview ? survey.gamified.closing.thank_you : "You’ve already answered this one. Thanks!"}
            </h1>
            {progress.pendingSync && !online && (
              <p className="pl-consent">Your answers are saved on this device and will be sent when you’re back online.</p>
            )}

            <section className="pl-enjoy" aria-labelledby="enjoy-title">
              <h2 id="enjoy-title" className="pl-enjoy__title">
                {survey.gamified.closing.enjoyment_prompt}
              </h2>
              <EmojiScale
                points={ENJOYMENT.map((label, i) => ({ face: FACES_5[i], label }))}
                value={progress.enjoyment}
                onChange={(i) => {
                  store.update((p) => ({ ...p, enjoyment: i }));
                  if (progress.responseId && !preview) updateResponse(survey.slug, progress.responseId, { enjoyment: i });
                }}
                labelledBy="enjoy-title"
                pop={!reduce}
                size="compact"
              />
              <p className="pl-feedback" aria-live="polite">
                {progress.enjoyment !== null ? "Thanks for telling us." : ""}
              </p>
            </section>

            {reveal.kind === "reveal" ? (
              <section className="pl-reveal" aria-labelledby="reveal-title">
                <div className="pl-reveal__badges">
                  {reveal.isSample && <Badge kind="sample" />}
                  <Badge kind="computed" />
                </div>
                <h2 id="reveal-title" className="reveal-title">
                  {reveal.intro}
                </h2>
                {reveal.blocks.map((b) => (
                  <div key={b.questionId} className="reveal-block">
                    <p className="reveal-q">{b.text}</p>
                    {b.rows.map((r) => (
                      <RevealRow key={r.label} label={r.label} pct={r.pct} you={r.you} />
                    ))}
                    {b.multi && <p className="reveal-caveat">People could pick several, so these don’t add up to 100%.</p>}
                  </div>
                ))}
              </section>
            ) : (
              <p className="pl-teaser">{reveal.copy}</p>
            )}

            <div className="pl-done__links">
              {survey.creator.url && (
                <a href={survey.creator.url} className="pl-link" rel="noopener">
                  Visit {survey.creator.name}
                </a>
              )}
              <Link href="/" prefetch={false} className="pl-madewith">
                Made with PlaySurvey
              </Link>
              {!preview && survey.settings && !survey.settings.onePerPerson ? (
                <button type="button" className="pl-link pl-again" onClick={resetDemo}>
                  Answer again
                </button>
              ) : (
                !preview && (
                  <button type="button" className="pl-demo-reset" onClick={resetDemo}>
                    Demo only: answer again
                  </button>
                )
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- answering ---------- */
  const isLast = index === screens.length - 1;
  const canContinue = current.every((x) => !x.required || isAnswered(x, answers[x.id]));
  const onlyOptionalLeft = current.every((x) => !x.required && !isAnswered(x, answers[x.id]));
  const nextLabel = style === "classic" || isLast ? "Submit" : onlyOptionalLeft ? "Skip" : style === "pages" ? "Next page" : "Next";
  const prevLast = screens[index - 1]?.at(-1);
  const milestone = playful && prevLast ? survey.gamified.milestones.find((m) => m.after_question_id === prevLast) : undefined;
  const pageNote = style === "pages" ? survey.gamified.screens[index]?.transition_copy : "";

  const block = (x: Question, number?: number) => {
    const item = itemById.get(x.id)!;
    return (
      <QuestionBlock
        key={x.id}
        question={x}
        item={item}
        answer={answers[x.id]}
        onAnswer={(value, single) => answer(x, value, single)}
        number={number}
        leadIn={playful ? item.lead_in : ""}
        feedback={showFeedback ? item.feedback_after_answer || "Got it." : ""}
        pop={pop}
        keyHints={fine && style !== "classic"}
        missing={missingId === x.id}
      />
    );
  };

  return (
    <div className={`player ${look.className} player--${style}`} style={look.style}>
      {header}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <main className="player__main">
        {style === "classic" && (
          <div className="pl-classic">
            <h1 className="pl-classic__title">{survey.title}</h1>
            {survey.questions.map((x, i) => block(x, i + 1))}
          </div>
        )}

        {style === "chat" && (
          <div className="chat-flow">
            {screens.slice(0, index).flat().map((id) => {
              const x = q(id);
              return (
                <div key={id} className="chat-pair">
                  <p className="bubble">{x.text}</p>
                  <button
                    type="button"
                    className="bubble bubble--me"
                    onClick={() => goTo(screens.findIndex((s) => s.includes(id)))}
                    aria-label={`Your answer: ${summarize(x, answers[id])}. Change it`}
                  >
                    {summarize(x, answers[id])}
                  </button>
                </div>
              );
            })}
            <div key={index} id="chat-current" className="chat-current">
              <p className="bubble bubble--typing" aria-hidden="true">
                <i />
                <i />
                <i />
              </p>
              {milestone && <p className="bubble bubble--note">{fillTokens(milestone.copy, { questionsLeft: questionsFromHere })}</p>}
              <div className="chat-current__q">{current.map((x) => block(x))}</div>
            </div>
          </div>
        )}

        {(style === "one_per_screen" || style === "pages") && (
          <div key={index} className={`pl-screen ${direction < 0 ? "is-back" : ""}`}>
            {style === "pages" && (
              <p className="pl-page-head">
                Page {index + 1} of {screens.length}
                {pageNote ? ` · ${pageNote}` : ""}
              </p>
            )}
            {milestone && <p className="pl-milestone">{fillTokens(milestone.copy, { questionsLeft: questionsFromHere })}</p>}
            <div className="pl-stack">{current.map((x) => block(x))}</div>
          </div>
        )}
      </main>

      <div className="player__bar">
        {style !== "classic" && (
          <button type="button" className="pl-back" aria-label={index === 0 ? "Back to the start" : "Previous question"} onClick={() => goTo(index - 1)}>
            <ArrowLeft size={20} weight="bold" />
          </button>
        )}
        <button
          type="button"
          className="pl-next"
          disabled={style !== "classic" && !canContinue}
          onClick={() => (style === "classic" || isLast ? submit() : goTo(index + 1))}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
