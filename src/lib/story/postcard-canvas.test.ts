import { describe, expect, it, vi } from "vitest";
import { POSTCARD_SIZE, drawPostcard, postcardFileName } from "./postcard-canvas";

function mockCtx() {
  const texts: string[] = [];
  const noop = () => undefined;
  const gradient = { addColorStop: noop };
  const ctx = {
    fillText: vi.fn((t: string) => texts.push(t)),
    fillRect: noop,
    beginPath: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    roundRect: noop,
    setLineDash: noop,
    createLinearGradient: () => gradient,
    measureText: (t: string) => ({ width: t.length * 10 }),
    set fillStyle(_v: unknown) {},
    set strokeStyle(_v: unknown) {},
    set lineWidth(_v: number) {},
    set font(_v: string) {},
    set textAlign(_v: string) {},
    set globalAlpha(_v: number) {},
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

const colors = { top: "#2b2350", bottom: "#c96f4a", accent: "#ffc233", glow: "#ffe3a1", text: "#ffffff" };

describe("postcardFileName", () => {
  it("kebab-cases the title", () => {
    expect(postcardFileName("Fest Night Trail")).toBe("fest-night-trail-postcard.png");
    expect(postcardFileName("My Sunday Shift!")).toBe("my-sunday-shift-postcard.png");
  });
});

describe("drawPostcard", () => {
  it("draws the title, every chapter and the thanks line, and nothing else", () => {
    const { ctx, texts } = mockCtx();
    drawPostcard(ctx, { title: "My Fest Night Trail", chapters: ["The Gate", "Food Street", "Main Stage"], colors });
    expect(texts).toContain("My Fest Night Trail");
    expect(texts).toContain("The Gate");
    expect(texts).toContain("Food Street");
    expect(texts).toContain("Main Stage");
    expect(texts).toContain("Thanks for taking part");
    const allowed = new Set(["My Fest Night Trail", "The Gate", "Food Street", "Main Stage", "Thanks for taking part", "PlaySurvey"]);
    expect(texts.every((t) => allowed.has(t))).toBe(true);
  });

  it("has a fixed size", () => {
    expect(POSTCARD_SIZE).toEqual({ width: 1080, height: 1350 });
  });
});
