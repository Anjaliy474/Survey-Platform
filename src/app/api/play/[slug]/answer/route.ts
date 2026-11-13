import { playAnswer } from "@/lib/api/handlers";
import { respond } from "@/lib/api/http";

export const POST = (req: Request, ctx: RouteContext<"/api/play/[slug]/answer">) => respond(playAnswer, req, ctx.params);
