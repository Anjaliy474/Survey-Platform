"use client";

import { useEffect } from "react";

/**
 * Sections build up as you scroll (DESIGN.md §1.1), without ever hiding content first:
 * everything renders visible on the server and without JS. Only once this runs are
 * below-the-fold elements tucked away, then revealed as they enter the viewport.
 */
export function ScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const viewport = window.innerHeight;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < viewport * 0.92 && r.bottom > 0) el.classList.add("is-in", "is-instant");
    }
    document.documentElement.classList.add("reveal-ready");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    els.forEach((el) => {
      if (!el.classList.contains("is-in")) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}
