/**
 * The journey postcard (spec §6): world title, the route walked and a thank-you line.
 * It never shows answers, so it can be shared without revealing anything.
 */

export const POSTCARD_SIZE = { width: 1080, height: 1350 } as const;

export type PostcardColors = { top: string; bottom: string; accent: string; glow: string; text: string };

export function postcardFileName(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "playsurvey"}-postcard.png`;
}

export function drawPostcard(
  ctx: CanvasRenderingContext2D,
  data: { title: string; chapters: string[]; colors: PostcardColors },
): void {
  const { width: W, height: H } = POSTCARD_SIZE;
  const { colors } = data;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, colors.top);
  sky.addColorStop(1, colors.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Scattered glow dots.
  ctx.fillStyle = colors.glow;
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.25 + (i % 4) * 0.12;
    ctx.beginPath();
    ctx.arc((i * 263) % W, (i * 149) % (H * 0.55), 3 + (i % 3) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The route: one stop per chapter along a gentle curve.
  const n = Math.max(1, data.chapters.length);
  const stops = data.chapters.map((_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return { x: 160 + t * (W - 320), y: 820 - Math.sin(t * Math.PI) * 180 };
  });
  ctx.strokeStyle = colors.glow;
  ctx.lineWidth = 8;
  ctx.setLineDash([4, 26]);
  ctx.beginPath();
  stops.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = "center";
  stops.forEach((p, i) => {
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.font = "600 34px Figtree, system-ui, sans-serif";
    ctx.fillText(data.chapters[i], p.x, p.y + (i % 2 ? -50 : 70));
  });

  ctx.fillStyle = colors.text;
  ctx.font = "800 88px 'Plus Jakarta Sans', Figtree, system-ui, sans-serif";
  ctx.fillText(data.title, W / 2, 300);
  ctx.font = "600 44px Figtree, system-ui, sans-serif";
  ctx.fillText("Thanks for taking part", W / 2, 380);
  ctx.globalAlpha = 0.7;
  ctx.font = "600 30px Figtree, system-ui, sans-serif";
  ctx.fillText("PlaySurvey", W / 2, H - 80);
  ctx.globalAlpha = 1;
}
