import { playComplete } from "@/lib/api/handlers";
import { respond } from "@/lib/api/http";

export const POST = (req: Request, ctx: RouteContext<"/api/play/[slug]/complete">) => respond(playComplete, req, ctx.params);
