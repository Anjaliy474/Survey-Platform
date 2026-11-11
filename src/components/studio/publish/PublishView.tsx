"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, ArrowUpRight, ChartBar, Check, Code, Copy, LockSimple, WhatsappLogo, X } from "@/components/icons";
import { Burst } from "@/components/player/Celebration";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { usePrefersReducedMotion } from "@/lib/client-hooks";
import { publishLocal, useResponses } from "@/lib/player/published-store";
import { getSurvey } from "@/lib/player/samples";
import { DEFAULT_PUBLISH, buildPublished, makeSlug, publishChecklist, readyToPublish, settingsProblem } from "@/lib/studio/publish";
import { surveyHref } from "@/lib/studio/sections";
import { studio, useStudio } from "@/lib/studio/store";
import type { PublishSettings, StudioSurvey } from "@/lib/studio/types";
import { DEMO_USER } from "@/lib/studio/user";
import { ResultsTabs } from "../ResultsTabs";
import { StepRail } from "../StepRail";
import { TopBar } from "../TopBar";
import { QrCard } from "./QrCard";

const noop = () => () => {};
const useOrigin = () => useSyncExternalStore(noop, () => window.location.origin, () => "");
const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const useToday = () => useSyncExternalStore(noop, todayString, () => "");

const CLOSE_OPTIONS: { value: PublishSettings["close"]; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "date", label: "On a date" },
  { value: "count", label: "After N responses" },
];

/**
 * S6 Publish and share (UI_UX_LAYOUT.md). Before: a checklist in code, the settings and one
 * Publish button. After: the same page becomes the share sheet, with one celebration.
 */
