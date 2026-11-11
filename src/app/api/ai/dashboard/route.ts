import { demoDashboard } from "@/lib/ai/demo-dashboard";
import type { DashboardRequest } from "@/lib/ai/types";
import { enforceRules } from "@/lib/results/dashboard";

/**
 * POST /api/ai/dashboard: dashboard_spec (AI; demo stand-in) on the dataset's structure only,
 * then code's own rules pass (no personal fields, no pies, lines need 5 periods, at most 8).
 */
export async function POST(request: Request) {
  let body: DashboardRequest;
  try {
    body = (await request.json()) as DashboardRequest;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const valid =
    body &&
    (body.mode === "create" || body.mode === "edit") &&
    typeof body.request === "string" &&
    body.request.length <= 500 &&
    Array.isArray(body.schema?.fields) &&
    typeof body.schema?.date_periods_available === "number";
  if (!valid) return Response.json({ error: "bad_request" }, { status: 400 });

  const spec = demoDashboard(body);
  const { dashboard, notes } = enforceRules(spec.dashboard, body.schema.fields, body.schema.date_periods_available);
  return Response.json({ engine: "demo", spec: { ...spec, dashboard }, codeNotes: notes }, { headers: { "Cache-Control": "no-store" } });
}
