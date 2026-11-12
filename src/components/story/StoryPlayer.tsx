"use client";

import { ArrowLeft, ArrowRight, Rows } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StoryPlayerProps } from "@/app/s/[slug]/PlayerApp";
import { Reveal, SendRetry, ThankYou, TitleCard } from "@/components/player/Screens";
import { usePrefersReducedMotion } from "@/lib/client-hooks";
import { hasAnswer } from "@/lib/survey/answers";
import { isOpen } from "@/lib/survey/mechanics";
import type { RevealData } from "@/lib/survey/public";
import { ENDING_SECONDS, INTERLUDE_SECONDS, formatAbout, plainSeconds, storySeconds } from "@/lib/survey/timing";
import { AmbientSound } from "./AmbientSound";
import { Postcard } from "./Postcard";
import { PropChoice } from "./PropChoice";
import { loadTemplate, type StoryTemplate } from "./template-api";

type Phase =
  | { kind: "title" }
  | { kind: "prologue" }
  | { kind: "chapter"; c: number; q: number }
  | { kind: "interlude"; c: number }
  | { kind: "ending" }
  | { kind: "thanks" };

const SINGLE = new Set(["tap_chips_single", "this_or_that", "segmented_scale", "emoji_scale", "number_row_11"]);
const ADVANCE_MS = 650;
const INTERLUDE_MS = 1800;

/**
 * The Story Mode engine: title card → prologue (Full) → chapters → interludes → ending →
 * thank-you and reveal. Questions keep their exact text and order; every answer gets the
 * same acknowledgement; "Plain form" is one tap away on every screen.
 */
