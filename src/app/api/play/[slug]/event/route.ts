import { playEvent } from "@/lib/api/handlers";
import { respond } from "@/lib/api/http";

export const POST = (req: Request, ctx: RouteContext<"/api/play/[slug]/event">) => respond(playEvent, req, ctx.params);
