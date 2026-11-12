"use client";

import { useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { PlainPlayer } from "@/components/player/PlainPlayer";
import { Reveal, SendRetry, StateScreen, ThankYou, TitleCard } from "@/components/player/Screens";
import { usePlayerSession, type PlayerSession } from "@/components/player/usePlayerSession";
import { passingShade } from "@/lib/survey/contrast";
import type { PublicSurvey, RevealData } from "@/lib/survey/public";
import { formatAbout, plainSeconds } from "@/lib/survey/timing";

export type StoryPlayerProps = { survey: PublicSurvey; session: PlayerSession; onSwitchPlain: (atStep: number) => void };

/** The story engine loads only for the story arm, so the plain Player stays light. */
const StoryPlayer = dynamic(() => import("@/components/story/StoryPlayer").then((m) => m.StoryPlayer), {
  ssr: false,
  loading: () => <div className="player-state" aria-busy="true" />,
}) as ComponentType<StoryPlayerProps>;

type Phase = "title" | "playing" | "thanks";

export function PlayerApp({ slug, preview, previewArm }: { slug: string; preview?: PublicSurvey; previewArm?: "story" | "plain" }) {
  const session = usePlayerSession(slug, preview, previewArm);
  const [phase, setPhase] = useState<Phase>("title");
  const [plainFrom, setPlainFrom] = useState<number | null>(null);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [unsent, setUnsent] = useState(false);
  const { state, survey, response } = session;

  if (state === "loading") return <main className="player theme-marigold" aria-busy="true" />;
  if (state === "not_found") return <StateScreen title="This survey isn't available" body="It may have closed, or the link is wrong. Thanks for stopping by." />;
  if (state === "error" || !survey || !response) return <StateScreen title="Something went wrong" body="We couldn't load this survey. Check your connection and try again." />;
  if (state === "already") return <StateScreen title="You've already answered this one. Thanks!" body="Your answers are saved." />;

  const story = response.arm === "story" && !response.switchedToPlain && survey.storyAllowed && survey.world;
  const brand = survey.picks.brandColor ? passingShade(survey.picks.brandColor, "#fffbf5") : null;
  const style = brand ? ({ "--theme-button": brand, "--theme-accent": brand } as React.CSSProperties) : undefined;

  async function finish() {
    setPhase("thanks");
    const result = await session.complete(null);
    setUnsent(!result.ok);
    if (result.ok) setReveal(result.reveal);
  }

  if (story && plainFrom === null) {
    return (
      <main className={`player theme-marigold story-root`} style={style}>
        <StoryPlayer
          survey={survey}
          session={session}
          onSwitchPlain={(at) => {
            session.switchToPlain();
            setPlainFrom(at);
            setPhase("playing");
          }}
        />
      </main>
    );
  }

  const g = survey.gamifier;
  return (
    <main className="player theme-marigold" style={style}>
      {phase === "title" && (
        <TitleCard
          title={g.intro.title}
          purposeLine={survey.purposeLine}
          consentLine={survey.consentLine}
          meta={`${survey.questions.length} questions · ${formatAbout(plainSeconds(survey.questions))}`}
          startLabel={g.intro.start_button || "Start"}
          logo={survey.picks.logoDataUrl}
          onStart={() => setPhase("playing")}
        />
      )}
      {phase === "playing" && <PlainPlayer survey={survey} session={session} startAt={plainFrom ?? 0} onDone={finish} />}
      {phase === "thanks" && (
        <div className="player__col">
          <div />
          <ThankYou thankYou={g.closing.thank_you} prompt={g.closing.enjoyment_prompt} onEnjoyment={(i) => void session.complete(i)}>
            {unsent ? <SendRetry onRetry={() => void finish()} /> : <Reveal data={reveal} teaser={g.closing.reveal_teaser} />}
          </ThankYou>
          <div />
        </div>
      )}
    </main>
  );
}
