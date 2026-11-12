/** WCAG 2.1 contrast helpers for creator brand colours (DESIGN.md §3.6). */

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** The nearest shade of `brand` (by HSL lightness, 2% steps) that reaches `min` contrast on `against`. */
export function passingShade(brand: string, against: string, min = 4.5): string {
  if (contrastRatio(brand, against) >= min) return brand;
  const [h, s, l] = toHsl(brand);
  const darker = luminance(against) > 0.18;
  for (let step = 1; step <= 50; step++) {
    const next = Math.min(1, Math.max(0, l + (darker ? -0.02 : 0.02) * step));
    const candidate = fromHsl(h, s, next);
    if (contrastRatio(candidate, against) >= min) return candidate;
  }
  return darker ? "#000000" : "#ffffff";
}

const SENSITIVE = /\b(health|mental|money|salary|income|workplace|manager|identity|religion|caste)\b/i;

/** A reminder only: the brief's words never block Story Mode on their own (spec §5.2). */
export function sensitiveBriefHint(concept: string): boolean {
  return SENSITIVE.test(concept);
}
