"use client";

import { useMemo } from "react";
import { useNowMinute } from "@/lib/client-hooks";
import { useProgress } from "@/lib/player/progress-store";
import { aggregatesFrom } from "@/lib/player/reveal";
import { checkSurvey } from "@/lib/player/rules";
import { usePublished, useResponses } from "@/lib/player/published-store";
import { Player } from "./Player";
import { PlayerMessage } from "./PlayerMessage";

/**
 * A survey published from the Studio on this device (until the backend exists). Same states as
 * the server-rendered samples: not found, closed (by hand, by date or by count), not ready.
 */
export function LocalSurvey({ slug }: { slug: string }) {
  const survey = usePublished(slug);
  const responses = useResponses(slug);
  const now = useNowMinute();
  const { progress } = useProgress(slug);
  // The reveal counts what this browser has collected (the respondent's own answer is added on top).
  const withCounts = useMemo(
    () => (survey ? { ...survey, aggregates: aggregatesFrom(survey, responses, progress.responseId) } : survey),
    [survey, responses, progress.responseId],
  );

  if (survey === undefined) {
    return (
      <div className="player theme-marigold" aria-busy="true">
        <main className="player__main pl-message">
          <span className="sr-only">Loading the survey…</span>
          <span className="skeleton" style={{ width: "70%", height: 36 }} />
          <span className="skeleton" style={{ width: "100%", height: 20 }} />
        </main>
      </div>
    );
  }
  if (survey === null) {
    return (
      <PlayerMessage
        title="We couldn’t find this survey."
        body="The link may be mistyped, or the survey was removed. Surveys made in this prototype open only in the browser that published them."
      />
    );
  }

  const s = survey.settings;
  const closedByDate = !!s?.closeAt && now > 0 && now >= s.closeAt;
  const closedByCount = !!s?.closeAfter && responses.length >= s.closeAfter;
  // Someone who has just answered keeps their thank-you screen, even if their answer was the last one.
  const answered = progress.status === "submitted";
  if (survey.status === "closed" || (!answered && (closedByDate || closedByCount))) {
    return (
      <PlayerMessage
        theme={survey.theme}
        symbol="✓"
        title="This survey has closed."
        body={`Thanks for stopping by. ${survey.creator.name} is no longer collecting answers.`}
      />
    );
  }

  const problems = checkSurvey(survey);
  if (problems.length > 0) {
    return (
      <PlayerMessage
        theme={survey.theme}
        title="This survey isn’t ready yet."
        body="Please check back later."
        details={process.env.NODE_ENV === "development" ? problems : undefined}
      />
    );
  }
  return <Player survey={withCounts ?? survey} />;
}
