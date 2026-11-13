"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, DownloadSimple, Eye, Flag, LinkSimple, MagnifyingGlass } from "@/components/icons";
import { Badge, ComputedMark } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { maskPersonalData } from "@/lib/ai/masking";
import { logDeletion } from "@/lib/audit";
import { useNowMinute, useSearchParam } from "@/lib/client-hooks";
import { formatCount } from "@/lib/compute";
import { summarize as summarizeAnswer } from "@/lib/player/rules";
import type { PlayerSurvey } from "@/lib/player/types";
import { FLAG_LABEL, FLAG_REASON, type FlagCode, formatSeconds, qualityFlags } from "@/lib/results/compute";
import type { ResultResponse } from "@/lib/results/data";
import { surveyHref } from "@/lib/studio/sections";
import type { StudioSurvey } from "@/lib/studio/types";
import { ResultsTabs } from "../ResultsTabs";
import { TopBar } from "../TopBar";
import { setReview, useResultsData } from "./ResultsView";

type Status = "all" | "complete" | "partial" | "flagged";
const PAGE = 50;
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" });
const THEME_FLAG: Record<string, string> = {
  suspected_manipulation: "Possible manipulation",
  personal_data: "Personal data",
  abusive: "Abusive",
  spam: "Spam",
  duplicate: "Duplicate",
};

type Row = { r: ResultResponse; flags: { label: string; reason: string }[]; decision: "keep" | "exclude" | undefined };

