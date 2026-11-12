import type { Answer } from "./types";

type SendResult = "ok" | "retry";
type Send = (item: { questionId: string; answer: Answer }) => Promise<SendResult>;

/**
 * The respondent's outgoing answers. One send at a time (no racing requests), the newest
 * value per question always goes last, fast typing coalesces, and nothing is dropped
 * until the server has it. `flush()` resolves true only when everything is sent.
 */
export class AnswerQueue {
  private pending = new Map<string, Answer>();
  private running: Promise<boolean> | null = null;

  constructor(
    private send: Send,
    private persist: (items: [string, Answer][]) => void = () => undefined,
    initial: [string, Answer][] = [],
  ) {
    for (const [q, a] of initial) this.pending.set(q, a);
  }

  get size(): number {
    return this.pending.size;
  }

  entries(): [string, Answer][] {
    return [...this.pending.entries()];
  }

  set(questionId: string, answer: Answer): void {
    this.pending.delete(questionId);
    this.pending.set(questionId, answer);
    this.persist(this.entries());
    void this.flush();
  }

  flush(): Promise<boolean> {
    if (this.running) {
      // Wait for the current pass, then make sure anything added meanwhile goes too.
      return this.running.then((ok) => (ok && this.pending.size ? this.flush() : ok && this.pending.size === 0));
    }
    this.running = (async () => {
      while (this.pending.size) {
        const [questionId, answer] = this.pending.entries().next().value as [string, Answer];
        let result: SendResult;
        try {
          result = await this.send({ questionId, answer });
        } catch {
          result = "retry";
        }
        if (result === "retry") return false;
        // Only clear it if nobody changed the answer while it was on its way.
        if (this.pending.get(questionId) === answer) this.pending.delete(questionId);
        this.persist(this.entries());
      }
      return true;
    })().finally(() => {
      this.running = null;
    });
    return this.running;
  }
}
