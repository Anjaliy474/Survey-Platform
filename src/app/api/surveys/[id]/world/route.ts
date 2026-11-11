import { buildWorldRoute, editWorld } from "@/lib/api/handlers";
import { respond } from "@/lib/api/http";

export const maxDuration = 60;
export const POST = (req: Request, ctx: RouteContext<"/api/surveys/[id]/world">) => respond(buildWorldRoute, req, ctx.params);
export const PATCH = (req: Request, ctx: RouteContext<"/api/surveys/[id]/world">) => respond(editWorld, req, ctx.params);
