import { results } from "@/lib/api/handlers";
import { respond } from "@/lib/api/http";

export const GET = (req: Request, ctx: RouteContext<"/api/surveys/[id]/results">) => respond(results, req, ctx.params);
