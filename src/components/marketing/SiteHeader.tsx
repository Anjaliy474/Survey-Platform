"use client";

import { List, X } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Logo } from "./Logo";

export const NAV_LINKS = [
  { label: "What you get", href: "#creator" },
  { label: "How it works", href: "#ways" },
  { label: "Styles", href: "#vibe" },
  { label: "Who it's for", href: "#who" },
  { label: "FAQ", href: "#faq" },
] as const;

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function SiteHeader() {
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 8,
    () => false,
  );
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Menu sheet: lock page scroll, focus the first link, close on Escape.
  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    document.body.style.overflow = "hidden";
    sheetRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      toggle?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`site-header ${scrolled || open ? "is-scrolled" : ""}`}>
      <div className="wrap site-header__inner">
        <Logo onClick={close} />
        <nav className="site-nav" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="site-header__actions">
          <Link className="btn btn--md btn--marketing site-header__cta" href="/signup" prefetch={false}>
            Create a survey, free
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="menu-sheet"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="menu-sheet"
          ref={sheetRef}
          className="menu-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <nav aria-label="Main">
            {NAV_LINKS.map((l, i) => (
              <a key={l.href} href={l.href} onClick={close} style={{ animationDelay: `${i * 40}ms` }}>
                {l.label}
              </a>
            ))}
          </nav>
          <Link className="btn btn--lg btn--marketing" href="/signup" prefetch={false} onClick={close}>
            Create a survey, free
          </Link>
        </div>
      )}
    </header>
  );
}
