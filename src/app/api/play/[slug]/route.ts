import { playStart } from "@/lib/api/handlers";
import { respond } from "@/lib/api/http";

export const POST = (req: Request, ctx: RouteContext<"/api/play/[slug]">) => respond(playStart, req, ctx.params);
