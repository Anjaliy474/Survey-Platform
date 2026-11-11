"use client";

import { type Role, useMe } from "@/lib/account";
import Link from "next/link";
import type { ComponentType, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, type IconProps, Lightning, ListChecks, MagnifyingGlass } from "@/components/icons";
import { usePrefersReducedMotion } from "@/lib/client-hooks";
import { TopBar } from "../TopBar";
import { PROMPT_EXAMPLES } from "./QuickPrompt";

const WAYS: {
  href: string;
  title: string;
  line: string;
  example: string;
  tone: "teal" | "persimmon" | "marigold";
  Icon: ComponentType<IconProps>;
}[] = [
  {
    href: "/app/new/questions",
    title: "Bring your questions",
    line: "Paste them, or import from Google Forms (soon).",
    example: "How amazing was the new canteen menu?",
    tone: "teal",
    Icon: ListChecks,
  },
  {
    href: "/app/new/research",
    title: "Describe your research",
    line: "Tell us the decision. We’ll suggest what to ask.",
    example: "Should our café open on Sundays?",
    tone: "persimmon",
    Icon: MagnifyingGlass,
  },
  {
    href: "/app/new/prompt",
    title: "Quick prompt",
    line: "One line is enough.",
    example: "Feedback for our college fest",
    tone: "marigold",
    Icon: Lightning,
  },
];

/** A tiny typing loop (DESIGN.md §6.1); the full line shows without JS or with reduced motion. */
function TypingLine({ text, delay }: { text: string; delay: number }) {
  const reduce = usePrefersReducedMotion();
  const [shown, setShown] = useState(text.length);
  useEffect(() => {
    if (reduce) return;
    let i = 0;
    let timer = window.setTimeout(function tick() {
      i = i >= text.length + 18 ? 0 : i + 1; // type, pause on the full line, start again
      setShown(Math.min(i, text.length));
      timer = window.setTimeout(tick, i === 0 ? 400 : 55);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      setShown(text.length);
    };
  }, [reduce, text, delay]);
  return (
    <span className="typing-line" aria-hidden="true">
      {text.slice(0, shown)}
      <i />
    </span>
  );
}

const SUGGEST: Record<Role, string> = {
  business: "/app/new/prompt",
  researcher: "/app/new/research",
  community: "/app/new/prompt",
  analyst: "/app/new/questions",
};

/** S2 "How do you want to start?" (UI_UX_LAYOUT.md). Arrow keys move between the cards. */
export function StartChooser() {
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const me = useMe();
  // From onboarding: the start that suits the creator's role.
  const suggested = me?.role ? SUGGEST[me.role] : null;

  function onKeyDown(e: KeyboardEvent, i: number) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    refs.current[(i + keys[e.key] + WAYS.length) % WAYS.length]?.focus();
  }

  return (
    <>
      <TopBar crumbs={[{ label: "Home", href: "/app" }, { label: "New survey" }]} />
      <main className="page chooser">
        <div className="chooser__head">
          <h1 className="page__title">How do you want to start?</h1>
          <p>Any way works. AI suggests, you decide.</p>
        </div>
        <ul className="chooser__grid">
          {WAYS.map((w, i) => (
            <li key={w.href}>
              <Link
                href={w.href}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                className={`chooser-card chooser-card--${w.tone}`}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <span className="chooser-card__icon" aria-hidden="true">
                  <w.Icon size={26} weight="regular" />
                </span>
                {suggested === w.href && <span className="chooser-card__suggested">Suggested for you</span>}
                <h2>{w.title}</h2>
                <p>{w.line}</p>
                <span className="chooser-card__example">
                  <TypingLine text={w.example} delay={i * 700} />
                </span>
                <span className="chooser-card__go" aria-hidden="true">
                  Start <ArrowRight size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="chooser__examples">
          <p>Not sure? Try a quick prompt:</p>
          <div className="idea-chips">
            {PROMPT_EXAMPLES.map((ex) => (
              <Link key={ex} href={`/app/new/prompt?q=${encodeURIComponent(ex)}`} className="chip">
                {ex}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
