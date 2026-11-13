"use client";

import { LocalSurvey } from "@/components/player/LocalSurvey";
import { usePublished } from "@/lib/player/published-store";
import { PlayerApp } from "./PlayerApp";

/**
 * A slug that isn't a built-in sample: a survey published from the /app Studio in this browser,
 * or else a Story Mode survey from the /studio Studio's store (PlayerApp fetches it, and shows
 * its own "not available" screen when there's no such survey).
 */
export function SurveyBySlug({ slug }: { slug: string }) {
  const local = usePublished(slug);
  if (local === undefined) {
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
  return local ? <LocalSurvey slug={slug} /> : <PlayerApp slug={slug} />;
}
