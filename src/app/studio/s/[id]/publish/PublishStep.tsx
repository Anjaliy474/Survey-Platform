"use client";

import { CheckCircle, Copy, DownloadSimple, WhatsappLogo, XCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { StoryStepRail } from "@/components/studio/StoryStepRail";
import { studioApi, surveyName, surveyStep } from "@/components/studio/api";
import { validateWorld } from "@/lib/story/validate-world";
import { storyAllowed } from "@/lib/survey/public";
import type { Survey } from "@/lib/survey/types";

/** S6 Publish: checklist, the story-vs-plain split, then the share sheet. */
export function PublishStep({ id }: { id: string }) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [split, setSplit] = useState(true);
  const [plainOnly, setPlainOnly] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [qr, setQr] = useState("");

  useEffect(() => {
    void studioApi.get(id).then((r) => (r.ok ? setSurvey(r.data.survey) : setError(r.error)));
  }, [id]);

  const url = survey ? `${typeof window === "undefined" ? "" : window.location.origin}/s/${survey.slug}` : "";
  useEffect(() => {
    if (survey?.status === "live" && url) void QRCode.toDataURL(url, { width: 400, margin: 1 }).then(setQr);
  }, [survey?.status, url]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (error && !survey) return <p className="banner banner--danger">{error}</p>;
  if (!survey) return <p className="muted">Loading…</p>;

  const story = storyAllowed(survey) && !plainOnly;
  const failures =
    story && survey.world && survey.gamifier
      ? validateWorld(survey.world, {
          questions: survey.questionSet!.questions,
          gamifier: survey.gamifier,
          level: survey.picks.level,
          timeLimitSec: survey.picks.timeLimitSec,
        })
      : [];
  const checks = [
    { label: "Questions reviewed and accepted", ok: survey.questionsApproved, fix: "questions" },
    ...(story
      ? [
          { label: "Story world accepted", ok: survey.worldAccepted, fix: "story" },
          { label: "Every integrity check passes", ok: failures.length === 0, fix: "story" },
        ]
      : []),
    { label: "Purpose line shown first", ok: Boolean(survey.questionSet?.purpose_line.trim()), fix: "questions" },
  ];
  const ready = checks.every((c) => c.ok);
  const live = survey.status === "live";
  const title = surveyName(survey);

  async function publish() {
    setBusy(true);
    setError("");
    const r = await studioApi.publish(id, split, plainOnly);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setSurvey(r.data.survey);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setToast("Copied");
    } catch {
      (document.getElementById("share-url") as HTMLInputElement | null)?.select();
      setToast("Select the link and copy it");
    }
  }

  return (
    <>
      <StoryStepRail surveyId={id} current="publish" reached={surveyStep(survey, !storyAllowed(survey))} storyBlocked={!storyAllowed(survey)} />
      {!live ? (
        <>
          <h1>Ready to publish?</h1>
          <section className="s-card" aria-labelledby="checklist">
            <h2 id="checklist" style={{ fontSize: "1.125rem" }}>
              Checklist
            </h2>
            <ul className="checks">
              {checks.map((c) => (
                <li key={c.label}>
                  {c.ok ? <CheckCircle className="ok" size={20} weight="fill" aria-label="Done" /> : <XCircle className="bad" size={20} weight="fill" aria-label="Not done" />}
                  <span>
                    {c.label}{" "}
                    {!c.ok && (
                      <Link className="btn btn--sm btn--ghost" href={`/studio/s/${id}/${c.fix}`}>
                        Fix
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {story ? (
            <section className="s-card" aria-labelledby="split-title">
              <h2 id="split-title" style={{ fontSize: "1.125rem" }}>
                Story vs plain
              </h2>
              <label className="s-row" style={{ alignItems: "flex-start" }}>
                <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2 }} />
                <span>
                  <strong>Split 50/50 to compare.</strong>
                  <span className="s-help" style={{ display: "block" }}>
                    Half of respondents get the story, half a plain form. Results show whether the story lifts completion without changing answers.
                  </span>
                </span>
              </label>
            </section>
          ) : (
            !plainOnly && <p className="banner banner--info">Story Mode is off for sensitive topics. Everyone gets a calm, plain survey.</p>
          )}
          {storyAllowed(survey) && (
            <label className="s-row s-card" style={{ alignItems: "flex-start" }}>
              <input type="checkbox" checked={plainOnly} onChange={(e) => setPlainOnly(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2 }} />
              <span>
                <strong>Publish without the story.</strong>
                <span className="s-help" style={{ display: "block" }}>
                  Everyone gets the plain form. Use this if the story world can&apos;t pass its checks in time.
                </span>
              </span>
            </label>
          )}
          {error && <p className="banner banner--danger">{error}</p>}
          <div className="sticky-actions">
            <span className="s-help">{ready ? "Everything passes." : "Finish the checklist to publish."}</span>
            <button type="button" className="btn btn--lg btn--primary" disabled={!ready || busy} aria-busy={busy} onClick={() => void publish()}>
              {busy ? "Publishing…" : "Publish"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="s-row">
            <h1>It&apos;s live!</h1>
            <span className="badge badge--success">Live</span>
          </div>
          <section className="s-card" aria-labelledby="share-title">
            <h2 id="share-title" style={{ fontSize: "1.125rem" }}>
              Share {title}
            </h2>
            <div className="s-row">
              <input id="share-url" className="s-input share-link" readOnly value={url} style={{ flex: "1 1 260px" }} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn btn--md btn--secondary" onClick={() => void copy()}>
                <Copy size={16} weight="bold" aria-hidden="true" /> Copy
              </button>
            </div>
            <a className="btn btn--lg btn--primary" style={{ justifySelf: "start" }} href={`https://wa.me/?text=${encodeURIComponent(`${title}: ${url}`)}`} target="_blank" rel="noreferrer">
              <WhatsappLogo size={20} weight="fill" aria-hidden="true" /> Share on WhatsApp
            </a>
            {qr && (
              <div className="s-row" style={{ alignItems: "flex-end" }}>
                {/* A generated data URL, so next/image adds nothing. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="qr" src={qr} alt={`QR code for ${url}`} />
                <a className="btn btn--md btn--secondary" href={qr} download={`${survey.slug}-qr.png`}>
                  <DownloadSimple size={16} weight="bold" aria-hidden="true" /> Download QR
                </a>
              </div>
            )}
            {survey.splitAB && <p className="s-help">Half of respondents get the story, half a plain form.</p>}
          </section>
          <section className="s-card s-card--sand">
            <h2 style={{ fontSize: "1.125rem" }}>What happens next</h2>
            <p className="muted">Results appear as answers come in. The story vs plain comparison unlocks at 30 finished responses in each version.</p>
            <Link className="btn btn--md btn--primary" style={{ justifySelf: "start" }} href={`/studio/s/${id}/results`}>
              Go to results
            </Link>
          </section>
        </>
      )}
      {toast && (
        <p className="toast" role="status">
          {toast}
        </p>
      )}
    </>
  );
}
