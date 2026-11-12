import { describe, expect, it } from "vitest";
import { AnswerQueue } from "./answer-queue";
import type { Answer } from "./types";

type Sent = { questionId: string; answer: Answer };

/** A send function whose calls resolve only when the test says so. */
function controlledSend() {
  const sent: Sent[] = [];
  const waiting: ((r: "ok" | "retry") => void)[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const send = (item: Sent) => {
    sent.push(item);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    return new Promise<"ok" | "retry">((resolve) =>
      waiting.push((r) => {
        inFlight -= 1;
        resolve(r);
      }),
    );
  };
  const settle = async (r: "ok" | "retry" = "ok") => {
    const next = waiting.shift();
    next?.(r);
    await new Promise((res) => setTimeout(res, 0));
  };
  return { sent, send, settle, get maxInFlight() {
    return maxInFlight;
  } };
}

describe("AnswerQueue", () => {
  it("sends a second question answered while the first is in flight", async () => {
    const c = controlledSend();
    const q = new AnswerQueue(c.send);
    q.set("Q1", 0);
    q.set("Q2", 3);
    await c.settle();
    await c.settle();
    expect(c.sent.map((s) => s.questionId)).toEqual(["Q1", "Q2"]);
    expect(q.size).toBe(0);
    expect(c.maxInFlight).toBe(1);
  });

  it("sends the newest value when an answer changes mid-flight", async () => {
    const c = controlledSend();
    const q = new AnswerQueue(c.send);
    q.set("Q1", 0);
    q.set("Q1", 2);
    await c.settle();
    await c.settle();
    expect(c.sent).toEqual([
      { questionId: "Q1", answer: 0 },
      { questionId: "Q1", answer: 2 },
    ]);
    expect(q.size).toBe(0);
  });

  it("coalesces fast typing into the first and the last value", async () => {
    const c = controlledSend();
    const q = new AnswerQueue(c.send);
    q.set("Q6", "h");
    q.set("Q6", "he");
    q.set("Q6", "hel");
    await c.settle();
    await c.settle();
    expect(c.sent.map((s) => s.answer)).toEqual(["h", "hel"]);
  });

  it("keeps answers and reports not drained when a send fails", async () => {
    const c = controlledSend();
    const q = new AnswerQueue(c.send);
    q.set("Q1", 1);
    const drained = q.flush();
    await c.settle("retry");
    expect(await drained).toBe(false);
    expect(q.size).toBe(1);
    const retry = q.flush();
    await c.settle("ok");
    expect(await retry).toBe(true);
    expect(q.size).toBe(0);
  });

  it("treats a throwing send as a retry", async () => {
    const q = new AnswerQueue(() => Promise.reject(new Error("offline")));
    q.set("Q1", 1);
    expect(await q.flush()).toBe(false);
    expect(q.size).toBe(1);
  });

  it("restores and persists pending answers", async () => {
    let saved: [string, Answer][] = [];
    const c = controlledSend();
    const q = new AnswerQueue(c.send, (items) => (saved = items), [["Q3", [1, 2]]]);
    expect(q.size).toBe(1);
    q.set("Q4", 0);
    expect(saved).toEqual([
      ["Q3", [1, 2]],
      ["Q4", 0],
    ]);
  });
});
