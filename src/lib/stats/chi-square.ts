/** Pearson chi-square test of independence and Holm correction, for the story vs plain answer-shift alarm. */

function gammaLn(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const v of c) ser += v / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Regularised upper incomplete gamma Q(a, x) (Numerical Recipes gammq). */
function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  if (x < a + 1) {
    let sum = 1 / a;
    let del = sum;
    let ap = a;
    for (let n = 0; n < 500; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - gammaLn(a));
  }
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return Math.exp(-x + a * Math.log(x) - gammaLn(a)) * h;
}

export function chiSquare(table: number[][]): { statistic: number; df: number; p: number } | null {
  if (table.length < 2) return null;
  const cols = table[0].map((_, j) => j).filter((j) => table.some((row) => row[j] > 0));
  const t = table.map((row) => cols.map((j) => row[j]));
  const rowTotals = t.map((row) => row.reduce((s, v) => s + v, 0));
  if (cols.length < 2 || rowTotals.some((r) => r === 0)) return null;
  const colTotals = cols.map((_, j) => t.reduce((s, row) => s + row[j], 0));
  const total = rowTotals.reduce((s, v) => s + v, 0);
  let statistic = 0;
  t.forEach((row, i) =>
    row.forEach((obs, j) => {
      const exp = (rowTotals[i] * colTotals[j]) / total;
      statistic += ((obs - exp) * (obs - exp)) / exp;
    }),
  );
  const df = (t.length - 1) * (cols.length - 1);
  return { statistic, df, p: gammaQ(df / 2, statistic / 2) };
}

/** Holm–Bonferroni step-down adjustment; returns adjusted p-values in the input order. */
export function holm(pValues: number[]): number[] {
  const m = pValues.length;
  const order = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const adjusted = new Array<number>(m);
  let running = 0;
  order.forEach(({ p, i }, rank) => {
    running = Math.max(running, Math.min(1, (m - rank) * p));
    adjusted[i] = running;
  });
  return adjusted;
}
