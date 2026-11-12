import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  it("allows up to the limit per key in a window, then blocks", () => {
    const now = 0;
    const rl = new RateLimiter(3, 60_000, () => now);
    expect([rl.allow("a"), rl.allow("a"), rl.allow("a"), rl.allow("a")]).toEqual([true, true, true, false]);
    expect(rl.allow("b")).toBe(true);
  });

  it("frees capacity once old requests leave the window", () => {
    let now = 0;
    const rl = new RateLimiter(2, 60_000, () => now);
    rl.allow("a");
    rl.allow("a");
    expect(rl.allow("a")).toBe(false);
    now = 60_001;
    expect(rl.allow("a")).toBe(true);
  });
});
