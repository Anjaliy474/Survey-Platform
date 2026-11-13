import { getSurvey, patchSurvey } from "@/lib/api/handlers";
import { respond } from "@/lib/api/http";

export const maxDuration = 60;
export const GET = (req: Request, ctx: RouteContext<"/api/surveys/[id]">) => respond(getSurvey, req, ctx.params);
export const PATCH = (req: Request, ctx: RouteContext<"/api/surveys/[id]">) => respond(patchSurvey, req, ctx.params, { ai: true });
