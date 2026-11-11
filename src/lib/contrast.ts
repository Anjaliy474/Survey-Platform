/** WCAG contrast helpers for custom Player themes (DESIGN.md §3.6: checked in code, 4.5:1 minimum). */

const INK = "#22192e";
const WHITE = "#ffffff";

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Ink or white, whichever reads better on this colour. */
export function bestText(bg: string): string {
  return contrast(bg, INK) >= contrast(bg, WHITE) ? INK : WHITE;
}

const toHex = (rgb: number[]) => `#${rgb.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("")}`;

/** The nearest shade of `color` (darker, or lighter on dark text) that reaches 4.5:1 against `against`. */
export function nearestPassing(color: string, against: string, target = 4.5): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  if (contrast(color, against) >= target) return toHex(rgb);
  const darken = luminance(against) > 0.5;
  for (let step = 1; step <= 40; step++) {
    const f = darken ? 1 - step * 0.025 : step * 0.025;
    const next = darken ? rgb.map((c) => c * f) : rgb.map((c) => c + (255 - c) * f);
    if (contrast(toHex(next), against) >= target) return toHex(next);
  }
  return darken ? INK : WHITE;
}

export type CustomTheme = { bg: string; text: string; button: string; buttonText: string; link: string };

export type ThemeCheck = {
  theme: CustomTheme;
  ok: boolean;
  /** The button colour was nudged so its label stays readable. */
  adjusted: boolean;
  ratios: { text: number; button: number; link: number };
};

/**
 * Build a custom theme from two colours. Text and button text are chosen automatically, the
 * button is nudged until its label passes, and coloured text on the page (links, the "Got it"
 * line) gets its own shade of the button colour that passes against the background.
 */
export function customTheme(bg: string, button: string): ThemeCheck {
  const text = bestText(bg);
  let buttonText = bestText(button);
  let btn = button.toLowerCase();
  if (contrast(btn, buttonText) < 4.5) {
    btn = nearestPassing(button, buttonText);
    buttonText = bestText(btn);
  }
  const link = nearestPassing(btn, bg);
  const ratios = { text: contrast(bg, text), button: contrast(btn, buttonText), link: contrast(link, bg) };
  return {
    theme: { bg, text, button: btn, buttonText, link },
    ok: Math.min(ratios.text, ratios.button, ratios.link) >= 4.5,
    adjusted: btn !== button.toLowerCase(),
    ratios,
  };
}
