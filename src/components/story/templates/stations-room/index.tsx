"use client";

import { SceneFrame } from "../../SceneFrame";
import type { EndingProps, StageProps, StoryTemplate } from "../../template-api";
import { ClosingTime, STATION_SCENES } from "./scenes";
import { StationSkin } from "./skins";

/** Stations as a row of lamps: done, here, next (glowing faintly), later. */
function Stations({ index, count }: { index: number; count: number }) {
  return (
    <div className="trail" role="img" aria-label={`Station ${index + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 && <span className={`trail__line ${i <= index ? "is-done" : ""}`} />}
          <span
            className={`trail__stop ${i < index ? "is-done" : ""} ${i === index ? "is-here" : ""}`}
            style={i === index + 1 ? { background: "color-mix(in srgb, var(--st-accent) 45%, transparent)" } : undefined}
          />
        </span>
      ))}
    </div>
  );
}

function Stage({ chapter, chapterIndex, chapterCount, mood, reduced, hud, children }: StageProps) {
  const Art = STATION_SCENES[chapter.scene_id] ?? STATION_SCENES.counter;
  return (
    <SceneFrame sceneKey={chapter.scene_id} art={<Art />} mood={mood} reduced={reduced} top={<>{hud}<Stations index={chapterIndex} count={chapterCount} /></>}>
      {children}
    </SceneFrame>
  );
}

function Ending({ mood, reduced, children }: EndingProps) {
  return (
    <SceneFrame sceneKey="closing_time" art={<ClosingTime reduced={reduced} />} mood={mood} reduced={reduced}>
      {children}
    </SceneFrame>
  );
}

function Thumb({ sceneId }: { sceneId: string }) {
  const Art = STATION_SCENES[sceneId];
  return (
    <svg viewBox="0 0 400 420" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">
      {Art ? <Art /> : <ClosingTime reduced />}
    </svg>
  );
}

export const stationsRoom: StoryTemplate = { id: "stations_room", Stage, Ending, Skin: StationSkin, Thumb };
