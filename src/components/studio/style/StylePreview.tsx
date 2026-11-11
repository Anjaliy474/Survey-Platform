"use client";

import { useMemo } from "react";
import { ArrowLeft, ArrowRight } from "@/components/icons";
import { Player } from "@/components/player/Player";
import { useProgress } from "@/lib/player/progress-store";
import { buildScreens } from "@/lib/player/rules";
import type { PlayerSurvey } from "@/lib/player/types";

type Tab = "welcome" | "question" | "thanks";
const TABS: { value: Tab; label: string }[] = [
  { value: "welcome", label: "Welcome" },
  { value: "question", label: "Question" },
  { value: "thanks", label: "Thank-you" },
];

/**
 * The live preview on the Style page (UI_UX_LAYOUT.md S5): the real Player in a phone (or
 * desktop) frame. The tabs and arrows drive the same progress the Player uses, so tapping
 * inside the preview and using the controls stay in step.
 */
export function StylePreview({ survey, frame = "phone" }: { survey: PlayerSurvey; frame?: "phone" | "desktop" | "sheet" }) {
  const { progress, store } = useProgress(survey.slug);
  const screens = useMemo(() => buildScreens(survey, survey.gamified.style), [survey]);
  const tab: Tab = progress.status === "new" ? "welcome" : progress.status === "answering" ? "question" : "thanks";
  const index = Math.min(progress.screen, screens.length - 1);
  const style = survey.gamified.style;

  const show = (t: Tab) =>
    store.update((p) => ({
      ...p,
      status: t === "welcome" ? "new" : t === "question" ? "answering" : "submitted",
      screen: Math.min(p.screen, screens.length - 1),
      startedAt: p.startedAt ?? Date.now(),
    }));
  const step = (delta: number) =>
    store.update((p) => ({ ...p, status: "answering", screen: Math.max(0, Math.min(screens.length - 1, index + delta)) }));

  const where =
    tab === "welcome"
      ? "Welcome screen"
      : tab === "thanks"
        ? "Thank-you screen"
        : style === "classic"
          ? `All ${survey.questions.length} questions`
          : style === "pages"
            ? `Page ${index + 1} of ${screens.length}`
            : `Q${index + 1} of ${screens.length}`;

  return (
    <div className={`style-preview style-preview--${frame}`}>
      <div className="segmented style-preview__tabs" role="group" aria-label="Preview screen">
        {TABS.map((t) => (
          <button key={t.value} type="button" aria-pressed={tab === t.value} onClick={() => show(t.value)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className={frame === "desktop" ? "desktop-frame" : "phone-frame phone-frame--inline"}>
        {frame === "desktop" && (
          <div className="desktop-frame__bar" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        )}
        <div className="phone-frame__screen" data-preview-scroll>
          <Player survey={survey} preview />
        </div>
      </div>
      <div className="style-preview__nav">
        <button type="button" className="icon-btn" aria-label="Previous question" disabled={tab !== "question" || index === 0 || style === "classic"} onClick={() => step(-1)}>
          <ArrowLeft size={18} weight="bold" />
        </button>
        <span aria-live="polite">{where}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Next question"
          disabled={style === "classic" || (tab === "question" && index >= screens.length - 1) || tab === "thanks"}
          onClick={() => (tab === "question" ? step(1) : show("question"))}
        >
          <ArrowRight size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
}
