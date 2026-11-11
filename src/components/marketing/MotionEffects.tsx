"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { anchorOffset, smoothScroll } from "@/lib/smooth-scroll";

/**
 * Page-wide motion that needs JS, all of it optional:
 * - smooth, inertial scrolling (Lenis), with in-page links glided to their section;
 * - a soft spotlight that follows the pointer across cards;
 * - "magnetic" dark call-to-action pills that lean toward the pointer.
 * Nothing runs with reduced motion; spotlight and magnets only run on a mouse or trackpad.
 * Without JS the page scrolls natively and every link still works.
 */
export function MotionEffects() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cleanups: (() => void)[] = [];

    /* ---------- Smooth scrolling ---------- */
    const lenis = new Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
    smoothScroll.set(lenis);
    cleanups.push(() => {
      lenis.destroy();
      smoothScroll.set(null);
    });

    const onAnchorClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute("href") ?? "";
      if (hash === "#main" || hash.length < 2) return; // the skip link keeps its native jump and focus
      const target = hash === "#top" ? 0 : document.getElementById(hash.slice(1));
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: target === 0 ? 0 : anchorOffset(), duration: 1.25 });
      history.pushState(null, "", hash);
    };
    document.addEventListener("click", onAnchorClick);
    cleanups.push(() => document.removeEventListener("click", onAnchorClick));

    if (fine) {
      /* ---------- Card spotlight ---------- */
      let frame = 0;
      let lit: HTMLElement | null = null;
      const onMove = (e: PointerEvent) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const card = (e.target as Element | null)?.closest<HTMLElement>(".card") ?? null;
          if (lit && lit !== card) lit.classList.remove("is-spot");
          lit = card;
          if (!card) return;
          const r = card.getBoundingClientRect();
          card.style.setProperty("--mx", `${e.clientX - r.left}px`);
          card.style.setProperty("--my", `${e.clientY - r.top}px`);
          card.classList.add("is-spot");
        });
      };
      document.addEventListener("pointermove", onMove, { passive: true });
      cleanups.push(() => {
        document.removeEventListener("pointermove", onMove);
        cancelAnimationFrame(frame);
        lit?.classList.remove("is-spot");
      });

      /* ---------- Magnetic call-to-action pills ---------- */
      const magnets = Array.from(document.querySelectorAll<HTMLElement>(".btn--marketing"));
      for (const el of magnets) {
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
          const y = (e.clientY - (r.top + r.height / 2)) * 0.32;
          el.style.setProperty("--mag-x", `${x.toFixed(1)}px`);
          el.style.setProperty("--mag-y", `${y.toFixed(1)}px`);
        };
        const leave = () => {
          el.style.removeProperty("--mag-x");
          el.style.removeProperty("--mag-y");
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
          leave();
        });
      }
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
