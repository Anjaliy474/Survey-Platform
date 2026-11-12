/**
 * A sliding-window limit per key (the caller's IP). In memory, so it's per server instance:
 * enough to stop one visitor from draining the free Gemini quota during a demo.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private limit: number,
    private windowMs: number,
    private now: () => number = Date.now,
  ) {}

  allow(key: string): boolean {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((at) => t - at < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(t);
    this.hits.set(key, recent);
    return true;
  }
}

/** Requests that may call Gemini: 12 a minute per visitor. */
export const aiLimiter = new RateLimiter(12, 60_000);
