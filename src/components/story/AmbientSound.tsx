"use client";

import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";
import { startAmbient } from "@/lib/story/ambient";
import type { Mood } from "@/lib/survey/types";

/** Optional ambient sound, off by default. Sound only ever starts from this button. */
export function AmbientSound({ mood, onOn }: { mood: Mood; onOn?: () => void }) {
  const [on, setOn] = useState(false);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => () => stop.current?.(), []);
  useEffect(() => {
    if (!on) return;
    stop.current = startAmbient(mood);
    return () => {
      stop.current?.();
      stop.current = null;
    };
  }, [on, mood]);

  return (
    <button
      type="button"
      className="story-chip"
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      onClick={() => {
        setOn((v) => {
          if (!v) onOn?.();
          return !v;
        });
      }}
    >
      {on ? <SpeakerHigh size={16} weight="bold" aria-hidden="true" /> : <SpeakerSlash size={16} weight="bold" aria-hidden="true" />}
    </button>
  );
}
