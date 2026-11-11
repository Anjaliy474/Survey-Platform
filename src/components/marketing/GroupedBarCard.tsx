"use client";

import { Warning } from "@phosphor-icons/react/dist/ssr";
import type { CSSProperties } from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { useSubmittedPoll } from "@/lib/client-hooks";
import { MIN_GROUP_SIZE, formatCount, percentsSummingTo100 } from "@/lib/compute";
import { DRINKS, type PollStats } from "@/lib/demo-poll";

const SERIES = ["var(--ps-viz-1)", "var(--ps-viz-2)"];

/**
 * Grouped bar chart card (DESIGN.md §8.3): descriptive title, "Answers:" line, n per group,
 * small groups hatched and flagged, and a "View as table" alternative.
 * After the visitor plays the poll, their pick is marked in the legend.
 */
export function GroupedBarCard({ groups }: { groups: PollStats["bySlot"] }) {
  const [asTable, setAsTable] = useState(false);
  const mine = useSubmittedPoll();
  const rows = groups.map((g) => ({ ...g, pct: percentsSummingTo100(g.counts), small: g.n < MIN_GROUP_SIZE }));
  const smallGroups = rows.filter((r) => r.small);

  return (
    <div className="card chart-card" data-reveal>
      <div className="chart-card__head">
        <h3 className="chart-card__title">Chai or coffee, by time of day people answered</h3>
        <Badge kind="computed" />
      </div>
      <p className="chart-card__answers">Answers: does the drink people pick change through the day?</p>

      <div className="legend">
        {DRINKS.map((d, i) => (
          <span key={d} className={mine?.drink === i ? "is-mine" : ""}>
            <i style={{ background: SERIES[i] }} />
            {d}
            {mine?.drink === i && <span className="you-tag">Your pick</span>}
          </span>
        ))}
      </div>

      {asTable ? (
        <table className="data-table">
          <caption className="sr-only">Chai or coffee by time of day, with number of responses per group</caption>
          <thead>
            <tr>
              <th scope="col">Time of day</th>
              <th scope="col">n</th>
              {DRINKS.map((d) => (
                <th key={d} scope="col">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slot}>
                <th scope="row">
                  {r.slot}
                  {r.small && " (small group)"}
                </th>
                <td className="tabular">{formatCount(r.n)}</td>
                {r.pct.map((p, i) => (
                  <td key={i} className="tabular">
                    {p}% ({formatCount(r.counts[i])})
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="gbar" aria-hidden="true">
          {rows.map((r) => (
            <div key={r.slot} className={`gbar__row ${r.small ? "is-small" : ""}`}>
              <span className="gbar__label">
                {r.slot}
                <small className="tabular">n = {formatCount(r.n)}</small>
              </span>
              <div className="gbar__bars">
                {r.pct.map((p, i) => (
                  <div key={i} className="gbar__bar">
                    <i className="grow-x" style={{ "--v": `${p}%`, backgroundColor: SERIES[i] } as CSSProperties} />
                    <span className="tabular">{p}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="chart-card__foot">
        {smallGroups.map((g) => (
          <span key={g.slot} className="badge badge--warning">
            <Warning size={12} weight="bold" aria-hidden="true" />
            Small group (n = {g.n}). Read with care
          </span>
        ))}
        <button type="button" className="btn btn--ghost chart-card__toggle" onClick={() => setAsTable((v) => !v)}>
          {asTable ? "View as chart" : "View as table"}
        </button>
      </div>
    </div>
  );
}
