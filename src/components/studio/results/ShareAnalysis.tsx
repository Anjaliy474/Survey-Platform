"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { type Snapshot, encodeSnapshot, shareUrl } from "@/lib/results/snapshot";

/**
 * "Share analysis": a read-only link to this survey's scores, insights and charts. The analysis
 * travels inside the link, so it opens on any device. Answers and comments are never included.
 */
export function ShareAnalysis({ open, onClose, snapshot }: { open: boolean; onClose: () => void; snapshot: Snapshot | null }) {
  const toast = useToast();
  const [link, setLink] = useState<{ for: Snapshot; url: string } | null>(null);
  const url = link && link.for === snapshot ? link.url : "";

  useEffect(() => {
    if (!open || !snapshot) return;
    let alive = true;
    encodeSnapshot(snapshot).then((code) => {
      if (alive) setLink({ for: snapshot, url: shareUrl(window.location.origin, code) });
    });
    return () => {
      alive = false;
    };
  }, [open, snapshot]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: "Link copied. Anyone with it can see this analysis." });
    } catch {
      toast({ message: "Couldn’t copy. Select the link and copy it yourself." });
    }
  }
  async function shareNative() {
    try {
      await navigator.share({ title: `${snapshot?.title ?? "Survey"}: analysis`, url });
    } catch {
      /* cancelled */
    }
  }
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <Drawer open={open} title="Share this analysis" onClose={onClose}>
      <div className="share-an">
        <p>Anyone with the link sees a read-only copy: the scores, key insights and charts, as they are right now.</p>
        <p className="share-an__safe">Individual responses, written comments and personal details are never included.</p>
        <label className="field__label" htmlFor="share-an-link">
          Link
        </label>
        <input id="share-an-link" className="input share-an__link" readOnly value={url || "Making the link…"} onFocus={(e) => e.currentTarget.select()} />
        <div className="share-an__btns">
          <button type="button" className="btn btn--md btn--primary" onClick={copy} disabled={!url}>
            Copy link
          </button>
          {canShare && (
            <button type="button" className="btn btn--md btn--secondary" onClick={shareNative} disabled={!url}>
              Share…
            </button>
          )}
          <a className={`btn btn--md btn--ghost${url ? "" : " is-disabled"}`} href={url || undefined} target="_blank" rel="noopener" aria-disabled={!url}>
            Open it
          </a>
        </div>
        <p className="field__help">The shared page has a Print button to save it as a PDF. New answers won’t show in a link you already sent; share a new one.</p>
      </div>
    </Drawer>
  );
}
