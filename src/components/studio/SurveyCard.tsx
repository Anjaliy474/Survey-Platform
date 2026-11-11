"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Copy, StopCircle, Trash } from "@/components/icons";
import { Badge, ComputedMark } from "@/components/ui/Badge";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { useNowMinute } from "@/lib/client-hooks";
import { estimateSeconds, formatAbout, formatCount, percent, sum } from "@/lib/compute";
import { type StoredResponse, useResponses } from "@/lib/player/published-store";
import { STEPS, cardHref } from "@/lib/studio/sections";
import type { StudioSurvey } from "@/lib/studio/types";

const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
export const formatDate = (ms: number) => dateFormat.format(ms);


/** 7-day bar sparkline (Computed); the tallest day sets the scale. */
function Sparkline({ days }: { days: number[] }) {
  const max = Math.max(1, ...days);
  return (
    <div className="spark">
      <div className="spark__bars" role="img" aria-label={`Responses per day, last 7 days: ${days.join(", ")}`}>
        {days.map((d, i) => (
          <i key={i} style={{ "--h": `${Math.max(4, (d / max) * 100)}%` } as CSSProperties} />
        ))}
      </div>
      <span className="spark__label">
        {formatCount(sum(days))} in the last 7 days <ComputedMark />
      </span>
    </div>
  );
}

/**
 * Survey card (UI_UX_LAYOUT.md S1): status, title, then Computed numbers for live and closed
 * surveys, or length and current step for drafts. The whole card opens the survey; the ⋯ menu
 * holds Duplicate, Close survey and Delete.
 */
const DAY = 24 * 60 * 60 * 1000;
function localStats(list: readonly StoredResponse[], now: number) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
    const from = today.getTime() - (6 - i) * DAY;
    return list.filter((r) => r.submittedAt >= from && r.submittedAt < from + DAY).length;
  });
  return { started: list.length, finished: list.length, lastSevenDays };
}

export function SurveyCard({
  survey: s,
  onDuplicate,
  onClose,
  onDelete,
}: {
  survey: StudioSurvey;
  onDuplicate: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const titleId = `card-${s.id}`;
  // Surveys published in this browser count the answers collected here; samples use sample stats.
  const local = useResponses(s.player ? s.slug : null);
  const now = useNowMinute();
  const stats = s.player ? localStats(local, now) : s.stats;
  const items: MenuItem[] = [{ label: "Duplicate", Icon: Copy, onSelect: onDuplicate }];
  if (s.status === "live") items.push({ label: "Close survey", Icon: StopCircle, onSelect: onClose });
  items.push({ label: "Delete…", Icon: Trash, danger: true, onSelect: onDelete });
  const stepLabel = STEPS.find((x) => x.section === s.step)?.label ?? "";

  return (
    <article className={`survey-card is-${s.status}`} aria-labelledby={titleId}>
      <div className="survey-card__top">
        <Badge kind={s.status} />
        <Menu label={`More actions for ${s.title}`} items={items} />
      </div>
      <h3 id={titleId} className="survey-card__title">
        <Link href={cardHref(s)} className="survey-card__link">
          {s.title}
        </Link>
      </h3>

      {stats && s.status !== "draft" ? (
        <>
          <dl className="survey-card__stats">
            <div>
              <dt>Responses</dt>
              <dd>
                {formatCount(stats.finished)}
                <ComputedMark />
              </dd>
            </div>
            <div>
              <dt>Completion</dt>
              <dd>
                {stats.started ? `${percent(stats.finished, stats.started)}%` : "–"}
                <ComputedMark />
              </dd>
            </div>
          </dl>
          {s.status === "live" ? (
            <Sparkline days={stats.lastSevenDays} />
          ) : (
            <p className="survey-card__note">Closed on {s.closedAt ? formatDate(s.closedAt) : "—"}. Results stay available.</p>
          )}
        </>
      ) : (
        <>
          <p className="survey-card__length">
            {s.questions.length} questions · {formatAbout(estimateSeconds(s.questions))}
            <ComputedMark />
          </p>
          <p className="survey-card__note">Current step: {stepLabel}</p>
        </>
      )}

      <div className="survey-card__foot">
        <span className="survey-card__date">Edited {formatDate(s.updatedAt)}</span>
        <Link href={cardHref(s)} className="btn btn--sm btn--secondary survey-card__cta" tabIndex={-1} aria-hidden="true">
          {s.status === "draft" ? "Continue" : "Open results"}
        </Link>
      </div>
    </article>
  );
}