export function StoryPlayer({ survey, session, onSwitchPlain }: StoryPlayerProps) {
  const world = survey.world!;
  const level = survey.picks.level;
  const reduced = usePrefersReducedMotion();
  const [template, setTemplate] = useState<StoryTemplate | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "title" });
  const [limitNote, setLimitNote] = useState("");
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [unsent, setUnsent] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let live = true;
    void loadTemplate(world.world.template).then((t) => live && setTemplate(t));
    return () => {
      live = false;
    };
  }, [world.world.template]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const byId = useMemo(() => new Map(survey.questions.map((q) => [q.id, q])), [survey.questions]);
  const chapters = world.chapters;
  const answers = session.response?.answers ?? {};
  const look = world.world.look;
  const mood = world.world.mood;

  /** Index of the question across the whole survey (for switching to plain mid-way). */
  const globalIndex = (c: number, q: number) => chapters.slice(0, c).reduce((n, ch) => n + ch.question_ids.length, 0) + q;

  const timeLeft = (c: number, q: number) => {
    const restQs = survey.questions.slice(globalIndex(c, q));
    const restInterludes = level === "light" ? 0 : chapters.length - 1 - c;
    return formatAbout(plainSeconds(restQs) + restInterludes * INTERLUDE_SECONDS + ENDING_SECONDS);
  };

  const send = useCallback(async () => {
    const result = await session.complete(null);
    setUnsent(!result.ok);
    if (result.ok) setReveal(result.reveal);
  }, [session]);

  const finish = useCallback(async () => {
    setPhase({ kind: "ending" });
    await send();
  }, [send]);

  const go = useCallback(
    (next: Phase) => {
      window.clearTimeout(timer.current);
      setLimitNote("");
      setPhase(next);
    },
    [],
  );

  const nextFrom = useCallback(
    (c: number, q: number) => {
      if (q + 1 < chapters[c].question_ids.length) return go({ kind: "chapter", c, q: q + 1 });
      if (c + 1 >= chapters.length) return void finish();
      if (level === "light" || !chapters[c].interlude_line) return go({ kind: "chapter", c: c + 1, q: 0 });
      go({ kind: "interlude", c });
    },
    [chapters, finish, go, level],
  );

  const backFrom = (c: number, q: number) => {
    if (q > 0) return go({ kind: "chapter", c, q: q - 1 });
    if (c > 0) return go({ kind: "chapter", c: c - 1, q: chapters[c - 1].question_ids.length - 1 });
    go({ kind: "title" });
  };

  // Interludes move on by themselves; tapping skips ahead.
  useEffect(() => {
    if (phase.kind !== "interlude") return;
    const c = phase.c;
    timer.current = window.setTimeout(() => go({ kind: "chapter", c: c + 1, q: 0 }), reduced ? 900 : INTERLUDE_MS);
    return () => window.clearTimeout(timer.current);
  }, [phase, go, reduced]);

  useEffect(() => {
    if (phase.kind === "chapter" && phase.q === 0) session.logEvent("story_chapter_viewed", { chapter: chapters[phase.c].chapter_id });
    if (phase.kind === "chapter") headingRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind, phase.kind === "chapter" ? `${phase.c}:${phase.q}` : ""]);

  if (!template) return <div className="player-state" aria-busy="true" />;
  const { Stage, Ending, Skin } = template;

  const plainButton = (at: number) => (
    <button type="button" className="story-chip" onClick={() => onSwitchPlain(at)}>
      <Rows size={16} weight="bold" aria-hidden="true" /> Plain form
    </button>
  );

  /* ---------------- title, prologue ---------------- */
  if (phase.kind === "title") {
    return (
      <div className={`story story--title mood-${mood} look-${look}`}>
        <Stage chapter={chapters[0]} chapterIndex={0} chapterCount={chapters.length} look={look} mood={mood} reduced={reduced} mode="prologue" history={[]}>
          <div className="story-card story-card--title">
            <TitleCard
              title={world.world.title}
              purposeLine={survey.purposeLine}
              consentLine={survey.consentLine}
              meta={`${survey.questions.length} questions · ${formatAbout(storySeconds(survey.questions, chapters.length, level))}`}
              startLabel="Play"
              logo={survey.picks.logoDataUrl}
              onStart={() => go(level === "full" && world.prologue ? { kind: "prologue" } : { kind: "chapter", c: 0, q: 0 })}
              onPlain={() => onSwitchPlain(0)}
            >
              <p className="story-premise">{world.world.premise}</p>
            </TitleCard>
          </div>
        </Stage>
      </div>
    );
  }

  if (phase.kind === "prologue") {
    return (
      <div className={`story mood-${mood} look-${look}`}>
        <Stage chapter={chapters[0]} chapterIndex={0} chapterCount={chapters.length} look={look} mood={mood} reduced={reduced} mode="prologue" history={[]}>
          <div className="story-card story-card--line">
            <p className="story-line">{world.prologue}</p>
            <div className="pl-nav">
              <button
                type="button"
                className="pl-next"
                onClick={() => {
                  session.logEvent("story_skip_prologue");
                  go({ kind: "chapter", c: 0, q: 0 });
                }}
              >
                Begin <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </button>
            </div>
          </div>
        </Stage>
      </div>
    );
  }

  /* ---------------- interlude ---------------- */
  if (phase.kind === "interlude") {
    const c = phase.c;
    return (
      <div className={`story mood-${mood} look-${look}`}>
        <Stage chapter={chapters[c + 1]} chapterIndex={c + 1} chapterCount={chapters.length} look={look} mood={mood} reduced={reduced} mode="interlude" history={historyUpTo(c + 1)}>
          <button type="button" className="story-card story-card--line story-card--tap" onClick={() => go({ kind: "chapter", c: c + 1, q: 0 })}>
            <span className="story-line">{chapters[c].interlude_line}</span>
            <span className="pl-remaining">{timeLeft(c + 1, 0).replace(/^about/, "About")} left · tap to continue</span>
          </button>
        </Stage>
      </div>
    );
  }

  /* ---------------- ending and thanks ---------------- */
  if (phase.kind === "ending" || phase.kind === "thanks") {
    const g = survey.gamifier;
    return (
      <div className={`story story--end mood-${mood} look-${look}`}>
        <Ending look={look} mood={mood} reduced={reduced} line={world.ending.line}>
          {phase.kind === "ending" ? (
            <div className="story-card story-card--line">
              <p className="story-line">{world.ending.line}</p>
              <button type="button" className="pl-next" onClick={() => go({ kind: "thanks" })}>
                Continue <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="story-card">
              <ThankYou thankYou={g.closing.thank_you} prompt={g.closing.enjoyment_prompt} onEnjoyment={(i) => void session.complete(i)}>
                {unsent ? <SendRetry onRetry={() => void send()} /> : <Reveal data={reveal} teaser={g.closing.reveal_teaser} />}
                <Postcard title={world.ending.postcard_title || world.world.title} chapters={chapters.map((ch) => ch.title)} look={look} mood={mood} />
              </ThankYou>
            </div>
          )}
        </Ending>
      </div>
    );
  }

  /* ---------------- chapter: one question at a time ---------------- */
  const { c, q: qi } = phase;
  const chapter = chapters[c];
  const q = byId.get(chapter.question_ids[qi])!;
  const item = survey.gamifier.items.find((i) => i.question_id === q.id)!;
  const storyItem = world.items.find((i) => i.question_id === q.id)!;
  const value = answers[q.id];
  const answered = hasAnswer(value);
  const canNext = answered || isOpen(q) || !q.required;
  const lastOfAll = c === chapters.length - 1 && qi === chapter.question_ids.length - 1;
  const total = survey.questions.length;
  const g = globalIndex(c, qi);
  const qId = `sq-${q.id}`;

  function historyUpTo(chapterIdx: number) {
    return chapters.slice(0, chapterIdx).flatMap((ch) => [
      ...(ch.intro_line ? [{ from: "world" as const, text: ch.intro_line }] : []),
      ...ch.question_ids.map((id) => ({ from: "you" as const, text: summarise(id) })),
    ]);
  }
  function summarise(id: string) {
    const a = answers[id];
    const qq = byId.get(id);
    if (!qq || a === undefined || a === null) return "Skipped";
    if (typeof a === "string") return a || "Skipped";
    const labels = qq.type === "nps_0_10" ? Array.from({ length: 11 }, (_, i) => String(i)) : qq.options.length ? qq.options : null;
    if (Array.isArray(a)) return a.map((i) => labels?.[i] ?? String(i + 1)).join(", ");
    return labels?.[a] ?? String(a + 1);
  }

  return (
    <div className={`story mood-${mood} look-${look}`}>
      <Stage chapter={chapter} chapterIndex={c} chapterCount={chapters.length} look={look} mood={mood} reduced={reduced} mode="chapter" history={historyUpTo(c)} hud={
        <div className="story-hud">
          <span className="story-chip story-chip--progress">
            Chapter {c + 1} of {chapters.length} · about {timeLeft(c, qi).replace("about ", "")} left
          </span>
          <span className="story-hud__tools">
            <AmbientSound mood={mood} onOn={() => session.logEvent("story_sound_on")} />
            {plainButton(g)}
          </span>
        </div>
        }>
        <section className="story-card" aria-labelledby={qId} key={q.id}>
          <p className="sr-only" aria-live="polite">
            Question {g + 1} of {total}
          </p>
          <p className="story-card__eyebrow">{chapter.title}</p>
          {qi === 0 && chapter.intro_line && <p className="pl-lead">{chapter.intro_line}</p>}
          <h2 id={qId} ref={headingRef} tabIndex={-1} className="pl-question">
            {q.text}
          </h2>
          {item.helper_text && <p className="pl-helper">{item.helper_text}</p>}
          <PropChoice
            question={q}
            item={item}
            family={storyItem.prop_family}
            look={look}
            Skin={Skin}
            value={value}
            labelledBy={qId}
            onLimit={(max) => setLimitNote(`You can pick up to ${max}. Untick one to swap.`)}
            onChange={(a) => {
              session.answer(q.id, a);
              if (SINGLE.has(item.mechanic)) {
                window.clearTimeout(timer.current);
                timer.current = window.setTimeout(() => nextFrom(c, qi), ADVANCE_MS);
              }
            }}
          />
          {(q.type === "rating_scale" || q.type === "nps_0_10") && (
            <div className="pl-ends" aria-hidden="true">
              <span>{q.scale?.min_label}</span>
              <span>{q.scale?.max_label}</span>
            </div>
          )}
          <p className="pl-feedback" aria-live="polite">
            {limitNote || (answered && level !== "light" ? storyItem.acknowledgement : "")}
          </p>
          <div className="pl-nav">
            <button type="button" className="pl-back" aria-label="Previous question" onClick={() => backFrom(c, qi)}>
              <ArrowLeft size={20} weight="bold" />
            </button>
            <button type="button" className="pl-next" disabled={!canNext} onClick={() => nextFrom(c, qi)}>
              {isOpen(q) && !answered ? (lastOfAll ? "Skip and finish" : "Skip") : lastOfAll ? "Finish" : "Next"}
            </button>
          </div>
        </section>
      </Stage>
    </div>
  );
}
