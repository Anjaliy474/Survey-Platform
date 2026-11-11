import { connection } from "next/server";
import { getStore } from "@/lib/store";
import type { Result } from "./handlers";

type Handler = (store: ReturnType<typeof getStore>, input: unknown, params: Record<string, string>) => Promise<Result>;

/** Runs a handler for a route file: reads the JSON body (if any) and the async params. */
export async function respond(handler: Handler, req: Request, params: Promise<Record<string, string>> | Record<string, string> = {}) {
  await connection();
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
