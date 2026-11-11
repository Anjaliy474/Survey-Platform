"use client";

import { formatCount } from "@/lib/compute";
import type { ChartData } from "@/lib/results/dashboard";
import { Columns, likertColors, niceMax } from "./charts";

/** Categorical order validated for colour-blind separation (teal, persimmon, blue, gold, purple). */
export const SERIES = ["#14A39A", "#F0643C", "#4C6EF5", "#C98A00", "#A855C7"];
const OTHER = "#8A8296";

export function DashChartBody({ data }: { data: ChartData }) {
  switch (data.kind) {
    case "empty":
      return <p className="dash-empty">{data.reason}</p>;
    case "kpi":
      return (
        <div className="dash-kpi">
          <span className="dash-kpi__value">{data.value}</span>
          <span className="dash-kpi__sub">{data.sub}</span>
        </div>
      );
    case "columns":
      return <Columns bars={data.bars} describe="Responses per day" labelEvery={data.bars.length > 10 ? 3 : 1} />;
    case "line":
      return <LineChart points={data.points} />;
    case "bars":
      return <DashBars data={data} />;
    case "grouped":
      return <Grouped data={data} />;
    case "stacked":
      return <Stacked data={data} />;
  }
}

function DashBars({ data }: { data: Extract<ChartData, { kind: "bars" }> }) {
  const signed = data.unit === "score";
  const max = data.unit === "%" ? data.max : (data.scaleMax ?? data.max);
  return (
    <ul className={`dbars ${signed ? "dbars--signed" : ""}`}>
      {data.bars.map((b) => {
        const w = signed ? (Math.abs(b.value) / 100) * 50 : (b.value / Math.max(1, max)) * 100;
        return (
          <li key={b.label} className="dbars__row">
            <span className="dbars__label">
              {b.label}
              {data.unit !== "%" && <small> n = {formatCount(b.n)}</small>}
            </span>
            <span className="dbars__track" aria-hidden="true">
              {signed && <i className="dbars__zero" />}
              <i
                className={`dbars__bar ${b.small ? "is-small" : ""} ${signed && b.value < 0 ? "is-neg" : ""}`}
                style={signed ? { width: `${w}%`, left: b.value < 0 ? `${50 - w}%` : "50%" } : { width: `${w}%` }}
                data-tip={`${b.label}: ${b.display} · n = ${formatCount(b.n)}`}
              />
              {b.ci && (
                <i className="dbars__ci" style={{ left: `${(b.ci[0] / Math.max(1, max)) * 100}%`, width: `${((b.ci[1] - b.ci[0]) / Math.max(1, max)) * 100}%` }} />
              )}
            </span>
            <span className="dbars__value">{b.display}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Grouped({ data }: { data: Extract<ChartData, { kind: "grouped" }> }) {
  // More than 5 series fold into "Other" colour; the legend and table still name each one.
  const colorOf = (i: number) => SERIES[i] ?? OTHER;
  return (
    <div className="grouped">
      <ul className="likert__legend">
        {data.series.map((s, i) => (
          <li key={s.label}>
            <i style={{ background: colorOf(i) }} aria-hidden="true" />
            {s.label} <span className="muted">n = {formatCount(s.n)}</span>
          </li>
        ))}
      </ul>
      <ul className="grouped__cats">
        {data.categories.map((cat, ci) => (
          <li key={cat}>
            <span className="grouped__cat">{cat}</span>
            {data.series.map((s, si) => (
              <span key={s.label} className="grouped__row">
                <span className="grouped__track" aria-hidden="true">
                  <i
                    className={s.small ? "is-small" : undefined}
                    style={{ width: `${data.values[ci][si]}%`, background: colorOf(si) }}
                    data-tip={`${s.label}: ${data.values[ci][si]}% · n = ${formatCount(s.n)}`}
                  />
                </span>
                <span className="grouped__val">{data.values[ci][si]}%</span>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stacked({ data }: { data: Extract<ChartData, { kind: "stacked" }> }) {
  const colors = data.diverging ? likertColors(data.parts.length) : data.parts.map((_, i) => SERIES[i] ?? OTHER);
  const dark = new Set(["#7E3A99", "#0F7F7A", "#4C6EF5", "#A855C7"]);
  const half = Math.floor(data.parts.length / 2);
  const mid = data.parts.length % 2 ? half : -1;
  // Diverging: line every row up on the neutral middle, negatives to the left.
  const left = (r: { pcts: number[] }) => r.pcts.slice(0, half).reduce((a, b) => a + b, 0) + (mid >= 0 ? r.pcts[mid] / 2 : 0);
  const maxLeft = data.diverging ? Math.max(...data.rows.map(left)) : 0;
  const maxRight = data.diverging ? Math.max(...data.rows.map((r) => 100 - left(r))) : 100;
  const scale = data.diverging ? 100 / (maxLeft + maxRight) : 1;
  return (
    <div className="stacked">
      <ul className="stacked__rows">
        {data.rows.map((r) => (
          <li key={r.label}>
            <span className="stacked__label">
              {r.label} <small>n = {formatCount(r.n)}</small>
            </span>
            <span className={`stacked__bar ${data.diverging ? "is-diverging" : ""}`} role="img" aria-label={`${r.label}: ${data.parts.map((p, i) => `${p} ${r.pcts[i]}%`).join(", ")}`}>
              {data.diverging && <span style={{ flexGrow: 0, flexBasis: `${(maxLeft - left(r)) * scale}%` }} />}
              {r.pcts.map((p, i) =>
                p > 0 ? (
                  <span
                    key={data.parts[i]}
                    className={`stacked__seg ${r.small ? "is-small" : ""}`}
                    style={{ flexBasis: `${p * scale}%`, background: colors[i], color: dark.has(colors[i]) ? "#ffffff" : "#22192e" }}
                    data-tip={`${data.parts[i]}: ${p}% (${formatCount(r.counts[i])})`}
                  >
                    {p * scale >= 9 ? `${p}%` : ""}
                  </span>
                ) : null,
              )}
            </span>
          </li>
        ))}
      </ul>
      <ul className="likert__legend">
        {data.parts.map((p, i) => (
          <li key={p}>
            <i style={{ background: colors[i] }} aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LineChart({ points }: { points: { label: string; value: number }[] }) {
  const W = 600;
  const H = 200;
  const pad = { l: 34, r: 12, t: 12, b: 24 };
  const max = niceMax(Math.max(...points.map((p) => p.value), 0));
  const x = (i: number) => pad.l + (i / Math.max(1, points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const every = Math.ceil(points.length / 7);
  return (
    <svg className="line" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Responses per day: ${points.map((p) => `${p.label} ${p.value}`).join(", ")}`}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} className="line__grid" />
          <text x={0} y={y(max * f) + 4} className="line__tick">
            {Math.round(max * f)}
          </text>
        </g>
      ))}
      <polyline points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} className="line__path" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={5} className="line__dot">
            <title>{`${p.label}: ${p.value}`}</title>
          </circle>
          {(i % every === 0 || i === points.length - 1) && (
            <text x={x(i)} y={H - 6} textAnchor="middle" className="line__tick">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
