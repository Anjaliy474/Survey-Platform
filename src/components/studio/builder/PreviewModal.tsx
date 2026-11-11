"use client";

import { useEffect, useRef } from "react";
import { X } from "@/components/icons";
import { Player } from "@/components/player/Player";
import { getProgressStore } from "@/lib/player/progress-store";
import type { PlayerSurvey } from "@/lib/player/types";

/** Preview: the real Player, in a phone frame, with progress reset each time it opens. */
export function PreviewModal({ open, survey, onClose }: { open: boolean; survey: PlayerSurvey; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      getProgressStore(survey.slug).reset();
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, survey.slug]);

  return (
    <dialog
      ref={ref}
      className="modal modal--phone"
      aria-label="Survey preview"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="phone-frame">
        <button type="button" className="phone-frame__close" aria-label="Close preview" onClick={onClose}>
          <X size={18} weight="bold" />
        </button>
        <div className="phone-frame__screen">{open && <Player survey={survey} />}</div>
      </div>
    </dialog>
  );
}