/** R2 Responses (UI_UX_LAYOUT.md): every response, flags a person decides on, and CSV export. */
export function ResponsesView({ survey }: { survey: StudioSurvey }) {
  const toast = useToast();
  const now = useNowMinute();
  const { player, rows } = useResultsData(survey);
  const flagParam = useSearchParam("flag");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>(flagParam ? "flagged" : "all");
  const [date, setDate] = useState<"all" | "7" | "30">("all");
  const [includeFlagged, setIncludeFlagged] = useState(true);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<Row | null>(null);
  const [reveal, setReveal] = useState(false);
  const [askReveal, setAskReveal] = useState(false);
  const review = survey.review;

  const all: Row[] = useMemo(() => {
    if (!player) return [];
    const flags = qualityFlags(player, rows);
    const themeFlags = new Map<string, { type: string; note: string }[]>();
    Object.values(survey.themes ?? {}).forEach((t) => t.result.flags.forEach((f) => themeFlags.set(f.response_id, [...(themeFlags.get(f.response_id) ?? []), { type: f.type, note: f.note }])));
    return rows
      .map((r) => ({
        r,
        flags: [
          ...(flags.get(r.id) ?? []).map((c: FlagCode) => ({ label: FLAG_LABEL[c], reason: FLAG_REASON[c] })),
          ...(themeFlags.get(r.id) ?? []).map((f) => ({ label: THEME_FLAG[f.type] ?? f.type, reason: f.note })),
        ],
        decision: review?.[r.id],
      }))
      .sort((a, b) => (b.r.submittedAt ?? b.r.startedAt) - (a.r.submittedAt ?? a.r.startedAt));
  }, [player, rows, review, survey.themes]);

  const flagFilter = flagParam && flagParam !== "any" ? FLAG_LABEL[flagParam as FlagCode] : null;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(({ r, flags }) => {
      if (date !== "all" && now && (r.submittedAt ?? r.startedAt) < now - Number(date) * 86_400_000) return false;
      if (status === "complete" && r.submittedAt === null) return false;
      if (status === "partial" && r.submittedAt !== null) return false;
      if (status === "flagged" && flags.length === 0) return false;
      if (status === "flagged" && flagFilter && !flags.some((f) => f.label === flagFilter)) return false;
      if (!includeFlagged && flags.length && status !== "flagged") return false;
      if (!q) return true;
      return r.id.toLowerCase().includes(q) || Object.values(r.answers).some((a) => typeof a === "string" && a.toLowerCase().includes(q));
    });
  }, [all, query, status, date, includeFlagged, now, flagFilter]);

  const pending = all.filter((x) => x.flags.length && !x.decision);
  const top = (
    <>
      <TopBar
        crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
        status={survey.status}
        secondary={survey.slug && !survey.source ? [{ label: "View survey", href: `/s/${survey.slug}`, external: true, Icon: ArrowUpRight }] : []}
        primary={survey.status === "live" ? { label: "Share", Icon: LinkSimple, href: surveyHref(survey.id, "publish") } : undefined}
      />
      <ResultsTabs surveyId={survey.id} current="responses" hasResponses={rows.length > 0} />
    </>
  );
  if (!player) return top;
  const personal = new Set(player.questions.filter((q) => q.collects_personal_data).map((q) => q.id));
  const cell = (r: ResultResponse, qid: string) => {
    const q = player.questions.find((x) => x.id === qid);
    const a = r.answers[qid];
    if (!q || a === undefined) return "";
    if (personal.has(qid) && !reveal) return "•••• hidden";
    return typeof a === "string" ? maskIf(a, personal.has(qid) && reveal) : summarizeAnswer(q, a);
  };
  const statusOf = (x: Row) => (x.decision === "exclude" ? "Excluded" : x.r.submittedAt === null ? "Partial" : x.flags.length && x.decision !== "keep" ? "Flagged" : "Complete");

  function decide(x: Row, d: "keep" | "exclude") {
    const prev = x.decision ?? null;
    setReview(survey.id, x.r.id, d);
    if (open?.r.id === x.r.id) setOpen({ ...x, decision: d });
    toast({
      message: d === "exclude" ? `${x.r.id} excluded. Every number updates.` : `${x.r.id} kept in the results.`,
      action: { label: "Undo", onClick: () => setReview(survey.id, x.r.id, prev) },
    });
  }

  function exportCsv() {
    if (!player) return;
    const head = ["response_id", "status", "started_at", "submitted_at", "seconds", "excluded", "flags", "enjoyment", ...player.questions.map((q) => `${q.id} ${q.text}`)];
    const lines = all.map((x) => [
      x.r.id,
      x.r.submittedAt === null ? "partial" : "complete",
      new Date(x.r.startedAt).toISOString(),
      x.r.submittedAt ? new Date(x.r.submittedAt).toISOString() : "",
      x.r.seconds ?? "",
      x.decision === "exclude" ? "yes" : "no",
      x.flags.map((f) => f.label).join("; "),
      x.r.enjoyment === null ? "" : x.r.enjoyment + 1,
      ...player.questions.map((q) => {
        const a = x.r.answers[q.id];
        if (a === undefined) return "";
        if (q.collects_personal_data && !reveal) return "[hidden]";
        return typeof a === "string" ? a : summarizeAnswer(q, a);
      }),
    ]);
    const csv = [head, ...lines].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${survey.slug ?? "survey"}-responses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast({ message: `Exported ${formatCount(all.length)} responses, with an “excluded” column.` });
  }

  if (rows.length === 0) {
    return (
      <>
        {top}
        <main className="page">
          <h1 className="sr-only">Responses: {survey.title}</h1>
          <EmptyState symbol="0" title="No responses yet.">
            Share your link and every response will be listed here.
          </EmptyState>
        </main>
      </>
    );
  }

  return (
    <>
      {top}
      <main className="page responses">
        <div className="responses__head">
          <h1>
            Responses <span className="responses__count">{formatCount(all.length)}</span>
          </h1>
          {pending.length > 0 && (
            <span className="badge badge--warning">
              <Flag size={12} weight="fill" aria-hidden="true" /> {pending.length} flagged to review
            </span>
          )}
        </div>

        {pending.length > 0 && status !== "flagged" && (
          <section className="flagged" aria-labelledby="flagged-title">
            <h2 id="flagged-title">Flagged responses</h2>
            <p className="field__help">Code flagged these. Nothing is dropped silently: keep or exclude each one.</p>
            <ul>
              {pending.slice(0, 5).map((x) => (
                <FlagRow key={x.r.id} x={x} onKeep={() => decide(x, "keep")} onExclude={() => decide(x, "exclude")} onOpen={() => setOpen(x)} />
              ))}
            </ul>
            {pending.length > 5 && (
              <button type="button" className="btn btn--ghost" onClick={() => setStatus("flagged")}>
                See all {pending.length} flagged
              </button>
            )}
          </section>
        )}

        <div className="responses__toolbar">
          <label className="responses__search">
            <MagnifyingGlass size={18} weight="regular" aria-hidden="true" />
            <span className="sr-only">Search responses</span>
            <input className="input" placeholder="Search by ID or written answer" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <select className="input responses__date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value as typeof date)}>
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
          <div className="chips" role="group" aria-label="Status">
            {(["all", "complete", "partial", "flagged"] as Status[]).map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
                {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <label className="quality__toggle">
            <input type="checkbox" checked={includeFlagged} onChange={(e) => setIncludeFlagged(e.target.checked)} /> Include flagged
          </label>
          {personal.size > 0 && (
            <button type="button" className="btn btn--sm btn--secondary" onClick={() => (reveal ? setReveal(false) : setAskReveal(true))}>
              <Eye size={16} weight="regular" aria-hidden="true" /> {reveal ? "Hide personal data" : "Show personal data"}
            </button>
          )}
          <button type="button" className="btn btn--sm btn--secondary responses__export" onClick={exportCsv}>
            <DownloadSimple size={16} weight="regular" aria-hidden="true" /> Export CSV
          </button>
        </div>
        {flagFilter && status === "flagged" && <p className="field__help">Showing responses flagged “{flagFilter}”.</p>}
        <p className="field__help" role="status">
          {formatCount(visible.length)} of {formatCount(all.length)} shown <ComputedMark />
        </p>

        <div className="rtable" role="region" aria-label="Responses table" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Response</th>
                <th scope="col">Submitted</th>
                <th scope="col">Status</th>
                <th scope="col" className="num">
                  Time
                </th>
                {player.questions.map((q) => (
                  <th key={q.id} scope="col" title={q.text}>
                    {q.id} {personal.has(q.id) && <Badge kind="dpdp" />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.slice(0, shown).map((x) => (
                <tr key={x.r.id} className={x.decision === "exclude" ? "is-excluded" : undefined} onClick={() => setOpen(x)}>
                  <th scope="row">
                    <button type="button" className="rid rtable__open" onClick={(e) => {
                        e.stopPropagation();
                        setOpen(x);
                      }}>
                      {x.r.id}
                    </button>
                  </th>
                  <td>{x.r.submittedAt ? dateFmt.format(x.r.submittedAt) : "–"}</td>
                  <td>
                    <span className={`rstatus rstatus--${statusOf(x).toLowerCase()}`}>{statusOf(x)}</span>
                  </td>
                  <td className="num">{x.r.seconds !== null ? formatSeconds(x.r.seconds) : "–"}</td>
                  {player.questions.map((q) => (
                    <td key={q.id} className="rtable__ans">
                      {cell(x.r, q.id)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="rcards">
          {visible.slice(0, shown).map((x) => (
            <li key={x.r.id}>
              <button type="button" className="rcard" onClick={() => setOpen(x)}>
                <span className="rcard__top">
                  <span className="rid">{x.r.id}</span>
                  <span className={`rstatus rstatus--${statusOf(x).toLowerCase()}`}>{statusOf(x)}</span>
                  <span className="muted">{x.r.submittedAt ? dateFmt.format(x.r.submittedAt) : "Not submitted"}</span>
                </span>
                {player.questions.slice(0, 2).map((q) => (
                  <span key={q.id} className="rcard__ans">
                    <strong>{q.id}</strong> {cell(x.r, q.id) || "–"}
                  </span>
                ))}
              </button>
            </li>
          ))}
        </ul>
        {visible.length > shown && (
          <button type="button" className="btn btn--md btn--secondary responses__more" onClick={() => setShown((s) => s + PAGE)}>
            Show {Math.min(PAGE, visible.length - shown)} more
          </button>
        )}
      </main>

      <Drawer open={open !== null} title={open ? `Response ${open.r.id}` : ""} onClose={() => setOpen(null)}>
        {open && <ResponseDetail x={open} player={player} cell={cell} status={statusOf(open)} onKeep={() => decide(open, "keep")} onExclude={() => decide(open, "exclude")} />}
      </Drawer>
      <ConfirmDialog
        open={askReveal}
        title="Show personal data?"
        confirmLabel="Show personal data"
        onConfirm={() => {
          setReveal(true);
          setAskReveal(false);
          logDeletion(`Viewed personal data in responses to “${survey.title}”.`);
        }}
        onClose={() => setAskReveal(false)}
      >
        Answers to personal questions (like emails) will be visible on this screen. This is logged in Settings. AI features never see them.
      </ConfirmDialog>
    </>
  );
}

const maskIf = (text: string, raw: boolean) => (raw ? text : maskPersonalData(text));
const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function FlagRow({ x, onKeep, onExclude, onOpen }: { x: Row; onKeep: () => void; onExclude: () => void; onOpen: () => void }) {
  return (
    <li className="flagrow">
      <button type="button" className="rid rtable__open" onClick={onOpen}>
        {x.r.id}
      </button>
      <span className="flagrow__chips">
        {x.flags.map((f) => (
          <span key={f.label} className="danger-chip">
            {f.label}
          </span>
        ))}
      </span>
      <span className="flagrow__why">{x.flags[0]?.reason}</span>
      <span className="flagrow__actions">
        <button type="button" className="btn btn--sm btn--secondary" onClick={onKeep}>
          Keep
        </button>
        <button type="button" className="btn btn--sm btn--danger" onClick={onExclude}>
          Exclude
        </button>
      </span>
    </li>
  );
}

function ResponseDetail({
  x,
  player,
  cell,
  status,
  onKeep,
  onExclude,
}: {
  x: Row;
  player: PlayerSurvey;
  cell: (r: ResultResponse, qid: string) => string;
  status: string;
  onKeep: () => void;
  onExclude: () => void;
}) {
  return (
    <div className="rdetail">
      <p className="rdetail__meta">
        <span className={`rstatus rstatus--${status.toLowerCase()}`}>{status}</span>
        {x.r.submittedAt ? `Submitted ${dateFmt.format(x.r.submittedAt)}, ${timeFmt.format(x.r.submittedAt)}` : "Left before submitting"}
        {x.r.seconds !== null && ` · ${formatSeconds(x.r.seconds)}`}
      </p>
      {x.flags.length > 0 && (
        <ul className="rdetail__flags">
          {x.flags.map((f) => (
            <li key={f.label}>
              <span className="danger-chip">{f.label}</span> {f.reason}
            </li>
          ))}
        </ul>
      )}
      <ol className="rdetail__answers">
        {player.questions.map((q) => (
          <li key={q.id}>
            <span className="rdetail__q">
              {q.id}. {q.text}
            </span>
            <span className="rdetail__a">{cell(x.r, q.id) || <em className="muted">No answer</em>}</span>
          </li>
        ))}
      </ol>
      <div className="rdetail__actions">
        <button type="button" className="btn btn--md btn--secondary" onClick={onKeep} aria-pressed={x.decision === "keep"}>
          Keep
        </button>
        <button type="button" className="btn btn--md btn--danger" onClick={onExclude} aria-pressed={x.decision === "exclude"}>
          Exclude
        </button>
      </div>
      <p className="field__help">Excluding takes it out of every chart, theme and dashboard. You can undo it any time.</p>
    </div>
  );
}
