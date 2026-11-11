"use client";

import { SceneFrame } from "../../SceneFrame";
import type { EndingProps, StageProps, StoryTemplate } from "../../template-api";
import { JOURNEY_SCENES, LanternRelease } from "./scenes";
import { JourneySkin } from "./skins";

function Trail({ index, count }: { index: number; count: number }) {
  return (
    <div className="trail" role="img" aria-label={`Stop ${index + 1} of ${count} on the trail`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 && <span className={`trail__line ${i <= index ? "is-done" : ""}`} />}
          <span className={`trail__stop ${i < index ? "is-done" : ""} ${i === index ? "is-here" : ""}`} />
        </span>
      ))}
    </div>
  );
}

function Stage({ chapter, chapterIndex, chapterCount, mood, reduced, hud, children }: StageProps) {
  const Art = JOURNEY_SCENES[chapter.scene_id] ?? JOURNEY_SCENES.gate;
  return (
    <SceneFrame sceneKey={chapter.scene_id} art={<Art />} mood={mood} reduced={reduced} top={<>{hud}<Trail index={chapterIndex} count={chapterCount} /></>}>
      {children}
    </SceneFrame>
  );
}

function Ending({ mood, reduced, children }: EndingProps) {
  return (
    <SceneFrame sceneKey="lantern_release" art={<LanternRelease reduced={reduced} />} mood={mood} reduced={reduced}>
      {children}
    </SceneFrame>
  );
}

function Thumb({ sceneId }: { sceneId: string }) {
  const Art = JOURNEY_SCENES[sceneId];
  return (
    <svg viewBox="0 0 400 420" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id={`thumb-sky-${sceneId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--st-sky-top)" />
          <stop offset="1" stopColor="var(--st-sky-bottom)" />
        </linearGradient>
      </defs>
      <rect width="400" height="700" fill={`url(#thumb-sky-${sceneId})`} />
      {Art ? <Art /> : <LanternRelease reduced />}
    </svg>
  );
}

export const journeyMap: StoryTemplate = { id: "journey_map", Stage, Ending, Skin: JourneySkin, Thumb };
