"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Table } from "@/components/icons";
import { ComputedMark } from "@/components/ui/Badge";
import { formatCount } from "@/lib/compute";
import type { BarRow } from "@/lib/results/compute";

/**
 * Chart pieces for Results (DESIGN.md §3.5, §8.3), in plain HTML and CSS: thin bars with a
 * rounded value end, values at the tip, hairline grid, one teal series, a diverging Likert
 * palette with a neutral middle, and a table view for every chart. Never a pie.
 */

const CAVEATS = {
  multi_select: "People could pick several",
  ordinal_mean: "Average of a rating scale",
  few_periods: "Only a few time points",
  flagged_responses_included: "Includes flagged responses",
  small_base: "Very few answers",
} as const;
export type CaveatCode = keyof typeof CAVEATS;

export function ChartCard({
  title,
  answers,
  n,
  caveats = [],
  table,
  children,
  action,
}: {
  title: string;
  answers?: ReactNode;
  n: number;
  caveats?: CaveatCode[];
  table: { head: string[]; rows: (string | number)[][] };
  children: ReactNode;
  action?: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();
  return (
    <section className="chartcard" aria-labelledby={`${id}-t`}>
      <div className="chartcard__head">
        <h3 id={`${id}-t`}>{title}</h3>
        {action}
      </div>
      {answers && <p className="chartcard__answers">{answers}</p>}
      {asTable ? (
        <div className="chartcard__table">
          <table>
            <thead>
              <tr>
                {table.head.map((h, i) => (
                  <th key={h} scope="col" className={i > 0 ? "num" : undefined}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j} className="num">{c}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
      <div className="chartcard__foot">
        <span className="chartcard__n">
          n = {formatCount(n)}
          <ComputedMark />
        </span>
        {caveats.map((c) => (
          <span key={c} className="caveat-chip">
            {CAVEATS[c]}
          </span>
        ))}
        <button type="button" className="chartcard__toggle" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
          <Table size={16} weight="regular" aria-hidden="true" /> {asTable ? "View as chart" : "View as table"}
        </button>
      </div>
    </section>
  );
}

/** Horizontal bars: label on the left, value at the bar's end (DESIGN.md §8.3). */
export function HBars({ rows, unit = "%" }: { rows: BarRow[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.pct));
  return (
    <ul className="hbars">
      {rows.map((r) => (
        <li key={r.label} className="hbars__row">
          <span className="hbars__label">{r.label}</span>
          <span className="hbars__track" aria-hidden="true">
            <i style={{ width: `${(r.pct / max) * 100}%` }} className={r.count === 0 ? "is-zero" : undefined} />
          </span>
          <span className="hbars__value">
            {r.pct}
            {unit} <small>({formatCount(r.count)})</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Columns for counts over time or per question; one may be highlighted, the rest tinted. */
export function Columns({
  bars,
  highlight = null,
  labelEvery = 1,
  describe,
}: {
  bars: { label: string; count: number; tip: string }[];
  highlight?: number | null;
  labelEvery?: number;
  describe: string;
}) {
  const max = Math.max(...bars.map((b) => b.count), 0);
  const top = niceMax(max);
  return (
    <div className="columns" role="group" aria-label={describe}>
      <div className="columns__grid" aria-hidden="true">
        <span data-v={formatCount(top)} />
        <span data-v={formatCount(top / 2)} />
        <span data-v="0" />
      </div>
      <div className="columns__plot">
        {bars.map((b, i) => (
          <div key={`${b.label}-${i}`} className="columns__col">
            <div
              className={`columns__bar ${highlight === null ? "" : i === highlight ? "is-hl" : "is-ctx"}`}
              style={{ height: top ? `${(b.count / top) * 100}%` : 0 }}
              tabIndex={0}
              role="img"
              aria-label={b.tip}
              data-tip={b.tip}
            />
            <span className="columns__x" aria-hidden="true">
              {i % labelEvery === 0 || i === bars.length - 1 ? b.label : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A clean axis top just above the tallest bar (61 → 80, 19 → 20), with a whole-number middle line. */
export function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const step of [pow / 10, pow / 5, pow / 2, pow, pow * 2, pow * 5].filter((s) => s >= 1)) {
    let count = Math.ceil(v / step);
    if (count % 2) count += 1;
    if (count <= 6) return count * step;
  }
  return Math.ceil(v / pow) * pow * 2;
}

const LIKERT_5 = ["#7E3A99", "#C59AD8", "#E3D8C8", "#7FCFC7", "#0F7F7A"];
const LIKERT_4 = ["#7E3A99", "#C59AD8", "#7FCFC7", "#0F7F7A"];
const DARK_FILL = new Set(["#7E3A99", "#0F7F7A"]);

export function likertColors(points: number): string[] {
  if (points === 5) return LIKERT_5;
  if (points === 4) return LIKERT_4;
  if (points === 3) return [LIKERT_5[0], LIKERT_5[2], LIKERT_5[4]];
  // Other lengths: purple side, neutral middle, teal side.
  const mid = (points - 1) / 2;
  return Array.from({ length: points }, (_, i) => (i < mid ? (i < mid / 2 ? LIKERT_5[0] : LIKERT_5[1]) : i === mid ? LIKERT_5[2] : i > points - 1 - mid / 2 ? LIKERT_5[4] : LIKERT_5[3]));
}

/** Diverging Likert: one 100% bar, negative on the left, positive on the right (DESIGN.md §3.5). */
export function LikertBar({ rows, summary }: { rows: BarRow[]; summary: string }) {
  const colors = likertColors(rows.length);
  return (
    <div className="likert">
      <div className="likert__bar" role="img" aria-label={`${summary}. ${rows.map((r) => `${r.label} ${r.pct}%`).join(", ")}`}>
        {rows.map((r, i) =>
          r.pct > 0 ? (
            <span
              key={r.label}
              className="likert__seg"
              style={{ flexGrow: r.pct, background: colors[i], color: DARK_FILL.has(colors[i]) ? "#ffffff" : "#22192e" }}
              data-tip={`${r.label}: ${r.pct}% (${formatCount(r.count)})`}
            >
              {r.pct >= 9 ? `${r.pct}%` : ""}
            </span>
          ) : null,
        )}
      </div>
      <ul className="likert__legend">
        {rows.map((r, i) => (
          <li key={r.label}>
            <i style={{ background: colors[i] }} aria-hidden="true" />
            {r.label}
            <span className="likert__val">{r.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** NPS: the score, the three groups as one bar, and every point 0–10 (DESIGN.md §3.5 colours). */
export function NpsChart({ score, dist, groups }: { score: number; dist: number[]; groups: BarRow[] }) {
  const max = Math.max(1, ...dist);
  const color = (i: number) => (i <= 6 ? LIKERT_5[0] : i <= 8 ? LIKERT_5[2] : LIKERT_5[4]);
  return (
    <div className="nps">
      <div className="nps__score">
        <span className="nps__num">
          {score > 0 ? "+" : ""}
          {score}
        </span>
        <span className="nps__cap">
          Net Promoter Score <ComputedMark />
          <small>% promoters minus % detractors</small>
        </span>
      </div>
      <div className="likert__bar" role="img" aria-label={groups.map((g) => `${g.label} ${g.pct}%`).join(", ")}>
        {groups.map((g, i) =>
          g.pct > 0 ? (
            <span
              key={g.label}
              className="likert__seg"
              style={{ flexGrow: g.pct, background: [LIKERT_5[0], LIKERT_5[2], LIKERT_5[4]][i], color: i === 1 ? "#22192e" : "#ffffff" }}
              data-tip={`${g.label}: ${g.pct}% (${formatCount(g.count)})`}
            >
              {g.pct >= 9 ? `${g.pct}%` : ""}
            </span>
          ) : null,
        )}
      </div>
      <ul className="likert__legend">
        {groups.map((g, i) => (
          <li key={g.label}>
            <i style={{ background: [LIKERT_5[0], LIKERT_5[2], LIKERT_5[4]][i] }} aria-hidden="true" />
            {g.label}
            <span className="likert__val">{g.pct}%</span>
          </li>
        ))}
      </ul>
      <div className="nps__dist" aria-hidden="true">
        {dist.map((c, i) => (
          <div key={i} className="nps__col">
            <span className="nps__bar" style={{ height: `${(c / max) * 100}%`, background: color(i) }} data-tip={`${i}: ${formatCount(c)}`} />
            <span className="nps__x">{i}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A KPI tile (DESIGN.md §8.2): label, number that counts up once, Computed badge, a how-line. */
export function KpiTile({ label, value, format, how }: { label: string; value: number | null; format: (v: number) => string; how: string }) {
  const shown = useCountUp(value ?? 0);
  return (
    <div className="kpi">
      <span className="kpi__label">
        {label}
        <ComputedMark />
      </span>
      <span className="kpi__value">{value === null ? "–" : format(shown)}</span>
      <span className="kpi__how">{how}</span>
    </div>
  );
}

/** Counts up over 800ms the first time only; later changes (a filter) show straight away. */
function useCountUp(target: number): number {
  const [anim, setAnim] = useState<number | null>(() =>
    typeof window !== "undefined" && target > 0 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : null,
  );
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let raf = 0;
    const start = performance.now();
    const end = target;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 800);
      setAnim(p < 1 ? end * (1 - Math.pow(1 - p, 3)) : null);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setAnim(null);
    };
  }, [target]);
  return anim ?? target;
}
