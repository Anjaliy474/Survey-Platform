import type Lenis from "lenis";

/**
 * The page's single Lenis instance, shared so other components (the menu sheet) can
 * pause smooth scrolling. Null on the server, with reduced motion, or before mount.
 */
let instance: Lenis | null = null;

export const smoothScroll = {
  get: () => instance,
  set: (lenis: Lenis | null) => {
    instance = lenis;
  },
};

/** Fixed header height plus a small gap, so anchored sections never sit under the header. */
export function anchorOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--ps-header-h");
  return -((parseFloat(raw) || 72) + 8);
}
