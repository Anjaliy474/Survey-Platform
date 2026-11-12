import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Answer, ResponseRecord, StoryEvent, Survey } from "@/lib/survey/types";
import { NotFoundError, type SurveyStore } from "./store";

type Data = { surveys: Survey[]; responses: ResponseRecord[]; events: StoryEvent[] };

/** Development store: one JSON file, writes serialised through a promise queue. */
export class LocalStore implements SurveyStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private file: string) {}

  private async read(): Promise<Data> {
    try {
      return JSON.parse(await readFile(this.file, "utf8")) as Data;
    } catch {
      return { surveys: [], responses: [], events: [] };
    }
  }

  private mutate<T>(fn: (d: Data) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.read();
      const result = fn(data);
      await mkdir(path.dirname(this.file), { recursive: true });
      await writeFile(this.file, JSON.stringify(data, null, 2));
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async view<T>(fn: (d: Data) => T): Promise<T> {
    await this.queue;
    return fn(await this.read());
  }

  createSurvey(s: Survey) {
    return this.mutate((d) => {
      d.surveys.push(s);
      return s;
    });
  }
  getSurvey(id: string) {
    return this.view((d) => d.surveys.find((s) => s.id === id) ?? null);
  }
  getSurveyBySlug(slug: string) {
    return this.view((d) => d.surveys.find((s) => s.slug === slug) ?? null);
  }
  listSurveys() {
    return this.view((d) => [...d.surveys].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
  updateSurvey(id: string, patch: Partial<Survey>) {
    return this.mutate((d) => {
      const i = d.surveys.findIndex((s) => s.id === id);
      if (i < 0) throw new NotFoundError(`Survey ${id} not found`);
      d.surveys[i] = { ...d.surveys[i], ...patch, id };
      return d.surveys[i];
    });
  }
  startResponse(r: ResponseRecord) {
    return this.mutate((d) => {
      d.responses.push(r);
      return r;
    });
  }
  getResponse(id: string) {
    return this.view((d) => d.responses.find((r) => r.id === id) ?? null);
  }
  private withResponse<T>(id: string, fn: (r: ResponseRecord) => T) {
    return this.mutate((d) => {
      const r = d.responses.find((x) => x.id === id);
      if (!r) throw new NotFoundError(`Response ${id} not found`);
      return fn(r);
    });
  }
  async saveAnswer(responseId: string, questionId: string, answer: Answer) {
    await this.withResponse(responseId, (r) => {
      r.answers[questionId] = answer;
    });
  }
  async markSwitched(responseId: string) {
    await this.withResponse(responseId, (r) => {
      r.switchedToPlain = true;
    });
  }
  completeResponse(responseId: string, enjoyment: number | null) {
    return this.withResponse(responseId, (r) => {
      if (!r.completedAt) r.completedAt = new Date().toISOString();
      if (r.enjoyment === null && enjoyment !== null) r.enjoyment = enjoyment;
      return { ...r };
    });
  }
  listResponses(surveyId: string) {
    return this.view((d) => d.responses.filter((r) => r.surveyId === surveyId));
  }
  async logEvent(e: StoryEvent) {
    await this.mutate((d) => {
      d.events.push(e);
    });
  }
}
