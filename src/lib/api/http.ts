import { connection } from "next/server";
import { getStore } from "@/lib/store";
import type { Result } from "./handlers";
import { aiLimiter } from "./rate-limit";

type Handler = (store: ReturnType<typeof getStore>, input: unknown, params: Record<string, string>) => Promise<Result>;

/** Runs a handler for a route file: reads the JSON body (if any) and the async params. */
export async function respond(
  handler: Handler,
  req: Request,
  params: Promise<Record<string, string>> | Record<string, string> = {},
  opts: { ai?: boolean } = {},
) {
  await connection();
  if (opts.ai) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
    if (!aiLimiter.allow(ip)) {
      return Response.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
    }
  }
  let input: unknown = {};
  if (req.method !== "GET" && req.headers.get("content-type")?.includes("application/json")) {
    try {
      input = await req.json();
    } catch {
      return Response.json({ error: "The request body isn't valid JSON." }, { status: 400 });
    }
  }
  const { status, body } = await handler(getStore(), input, await params);
  return Response.json(body, { status });
}
