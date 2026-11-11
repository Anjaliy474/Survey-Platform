"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { DownloadSimple, LockSimple, MagnifyingGlass, ShieldCheck, Trash } from "@/components/icons";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ROLES, type Role, account, useMe } from "@/lib/account";
import { logDeletion, useAuditLog } from "@/lib/audit";
import { useNowMinute } from "@/lib/client-hooks";
import { clearResponses, deleteResponse, getResponses } from "@/lib/player/published-store";
import { getSurvey } from "@/lib/player/samples";
import { sampleResponses } from "@/lib/results/data";
import { studio, useStudio } from "@/lib/studio/store";
import type { StudioSurvey } from "@/lib/studio/types";
import { RestoreSamplesButton } from "./RestoreSamplesButton";
import { TopBar } from "./TopBar";

type Tab = "profile" | "privacy" | "billing";
const TABS: { value: Tab; label: string }[] = [
  { value: "profile", label: "Profile" },
  { value: "privacy", label: "Data and privacy" },
  { value: "billing", label: "Billing" },
];
const dateTime = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** X1 Settings (UI_UX_LAYOUT.md): profile, and data and privacy you can act on in the product. */
export function SettingsView() {
  const [tab, setTab] = useState<Tab>("profile");
  const id = useId();
  return (
    <>
      <TopBar crumbs={[{ label: "Home", href: "/app" }, { label: "Settings" }]} />
      <main className="page settings">
        <h1 className="settings__title">Settings</h1>
        <div className="settings__tabs" role="tablist" aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              id={`${id}-${t.value}`}
              aria-selected={tab === t.value}
              aria-controls={`${id}-${t.value}-panel`}
              className="settings__tab"
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`${id}-${tab}-panel`} aria-labelledby={`${id}-${tab}`} className="settings__panel">
          {tab === "profile" && <ProfileTab />}
          {tab === "privacy" && <PrivacyTab />}
          {tab === "billing" && (
            <section className="settings__card">
              <h2>Billing</h2>
              <p>Plans and prices aren’t set yet. Everything is free while PlaySurvey is a prototype.</p>
              <Link href="/pricing" className="btn btn--md btn--secondary">
                See plans
              </Link>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

function ProfileTab() {
  const me = useMe();
  const toast = useToast();
  if (!me) return <span className="skeleton" style={{ display: "block", height: 240 }} />;
  return (
    <section className="settings__card" aria-labelledby="profile-title">
      <h2 id="profile-title">Profile</h2>
      {!me.signedIn && (
        <p className="status-banner status-banner--info">
          <span>
            You’re exploring as a guest. <Link href="/signup" className="link">Create a free account</Link> or <Link href="/login" className="link">log in</Link> to keep a profile.
          </span>
        </p>
      )}
      <div className="field">
        <label className="field__label" htmlFor="pf-name">
          Name
        </label>
        <input id="pf-name" className="input" autoComplete="name" value={me.name} maxLength={60} onChange={(e) => account.update({ name: e.target.value })} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="pf-email">
          Email
        </label>
        <input id="pf-email" className="input" value={me.email ?? "Not signed in"} readOnly aria-describedby="pf-email-help" />
        <p className="field__help" id="pf-email-help">
          Changing your email arrives with the backend.
        </p>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="pf-role">
          Role
        </label>
        <select id="pf-role" className="input" value={me.role ?? ""} onChange={(e) => account.update({ role: (e.target.value || null) as Role | null })}>
          <option value="">Not chosen</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="pf-org">
          Organisation <span className="field__optional">(optional)</span>
        </label>
        <input id="pf-org" className="input" autoComplete="organization" value={me.org} maxLength={80} onChange={(e) => account.update({ org: e.target.value })} aria-describedby="pf-org-help" />
        <p className="field__help" id="pf-org-help">
          Respondents see this on surveys you publish from now on. Without it they see your name.
        </p>
      </div>
      <div className="settings__row">
        <span className="field__help">Changes save as you type.</span>
        {me.signedIn && (
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => {
              account.logOut();
              toast({ message: "You’re logged out. The Studio stays open as a guest." });
            }}
          >
            Log out
          </button>
        )}
      </div>
    </section>
  );
}

type Match = { survey: StudioSurvey; responseId: string; submittedAt: number | null; answers: number; local: boolean };

function PrivacyTab() {
  const toast = useToast();
  const state = useStudio();
  const me = useMe();
  const log = useAuditLog();
  const now = useNowMinute();
  const surveys = state?.status === "ready" ? state.surveys.filter((s) => s.status !== "draft" && s.slug) : [];
  const [pick, setPick] = useState("");
  const [typed, setTyped] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [confirmOne, setConfirmOne] = useState(false);
  const chosen = surveys.find((s) => s.id === pick);

  function download() {
    const data = {
      exportedAt: new Date().toISOString(),
      note: "Your PlaySurvey data from this browser. Passwords are never included.",
      profile: me ? { name: me.name, email: me.email, role: me.role, organisation: me.org } : null,
      surveys: state?.status === "ready" ? state.surveys : [],
      responses: Object.fromEntries(surveys.filter((s) => s.player && s.slug).map((s) => [s.slug as string, getResponses(s.slug as string)])),
      deletionLog: log,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `playsurvey-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast({ message: "Your data is downloading as a JSON file." });
  }

  function deleteAll(s: StudioSurvey) {
    if (s.player && s.slug) clearResponses(s.slug);
    studio.patch(s.id, () => ({
      responsesDeletedAt: Date.now(),
      deletedResponses: [],
      stats: s.stats ? { started: 0, finished: 0, lastSevenDays: [0, 0, 0, 0, 0, 0, 0] } : s.stats,
      themes: undefined,
      dashboard: undefined,
      review: undefined,
    }));
    logDeletion(`Deleted all responses to “${s.title}”.`);
    toast({ message: `All responses to “${s.title}” were deleted.` });
    setPick("");
    setTyped("");
  }

  function find() {
    const idText = query.trim().toUpperCase();
    setSearched(true);
    setMatch(null);
    if (!idText) return;
    for (const s of surveys) {
      if (s.player && s.slug) {
        const r = getResponses(s.slug).find((x) => x.id.toUpperCase() === idText);
        if (r) return setMatch({ survey: s, responseId: r.id, submittedAt: r.submittedAt, answers: Object.keys(r.answers).length, local: true });
      } else if (s.slug && !s.responsesDeletedAt && now) {
        const sample = getSurvey(s.slug);
        const r = sample ? sampleResponses(sample, now)?.find((x) => x.id.toUpperCase() === idText && !s.deletedResponses?.includes(x.id)) : undefined;
        if (r) return setMatch({ survey: s, responseId: r.id, submittedAt: r.submittedAt, answers: Object.keys(r.answers).length, local: false });
      }
    }
  }

  function deleteOne(m: Match) {
    if (m.local && m.survey.slug) deleteResponse(m.survey.slug, m.responseId);
    else
      studio.patch(m.survey.id, (s) => ({
        deletedResponses: [...(s.deletedResponses ?? []), m.responseId],
        stats: s.stats && m.submittedAt ? { ...s.stats, started: Math.max(0, s.stats.started - 1), finished: Math.max(0, s.stats.finished - 1) } : s.stats,
      }));
    logDeletion(`Deleted response ${m.responseId} from “${m.survey.title}” at the respondent’s request.`);
    toast({ message: `Response ${m.responseId} was deleted. You can tell the respondent it’s done.` });
    setMatch(null);
    setQuery("");
    setSearched(false);
  }

  return (
    <div className="settings__stack">
      <section className="settings__card" aria-labelledby="store-title">
        <h2 id="store-title">What we store</h2>
        <ul className="settings__list">
          <li>Your account: email, name, role and organisation. Your password only as a salted hash.</li>
          <li>Your surveys: questions, style choices and settings.</li>
          <li>Responses: the answers people give, when they started and submitted, and an optional enjoyment rating. No names or device IDs unless a question asks for them.</li>
          <li>Personal data a question collects (like an email) is never charted or sent to AI; AI only ever sees masked text.</li>
        </ul>
        <p className="field__help">
          <LockSimple size={14} weight="bold" aria-hidden="true" /> In this prototype everything stays in this browser.
        </p>
        <button type="button" className="btn btn--md btn--secondary settings__btn" onClick={download}>
          <DownloadSimple size={18} weight="regular" aria-hidden="true" /> Download my data
        </button>
      </section>

      <section className="settings__card" aria-labelledby="del-title">
        <h2 id="del-title">Delete a survey’s responses</h2>
        <p>Removes every response to one survey, with its themes and dashboard. The survey itself stays.</p>
        <div className="field">
          <label className="field__label" htmlFor="del-survey">
            Survey
          </label>
          <select
            id="del-survey"
            className="input"
            value={pick}
            onChange={(e) => {
              setPick(e.target.value);
              setTyped("");
            }}
          >
            <option value="">Choose a survey</option>
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        {chosen && (
          <div className="field">
            <label className="field__label" htmlFor="del-type">
              Type the survey’s title to confirm: <strong>{chosen.title}</strong>
            </label>
            <input id="del-type" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        )}
        <button type="button" className="btn btn--md btn--danger settings__btn" disabled={!chosen || typed.trim() !== chosen.title} onClick={() => setConfirmAll(true)}>
          <Trash size={18} weight="regular" aria-hidden="true" /> Delete all responses
        </button>
      </section>

      <section className="settings__card" aria-labelledby="req-title">
        <h2 id="req-title">Handle a deletion request</h2>
        <p>When a respondent asks you to delete their answers, find their response by its ID (they see it in your reply, for example R-0233) and delete it here.</p>
        <form
          className="settings__search"
          onSubmit={(e) => {
            e.preventDefault();
            find();
          }}
        >
          <label className="sr-only" htmlFor="req-id">
            Response ID
          </label>
          <input id="req-id" className="input" placeholder="Response ID, e.g. R-0233" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          <button type="submit" className="btn btn--md btn--secondary">
            <MagnifyingGlass size={18} weight="regular" aria-hidden="true" /> Find
          </button>
        </form>
        <div role="status" aria-live="polite">
          {match ? (
            <div className="settings__match">
              <p>
                <span className="rid">{match.responseId}</span> in <strong>{match.survey.title}</strong>
                {match.submittedAt ? `, submitted ${dateTime.format(match.submittedAt)}` : ", not submitted"} · {match.answers} answers
              </p>
              <button type="button" className="btn btn--sm btn--danger" onClick={() => setConfirmOne(true)}>
                Delete this response
              </button>
            </div>
          ) : (
            searched && query.trim() && <p className="field__help">No response with that ID. Check the ID with the respondent.</p>
          )}
        </div>
      </section>

      <section className="settings__card" aria-labelledby="log-title">
        <h2 id="log-title">Deletion log</h2>
        {log.length === 0 ? (
          <p className="field__help">Nothing deleted yet. Every deletion is recorded here, without the deleted answers.</p>
        ) : (
          <ul className="settings__log">
            {log.map((e) => (
              <li key={`${e.at}-${e.what}`}>
                <time dateTime={new Date(e.at).toISOString()}>{dateTime.format(e.at)}</time>
                <span>{e.what}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="settings__card settings__dpdp" aria-labelledby="dpdp-title">
        <h2 id="dpdp-title">
          <Badge kind="dpdp" /> Your duties under India’s DPDP Act, in plain words
        </h2>
        <ul className="settings__list">
          <li>
            <strong>Say why you’re asking.</strong> Every survey shows a purpose line, and a consent line when it asks for personal or sensitive data.
          </li>
          <li>
            <strong>Ask only what you need.</strong> Personal questions are optional, and PlaySurvey suggests cutting ones your decision doesn’t need.
          </li>
          <li>
            <strong>Honour requests.</strong> If someone asks to see or delete their answers, do it promptly. The deletion request tool above completes it inside the product.
          </li>
          <li>
            <strong>Keep it safe and don’t keep it forever.</strong> Delete responses when the decision is made.
          </li>
        </ul>
        <p className="field__help">
          <ShieldCheck size={14} weight="bold" aria-hidden="true" /> This is a summary, not legal advice. See our <Link href="/privacy" className="link">Privacy Policy</Link>.
        </p>
      </section>

      <section className="settings__card" aria-labelledby="demo-title">
        <h2 id="demo-title">Demo</h2>
        <RestoreSamplesButton />
      </section>

      <ConfirmDialog
        open={confirmAll && !!chosen}
        title={chosen ? `Delete every response to “${chosen.title}”?` : ""}
        confirmLabel="Delete all responses"
        tone="danger"
        onConfirm={() => {
          if (chosen) deleteAll(chosen);
          setConfirmAll(false);
        }}
        onClose={() => setConfirmAll(false)}
      >
        This deletes all of its responses, themes and dashboard. This can’t be undone.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmOne && !!match}
        title={match ? `Delete response ${match.responseId}?` : ""}
        confirmLabel="Delete response"
        tone="danger"
        onConfirm={() => {
          if (match) deleteOne(match);
          setConfirmOne(false);
        }}
        onClose={() => setConfirmOne(false)}
      >
        {match ? `This deletes every answer in ${match.responseId} from “${match.survey.title}”. This can’t be undone.` : ""}
      </ConfirmDialog>
    </div>
  );
}
