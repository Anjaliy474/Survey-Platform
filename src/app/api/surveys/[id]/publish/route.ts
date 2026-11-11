import { publish } from "@/lib/api/handlers";
import { respond } from "@/lib/api/http";

export const POST = (req: Request, ctx: RouteContext<"/api/surveys/[id]/publish">) => respond(publish, req, ctx.params);
