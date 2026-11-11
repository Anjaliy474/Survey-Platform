import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Answer, ResponseRecord, StoryEvent, Survey } from "@/lib/survey/types";
import { NotFoundError, type SurveyStore } from "./store";

type SurveyRow = { id: string; slug: string; status: string; body: Survey; created_at: string; published_at: string | null };
type ResponseRow = {
  id: string;
  survey_id: string;
  arm: "story" | "plain";
  switched_to_plain: boolean;
  answers: Record<string, Answer>;
  enjoyment: number | null;
  visitor_id: string;
  started_at: string;
  completed_at: string | null;
};

const toResponse = (r: ResponseRow): ResponseRecord => ({
  id: r.id,
  surveyId: r.survey_id,
  arm: r.arm,
  switchedToPlain: r.switched_to_plain,
  answers: r.answers ?? {},
  enjoyment: r.enjoyment,
  visitorId: r.visitor_id,
  startedAt: r.started_at,
  completedAt: r.completed_at,
});

/** Production store over the tables in supabase/migrations/0001_story_mode.sql (server-only, service role). */
export class SupabaseStore implements SurveyStore {
  private db: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false } });
  }

  private row(s: Survey): SurveyRow {
    return { id: s.id, slug: s.slug, status: s.status, body: s, created_at: s.createdAt, published_at: s.publishedAt };
  }

  async createSurvey(s: Survey) {
    const { error } = await this.db.from("surveys").insert(this.row(s));
    if (error) throw error;
    return s;
  }
  async getSurvey(id: string) {
    const { data, error } = await this.db.from("surveys").select("body").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data?.body as Survey | undefined) ?? null;
  }
  async getSurveyBySlug(slug: string) {
    const { data, error } = await this.db.from("surveys").select("body").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return (data?.body as Survey | undefined) ?? null;
  }
  async listSurveys() {
    const { data, error } = await this.db.from("surveys").select("body").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((d) => d.body as Survey);
  }
  async updateSurvey(id: string, patch: Partial<Survey>) {
    const current = await this.getSurvey(id);
    if (!current) throw new NotFoundError(`Survey ${id} not found`);
    const next = { ...current, ...patch, id };
    const { error } = await this.db.from("surveys").update(this.row(next)).eq("id", id);
    if (error) throw error;
    return next;
  }
  async startResponse(r: ResponseRecord) {
    const { error } = await this.db.from("responses").insert({
      id: r.id,
      survey_id: r.surveyId,
      arm: r.arm,
      switched_to_plain: r.switchedToPlain,
      answers: r.answers,
      enjoyment: r.enjoyment,
      visitor_id: r.visitorId,
      started_at: r.startedAt,
      completed_at: r.completedAt,
    });
    if (error) throw error;
    return r;
  }
  async getResponse(id: string) {
    const { data, error } = await this.db.from("responses").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toResponse(data as ResponseRow) : null;
  }
  async saveAnswer(responseId: string, questionId: string, answer: Answer) {
    const current = await this.getResponse(responseId);
    if (!current) throw new NotFoundError(`Response ${responseId} not found`);
    const { error } = await this.db
      .from("responses")
      .update({ answers: { ...current.answers, [questionId]: answer } })
      .eq("id", responseId);
    if (error) throw error;
  }
  async markSwitched(responseId: string) {
    const { error } = await this.db.from("responses").update({ switched_to_plain: true }).eq("id", responseId);
    if (error) throw error;
  }
  async completeResponse(responseId: string, enjoyment: number | null) {
    const { error } = await this.db
      .from("responses")
      .update({ completed_at: new Date().toISOString(), enjoyment })
      .eq("id", responseId)
      .is("completed_at", null);
    if (error) throw error;
    const r = await this.getResponse(responseId);
    if (!r) throw new NotFoundError(`Response ${responseId} not found`);
    return r;
  }
  async listResponses(surveyId: string) {
    const { data, error } = await this.db.from("responses").select("*").eq("survey_id", surveyId);
    if (error) throw error;
    return (data ?? []).map((d) => toResponse(d as ResponseRow));
  }
  async logEvent(e: StoryEvent) {
    const { error } = await this.db
      .from("events")
      .insert({ survey_id: e.surveyId, response_id: e.responseId, type: e.type, data: e.data ?? {}, at: e.at });
    if (error) throw error;
  }
}
