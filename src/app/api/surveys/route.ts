import { createSurvey, listSurveys } from "@/lib/api/handlers";
import { respond } from "@/lib/api/http";

export const maxDuration = 60;
export const GET = (req: Request) => respond(listSurveys, req);
export const POST = (req: Request) => respond(createSurvey, req);
