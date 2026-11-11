"use client";

import { ChatCircleDots } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";
import { SceneFrame } from "../../SceneFrame";
import type { EndingProps, SkinProps, StageProps, StoryTemplate } from "../../template-api";
import { Sticker } from "./stickers";

const TYPING_MS = 300;

/** Soft bubble pattern behind the thread. */
function Backdrop() {
  return (
    <g opacity="0.35">
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} className="drift" style={{ animationDelay: `${-i * 1.4}s` }} x={(i * 71) % 360} y={(i * 97) % 640} width={60 + (i % 3) * 20} height="28" rx="14" fill="var(--st-glow)" />
      ))}
    </g>
  );
}

/** Short typing dots before the newest message (300 ms at most), skipped with reduced motion. */
function useTyping(key: string, reduced: boolean) {
  const [doneKey, setDoneKey] = useState("");
  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => setDoneKey(key), TYPING_MS);
    return () => window.clearTimeout(t);
  }, [key, reduced]);
  return !reduced && doneKey !== key;
}

function Stage({ chapter, mood, reduced, mode, history, hud, children }: StageProps) {
  const typing = useTyping(`${chapter.chapter_id}:${mode}`, reduced);
  const shown = history.slice(-6);
  return (
    <SceneFrame
      sceneKey="chat"
      art={<Backdrop />}
      mood={mood}
      reduced={reduced}
      top={
        <>
          {hud}
          <span className="chat-head">
            <ChatCircleDots size={18} weight="duotone" aria-hidden="true" /> {chapter.title}
          </span>
        </>
      }
    >
      <div className="chat-thread" aria-label="Earlier messages">
        {shown.map((m, i) => (
          <p key={i} className={`chat-bubble ${m.from === "you" ? "chat-bubble--you" : ""}`}>
            {m.text}
          </p>
        ))}
        <Sticker id={chapter.scene_id} />
        {typing ? (
          <span className="chat-typing" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : (
          mode === "chapter" && chapter.intro_line && <p className="chat-bubble">{chapter.intro_line}</p>
        )}
      </div>
      {!typing && children}
    </SceneFrame>
  );
}

function Ending({ mood, reduced, children }: EndingProps) {
  return (
    <SceneFrame sceneKey="chat_end" art={<Backdrop />} mood={mood} reduced={reduced}>
      <div className="chat-thread">
        <Sticker id="chat_end" />
      </div>
      {children}
    </SceneFrame>
  );
}

/** Reply chips: the label is the whole object, drawn by PropChoice. */
function Skin(_props: SkinProps) {
  return null;
}

function Thumb({ sceneId }: { sceneId: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", background: "linear-gradient(180deg, var(--st-sky-top), var(--st-sky-bottom))" }}>
      <Sticker id={sceneId} />
    </div>
  );
}

export const chatStory: StoryTemplate = { id: "chat_story", Stage, Ending, Skin, Thumb };
