"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Copy, StopCircle, Trash } from "@/components/icons";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { useNowMinute } from "@/lib/client-hooks";
import { estimateSeconds, formatAbout, formatCount, percent, sum } from "@/lib/compute";
import { type StoredResponse, getResponses, useResponses } from "@/lib/player/published-store";
import { STEPS, cardHref } from "@/lib/studio/sections";
import type { StudioSurvey } from "@/lib/studio/types";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
export const formatDate = (ms: number) => dateFormat.format(ms);

const DAY = 24 * 60 * 60 * 1000;
export type SurveyStats = { started: number; finished: number; lastSevenDays: number[] };

export function localStats(list: readonly StoredResponse[], now: number): SurveyStats {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
    const from = today.getTime() - (6 - i) * DAY;
    return list.filter((r) => r.submittedAt >= from && r.submittedAt < from + DAY).length;
  });
  return { started: list.length, finished: list.length, lastSevenDays };
}

/** Numbers for a survey: answers collected in this browser for published and imported ones, sample stats otherwise. */
export function statsFor(s: StudioSurvey, now: number, list?: readonly StoredResponse[]): SurveyStats | null {
  if (s.player && s.slug) return localStats(list ?? getResponses(s.slug), now);
  return s.stats;
}

/** 7-day bars, no label (the column header says what it is). */
function Spark({ days }: { days: number[] }) {
  const max = Math.max(1, ...days);
  return (
    <span className="srow__spark" role="img" aria-label={`${formatCount(sum(days))} in the last 7 days`}>
      {days.map((d, i) => (
        <i key={i} style={{ "--h": `${Math.max(6, (d / max) * 100)}%` } as CSSProperties} />
      ))}
    </span>
  );
}

const STATUS: Record<StudioSurvey["status"], string> = { draft: "Draft", live: "Live", closed: "Closed" };

/** One survey as a row: name and status, Computed numbers, last edit, one action and a ⋯ menu. */
export function SurveyRow({ survey: s, onDuplicate, onClose, onDelete }: { survey: StudioSurvey; onDuplicate: () => void; onClose: () => void; onDelete: () => void }) {
  const local = useResponses(s.player ? s.slug : null);
  const now = useNowMinute();
  const stats = now ? statsFor(s, now, local) : s.stats;
  const draft = s.status === "draft";
  const items: MenuItem[] = s.source ? [] : [{ label: "Duplicate", Icon: Copy, onSelect: onDuplicate }];
  if (s.status === "live") items.push({ label: "Close survey", Icon: StopCircle, onSelect: onClose });
  items.push({ label: "Delete…", Icon: Trash, danger: true, onSelect: onDelete });
  const status = s.source ? "Imported" : STATUS[s.status];
  const meta = draft
    ? `${s.questions.length} questions · ${formatAbout(estimateSeconds(s.questions))} · ${STEPS.find((x) => x.section === s.step)?.label ?? ""} step`
    : s.source
      ? `From ${s.source.fileName}`
      : `${s.questions.length} questions`;

  return (
    <li className="srow">
      <div className="srow__name">
        <Link href={cardHref(s)} className="srow__title">
          {s.title}
        </Link>
        <span className="srow__meta">
          <span className={`srow__status srow__status--${s.source ? "imported" : s.status}`}>{status}</span>
          {meta}
        </span>
      </div>
      <span className="srow__num" data-label="Responses">
        {!draft && stats ? formatCount(stats.finished) : "–"}
      </span>
      <span className="srow__num" data-label="Completion">
        {!draft && stats && stats.started ? `${percent(stats.finished, stats.started)}%` : "–"}
      </span>
      <span className="srow__trend" data-label="Last 7 days">
        {!draft && stats ? <Spark days={stats.lastSevenDays} /> : <span className="srow__dash">–</span>}
      </span>
      <span className="srow__date" data-label="Edited">
        {formatDate(s.updatedAt)}
      </span>
      <span className="srow__actions">
        <Link href={cardHref(s)} className="btn btn--sm btn--secondary">
          {draft ? "Continue" : "Results"}
        </Link>
        <Menu label={`More actions for ${s.title}`} items={items} />
      </span>
    </li>
  );
}
