import Link from "next/link";
import { ComputedMark } from "@/components/ui/Badge";
import type { Confidence, Insight, InsightGroup, InsightSet } from "@/lib/results/insights";

const KIND_LABEL: Record<Insight["kind"], string> = {
  score: "Headline score",
  gap: "Difference between groups",
  driver: "What drives it",
  trend: "Change over time",
  demand: "Who wants what",
  words: "In their own words",
  dropoff: "Where people quit",
};
const CONF_LABEL: Record<Confidence, string> = { clear: "Clear finding", likely: "Likely", early: "Early signal" };

/**
 * Key insights: findings beyond the direct answers (groups, drivers, time, comments, drop-off).
 * Computed in code; each card shows how sure it is and what to do next.
 */
export function KeyInsights({ set, themesHref, compact = false, limit }: { set: InsightSet; themesHref?: string; compact?: boolean; limit?: number }) {
  const list = set.insights.slice(0, limit ?? set.insights.length);
  if (!list.length)
    return (
      <div className="kin kin--empty">
        <p>Not enough answers yet to find patterns. Insights appear as responses come in.</p>
        {set.notes.map((n) => (
          <p key={n} className="kin__note">
            {n}
          </p>
        ))}
      </div>
    );
  return (
    <div className={`kin${compact ? " kin--compact" : ""}`}>
      <div className="kin__grid">
        {list.map((i) => (
          <InsightCard key={i.id} insight={i} compact={compact} themesHref={themesHref} />
        ))}
      </div>
      {!compact &&
        set.notes.map((n) => (
          <p key={n} className="kin__note">
            {n}
          </p>
        ))}
    </div>
  );
}

function InsightCard({ insight: i, compact, themesHref }: { insight: Insight; compact: boolean; themesHref?: string }) {
  return (
    <article className={`kin__card kin__card--${i.tone}${i.kind === "score" ? " kin__card--score" : ""}`}>
      <p className="kin__kind">{KIND_LABEL[i.kind]}</p>
      <h3 className="kin__headline">{i.headline}</h3>
      {!compact && i.groups && <GroupBars groups={i.groups} />}
      {!compact && i.words && (
        <ul className="kin__words" aria-label="Words that come up most">
          {i.words.map((w) => (
            <li key={w.word}>
              {w.word} <span>{w.count}</span>
            </li>
          ))}
        </ul>
      )}
      {!compact && <p className="kin__detail">{i.detail}</p>}
      {!compact && (
        <p className="kin__action">
          <strong>What to do:</strong> {i.action}
          {i.kind === "words" && themesHref && (
            <>
              {" "}
              <Link href={themesHref} className="link">
                Open Themes
              </Link>
            </>
          )}
        </p>
      )}
      <p className="kin__basis">
        <span className={`kin__conf kin__conf--${i.confidence}`}>{CONF_LABEL[i.confidence]}</span>
        {!compact && (
          <>
            {" "}
            · {i.basis} <ComputedMark />
          </>
        )}
      </p>
    </article>
  );
}

function GroupBars({ groups }: { groups: InsightGroup[] }) {
  return (
    <table className="kin__bars">
      <caption className="sr-only">Comparison</caption>
      <tbody>
        {groups.map((g) => (
          <tr key={g.label} className={g.best ? "is-best" : g.worst ? "is-worst" : undefined}>
            <th scope="row">{g.label}</th>
            <td>
              <span className="kin__track" aria-hidden="true">
                <span className="kin__fill" style={{ width: `${Math.max(2, Math.min(100, g.pct))}%` }} />
              </span>
            </td>
            <td className="kin__pct">
              {g.pct}%<span className="kin__n"> n={g.n}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
