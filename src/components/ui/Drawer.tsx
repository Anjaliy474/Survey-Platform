"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { X } from "@/components/icons";

/**
 * Drawer (DESIGN.md §5.6): 440px from the right on desktop, a full sheet on phones. Built on the
 * native <dialog>, so focus is trapped and Esc closes it.
 */
export function Drawer({ open, title, onClose, children, side = "right" }: { open: boolean; title: string; onClose: () => void; children: ReactNode; side?: "right" | "bottom" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`drawer drawer--${side}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="drawer__box">
        <div className="drawer__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
            <X size={20} weight="regular" />
          </button>
        </div>
        <div className="drawer__body">{children}</div>
      </div>
    </dialog>
  );
}
