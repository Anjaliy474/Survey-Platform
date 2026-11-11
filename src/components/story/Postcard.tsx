"use client";

import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";
import { POSTCARD_SIZE, drawPostcard, postcardFileName } from "@/lib/story/postcard-canvas";
import { contrastRatio } from "@/lib/survey/contrast";
import type { Look, Mood } from "@/lib/survey/types";

/** The journey postcard: drawn on a canvas from the mood palette, downloadable as PNG. */
export function Postcard({ title, chapters, mood }: { title: string; chapters: string[]; look: Look; mood: Mood }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  // Chapters arrive as a fresh array each render; redraw only when their text changes.
  const chapterKey = chapters.join("");

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const css = getComputedStyle(el);
    const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const top = v("--st-sky-top", "#2b2350");
    const light = v("--story-white", "#ffffff");
    const dark = v("--story-card-text", "#22192e");
    // Light skies (Cosy, Nature) get dark text; dark skies keep white.
    const text = contrastRatio(light, top) >= 3 ? light : dark;
    void document.fonts?.ready.then(() => {
      drawPostcard(ctx, {
        title,
        chapters: chapterKey.split(""),
        colors: {
          top,
          bottom: v("--st-sky-bottom", "#c96f4a"),
          accent: v("--st-accent", "#ffc233"),
          glow: v("--st-glow", "#ffe3a1"),
          text,
        },
      });
      el.toBlob((blob) => blob && setUrl(URL.createObjectURL(blob)), "image/png");
    });
  }, [title, chapterKey, mood]);

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  return (
    <div className="postcard">
      <canvas ref={canvas} width={POSTCARD_SIZE.width} height={POSTCARD_SIZE.height} role="img" aria-label={`Postcard: ${title}, ${chapters.join(", ")}`} />
      {url && (
        <a className="pl-next" href={url} download={postcardFileName(title)} style={{ width: "auto", paddingInline: 20 }}>
          <DownloadSimple size={18} weight="bold" aria-hidden="true" /> Save your postcard
        </a>
      )}
    </div>
  );
}