export function PublishView({ survey }: { survey: StudioSurvey }) {
  const toast = useToast();
  const state = useStudio();
  const today = useToday();
  const origin = useOrigin();
  const reduce = usePrefersReducedMotion();
  const [justPublished, setJustPublished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const responses = useResponses(survey.slug);

  const form = survey.publish ?? DEFAULT_PUBLISH;
  const setForm = (patch: Partial<PublishSettings>) => studio.patch(survey.id, (s) => ({ publish: { ...(s.publish ?? DEFAULT_PUBLISH), ...patch } }));
  const published = survey.status !== "draft";

  useEffect(() => {
    if (justPublished) heading.current?.focus();
  }, [justPublished]);

  /* ---------------- before publishing ---------------- */
  if (!published) {
    const rows = publishChecklist(survey);
    const failing = rows.filter((r) => !r.ok).length;
    const problem = today ? settingsProblem(form, today) : null;
    const ready = readyToPublish(survey) && !problem;
    const reason = failing ? `Fix ${failing} ${failing === 1 ? "item" : "items"} in the checklist first.` : (problem ?? undefined);

    const publish = () => {
      if (!ready || state?.status !== "ready") return;
      const taken = new Set(state.surveys.map((s) => s.slug).filter((s): s is string => !!s));
      const slug = makeSlug(survey.title, taken);
      const player = buildPublished(survey, slug, DEMO_USER.name, form);
      publishLocal(player);
      studio.patch(survey.id, () => ({
        status: "live",
        slug,
        step: "publish",
        player,
        publishedAt: Date.now(),
        stats: { started: 0, finished: 0, lastSevenDays: [0, 0, 0, 0, 0, 0, 0] },
        questions: player.questions.map((q) => ({ open: q.type === "long_text" || q.type === "short_text" })),
      }));
      setJustPublished(true);
      window.scrollTo({ top: 0 });
    };

    return (
      <>
        <TopBar
          crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
          status="draft"
          saved
          primary={{ label: "Publish", onClick: publish, disabledReason: ready ? undefined : reason }}
        />
        <StepRail surveyId={survey.id} reached={survey.step} current="publish" />
        <main className="publish">
          <h1 className="publish__title">Ready to publish?</h1>
          <p className="publish__lede">One last check. Once it’s live, anyone with the link can answer, and nothing about the questions can change.</p>

          <section className="publish__card" aria-labelledby="pub-check">
            <div className="publish__cardhead">
              <h2 id="pub-check">Checklist</h2>
              <span className={`publish__score ${failing ? "is-bad" : "is-ok"}`}>
                {rows.length - failing} of {rows.length} pass
              </span>
            </div>
            <ul className="checklist">
              {rows.map((r) => (
                <li key={r.key} className={`checklist__row ${r.ok ? "is-ok" : "is-bad"}`}>
                  <span className="checklist__mark" aria-hidden="true">
                    {r.ok ? <Check size={14} weight="bold" /> : <X size={14} weight="bold" />}
                  </span>
                  <span className="checklist__text">
                    <strong>
                      {r.label}
                      <span className="sr-only">{r.ok ? ": passes" : ": needs fixing"}</span>
                    </strong>
                    <span>{r.detail}</span>
                  </span>
                  {!r.ok && (
                    <Link href={surveyHref(survey.id, r.fix)} className="link checklist__fix" aria-label={`Fix: ${r.label}`}>
                      Fix
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="publish__card" aria-labelledby="pub-settings">
            <h2 id="pub-settings">Settings</h2>
            <div className="field">
              <span className="field__label" id="close-label">
                Close the survey
              </span>
              <div className="segmented" role="group" aria-labelledby="close-label">
                {CLOSE_OPTIONS.map((o) => (
                  <button key={o.value} type="button" aria-pressed={form.close === o.value} onClick={() => setForm({ close: o.value })}>
                    {o.label}
                  </button>
                ))}
              </div>
              {form.close === "date" && (
                <label className="publish__sub">
                  <span>Closes at the end of</span>
                  <input
                    type="date"
                    className="input"
                    min={today}
                    value={form.closeDate}
                    onChange={(e) => setForm({ closeDate: e.target.value })}
                    aria-invalid={problem ? true : undefined}
                  />
                </label>
              )}
              {form.close === "count" && (
                <label className="publish__sub">
                  <span>Closes after</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    className="input publish__count"
                    min={1}
                    max={100000}
                    value={Number.isFinite(form.closeAfter) ? form.closeAfter : ""}
                    onChange={(e) => setForm({ closeAfter: e.target.valueAsNumber })}
                    aria-invalid={problem ? true : undefined}
                  />
                  <span>responses</span>
                </label>
              )}
              {problem && (
                <p className="field__error" role="alert">
                  {problem}
                </p>
              )}
              {form.close === "count" && form.closeAfter < 20 && !problem && (
                <p className="field__help">Fewer than 20 responses means respondents never see the results reveal.</p>
              )}
            </div>

            <div className="field field--switch">
              <button
                type="button"
                role="switch"
                aria-checked={form.onePerPerson}
                aria-labelledby="one-label"
                aria-describedby="one-help"
                className="switch"
                onClick={() => setForm({ onePerPerson: !form.onePerPerson })}
              >
                <i aria-hidden="true" />
              </button>
              <div>
                <span className="field__label" id="one-label">
                  One response per person
                </span>
                <p className="field__help" id="one-help">
                  Each phone or browser can answer once. Turn off for a shared tablet at an event.
                </p>
              </div>
            </div>

            <div className="field">
              <span className="field__label" id="lang-label">
                Response language
              </span>
              <div className="chips" role="group" aria-labelledby="lang-label">
                <button type="button" className="chip" aria-pressed="true">
                  English
                </button>
                <button type="button" className="chip" disabled aria-describedby="lang-later">
                  हिन्दी Hindi
                </button>
              </div>
              <p className="field__help" id="lang-later">
                Hindi is coming later.
              </p>
            </div>
          </section>

          <div className="publish__cta">
            <button type="button" className="btn btn--lg btn--primary" onClick={publish} disabled={!ready}>
              Publish
            </button>
            {!ready && reason && <p className="field__help">{reason}</p>}
          </div>
        </main>
      </>
    );
  }

  /* ---------------- after publishing: the share sheet ---------------- */
  const slug = survey.slug ?? "";
  const link = origin && slug ? `${origin}/s/${slug}` : "";
  const intro = survey.player?.gamified.intro.title ?? getSurvey(slug)?.gamified.intro.title ?? "";
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${intro ? `${intro} ` : ""}${survey.title}\n${link}`)}`;
  const embed = `<iframe src="${link}" title="${survey.title.replace(/"/g, "&quot;")}" width="100%" height="680" style="border:0;border-radius:16px" loading="lazy"></iframe>`;
  const live = survey.status === "live";
  const count = Math.max(survey.stats?.finished ?? 0, responses.length);

  async function copy(text: string, field: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ message });
    } catch {
      const el = document.getElementById(field) as HTMLInputElement | HTMLTextAreaElement | null;
      el?.focus();
      el?.select();
      toast({ message: "Selected. Press Ctrl+C (or ⌘C) to copy." });
    }
  }

  return (
    <>
      <TopBar
        crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
        status={survey.status}
        secondary={[{ label: "View survey", href: `/s/${slug}`, external: true, Icon: ArrowUpRight }]}
        primary={{ label: "Results", href: surveyHref(survey.id, "results"), Icon: ChartBar }}
      />
      <ResultsTabs surveyId={survey.id} current="publish" hasResponses={count > 0} />
      <main className="publish">
        <div className="publish__hero">
          {justPublished && !reduce && <Burst />}
          <h1 ref={heading} tabIndex={-1} className="publish__title">
            {justPublished ? "It’s live!" : live ? "Share your survey" : "This survey is closed"}
          </h1>
          <Badge kind={survey.status === "closed" ? "closed" : "live"} />
          <p className="publish__lede">
            {live
              ? justPublished
                ? "Send the link to the people you want to hear from. Answers show up in Results as they arrive."
                : `${count} ${count === 1 ? "response" : "responses"} so far. Share the link again to reach more people.`
              : "No new answers are collected. Reopen it to collect more."}
          </p>
          {!live && (
            <button type="button" className="btn btn--md btn--secondary" onClick={() => studio.reopen(survey.id)}>
              Reopen survey
            </button>
          )}
        </div>

        <section className={`publish__card share ${live ? "" : "is-muted"}`} aria-labelledby="share-title">
          <h2 id="share-title">Share</h2>
          {live && link ? (
            <a className="btn btn--lg share__wa" href={whatsapp} target="_blank" rel="noopener noreferrer">
              <WhatsappLogo size={22} weight="fill" aria-hidden="true" /> Share on WhatsApp
            </a>
          ) : (
            <button type="button" className="btn btn--lg share__wa" disabled>
              <WhatsappLogo size={22} weight="fill" aria-hidden="true" /> Share on WhatsApp
            </button>
          )}
          <div className="field">
            <label className="field__label" htmlFor="share-link">
              Survey link
            </label>
            <div className="share__row">
              <input id="share-link" className="input share__input" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="btn btn--md btn--primary" onClick={() => copy(link, "share-link", "Copied. Paste it into WhatsApp, email or a post.")}>
                <Copy size={18} weight="regular" aria-hidden="true" /> Copy
              </button>
            </div>
          </div>
          {link && <QrCard url={link} fileName={`playsurvey-${slug}-qr.png`} />}
          <details className="embed">
            <summary>
              <Code size={18} weight="regular" aria-hidden="true" /> Embed on a website
            </summary>
            <textarea id="embed-code" className="textarea embed__code" readOnly rows={4} value={embed} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="btn btn--sm btn--secondary" onClick={() => copy(embed, "embed-code", "Embed code copied.")}>
              Copy code
            </button>
          </details>
        </section>

        <section className="publish__card next-card" aria-labelledby="next-title">
          <h2 id="next-title">What happens next</h2>
          <p>Results appear as answers come in. Themes update automatically from the open answers.</p>
          <p className="field__help">
            <LockSimple size={14} weight="bold" aria-hidden="true" /> Respondents see group results only after 20 people have answered.
          </p>
          <Link href={surveyHref(survey.id, "results")} className="btn btn--md btn--secondary">
            Go to results <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>
        </section>
      </main>
    </>
  );
}
