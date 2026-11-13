"use client";

import { ArrowsClockwise, DeviceMobile, X } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PlayerApp } from "@/app/s/[slug]/PlayerApp";
import { AiWorkingPanel } from "@/components/studio/AiWorkingPanel";
import { StoryStepRail } from "@/components/studio/StoryStepRail";
import { studioApi, surveyStep } from "@/components/studio/api";
import { loadTemplate, type StoryTemplate } from "@/components/story/template-api";
import { Badge } from "@/components/ui/Badge";
import { CATALOGUE } from "@/lib/story/catalogue";
import { LIMITS, validateWorld, wordCount, type ValidationFailure } from "@/lib/story/validate-world";
import { toPublic } from "@/lib/survey/public";
import { formatAbout, storySeconds } from "@/lib/survey/timing";
import type { Survey, WorldSpec } from "@/lib/survey/types";
import { IntegrityPanel } from "./IntegrityPanel";

function Counter({ text, limit }: { text: string; limit: number }) {
  const n = wordCount(text);
  return (
    <span className="s-help" style={{ color: n > limit ? "var(--ps-danger)" : undefined }}>
      {n}/{limit} words
    </span>
  );
}

/** Story step: world card, storyboard, integrity panel and phone preview (spec §5.4–5.7). */
export function StoryStudio({ id }: { id: string }) {
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [world, setWorld] = useState<WorldSpec | null>(null);
  const [template, setTemplate] = useState<StoryTemplate | null>(null);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<null | "story" | "plain">(null);

  async function build() {
    setBusy("Building the story world");
    setError("");
    const r = await studioApi.buildWorld(id);
    setBusy("");
    if (!r.ok) return setError(r.error);
    setSurvey(r.data.survey);
    setWorld(r.data.survey.world);
    setDirty(false);
  }

  useEffect(() => {
    void studioApi.get(id).then((r) => {
      if (!r.ok) return setError(r.error);
      const s = r.data.survey;
      if (!s.questionsApproved) return router.replace(`/studio/s/${id}/questions`);
      if (r.data.storyBlocked) return router.replace(`/studio/s/${id}/publish`);
      setSurvey(s);
      setWorld(s.world);
      if (!s.world) void build();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (world) void loadTemplate(world.world.template).then(setTemplate);
  }, [world?.world.template]); // eslint-disable-line react-hooks/exhaustive-deps

  const failures: ValidationFailure[] = useMemo(() => {
    if (!world || !survey?.questionSet || !survey.gamifier) return [];
    return validateWorld(world, {
      questions: survey.questionSet.questions,
      gamifier: survey.gamifier,
      level: survey.picks.level,
      timeLimitSec: survey.picks.timeLimitSec,
    });
  }, [world, survey]);

  if (busy) return <AiWorkingPanel title={busy} steps={["Choosing scenes", "Writing short narration", "Checking the integrity rules"]} />;
  if (error && !world) {
    return (
      <>
        <p className="banner banner--danger">{error}</p>
        <div className="s-row">
          <button type="button" className="btn btn--md btn--secondary" onClick={() => void build()}>
            Try again
          </button>
          <a className="btn btn--md btn--ghost" href={`/studio/s/${id}/publish`}>
            Publish as a plain survey instead
          </a>
        </div>
      </>
    );
  }
  if (!survey || !world) return <p className="muted">Loading…</p>;

  const live = survey.status === "live";
  const byId = new Map(survey.questionSet!.questions.map((q) => [q.id, q]));
  const level = survey.picks.level;
  const t = CATALOGUE[world.world.template];
  const mood = world.world.mood;
  const look = world.world.look;

  const edit = (fn: (w: WorldSpec) => void) => {
    const next = structuredClone(world);
    fn(next);
    setWorld(next);
    setDirty(true);
  };

  async function save(): Promise<boolean> {
    if (!dirty) return true;
    const r = await studioApi.editWorld(id, { world });
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    setSurvey(r.data.survey);
    setDirty(false);
    return true;
  }

  async function regenerate(chapterId: string, what: string) {
    if (!(await save())) return;
    setBusy("Rewriting that chapter");
    const r = await studioApi.editWorld(id, { chapterId, instruction: what });
    setBusy("");
    if (!r.ok) return setError(r.error);
    setSurvey(r.data.survey);
    setWorld(r.data.survey.world);
  }

  async function accept() {
    if (!(await save())) return;
    const r = await studioApi.patch(id, { worldAccepted: true });
    if (!r.ok) return setError(r.error);
    router.push(`/studio/s/${id}/publish`);
  }

  function merge(ci: number) {
    edit((w) => {
      const [a, b] = [w.chapters[ci], w.chapters[ci + 1]];
      a.question_ids = [...a.question_ids, ...b.question_ids];
      a.interlude_line = b.interlude_line;
      w.chapters.splice(ci + 1, 1);
    });
  }
  function split(ci: number, at: number) {
    edit((w) => {
      const ch = w.chapters[ci];
      const rest = ch.question_ids.slice(at);
      ch.question_ids = ch.question_ids.slice(0, at);
      const used = new Set(w.chapters.map((c) => c.scene_id));
      const scene = t.scenes.find((s) => !used.has(s.id))?.id ?? ch.scene_id;
      w.chapters.splice(ci + 1, 0, {
        chapter_id: `C${Date.now().toString(36)}`,
        title: t.scenes.find((s) => s.id === scene)?.label ?? "Next stop",
        question_ids: rest,
        scene_id: scene,
        intro_line: "",
        interlude_line: ch.interlude_line,
      });
      ch.interlude_line = level === "light" ? "" : "On to the next stop.";
    });
  }

  const previewSurvey = toPublic({ ...survey, world });
  const Thumb = template?.Thumb;

  return (
    <>
      <StoryStepRail surveyId={id} current="story" reached={surveyStep(survey)} />

      {/* ---------- World card ---------- */}
      <section className={`s-card ${survey.worldAccepted && !dirty ? "" : "s-card--draft"}`} aria-labelledby="world-title">
        <div className="s-row s-row--between">
          <div className="s-row">
            <Badge kind="ai" />
            {survey.prepared && <Badge kind="sample">Prepared example</Badge>}
            {survey.worldAccepted && !dirty && <Badge kind="human" />}
          </div>
          <span className="badge badge--computed">
            {survey.questionSet!.questions.length} questions · {formatAbout(storySeconds(survey.questionSet!.questions, world.chapters.length, level))}
          </span>
        </div>
        <label className="s-help" htmlFor="world-title">
          World title <Counter text={world.world.title} limit={LIMITS.title} />
        </label>
        <input id="world-title" className="s-input" style={{ fontSize: "1.375rem", fontWeight: 700 }} disabled={live} value={world.world.title} onChange={(e) => edit((w) => void (w.world.title = e.target.value))} />
        <label className="s-help" htmlFor="world-premise">
          Premise (one sentence)
        </label>
        <input id="world-premise" className="s-input" disabled={live} value={world.world.premise} onChange={(e) => edit((w) => void (w.world.premise = e.target.value))} />
        <p className="s-help">
          {t.label} · {mood.replace("_", " ")} · {look === "clay" ? "Clay" : "Paper-cut"} · Narrator: {world.world.narrator_voice}
        </p>
        {!live && (
          <div className="s-row">
            <button type="button" className="btn btn--sm btn--secondary" onClick={() => void build()}>
              <ArrowsClockwise size={14} weight="bold" aria-hidden="true" /> Regenerate world
            </button>
            <button type="button" className="btn btn--sm btn--secondary" onClick={() => setPreview("story")}>
              <DeviceMobile size={14} weight="bold" aria-hidden="true" /> Preview
            </button>
          </div>
        )}
      </section>

      {/* ---------- Storyboard ---------- */}
      <section aria-labelledby="board-title" style={{ display: "grid", gap: 12 }}>
        <h2 id="board-title">Storyboard</h2>
        <div className="board">
          {world.chapters.map((ch, ci) => (
            <article key={ch.chapter_id} id={`chapter-${ch.chapter_id}`} className="s-card" style={{ alignContent: "start" }}>
              <div className={`board__thumb story mood-${mood} look-${look}`} style={{ minHeight: 0 }}>
                {Thumb && <Thumb sceneId={ch.scene_id} look={look} mood={mood} />}
              </div>
              <div className="s-row s-row--between">
                <span className="s-label">Chapter {ci + 1}</span>
                {!live && (
                  <select className="s-select" style={{ width: "auto", minHeight: 36 }} aria-label={`Scene for chapter ${ci + 1}`} value={ch.scene_id} onChange={(e) => edit((w) => void (w.chapters[ci].scene_id = e.target.value))}>
                    {t.scenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <input className="s-input" aria-label={`Chapter ${ci + 1} title`} disabled={live} value={ch.title} onChange={(e) => edit((w) => void (w.chapters[ci].title = e.target.value))} />
              {level !== "light" && (
                <>
                  <label className="s-help" htmlFor={`intro-${ch.chapter_id}`}>
                    Intro line <Counter text={ch.intro_line} limit={LIMITS.intro} />
                  </label>
                  <input id={`intro-${ch.chapter_id}`} className="s-input" disabled={live} value={ch.intro_line} onChange={(e) => edit((w) => void (w.chapters[ci].intro_line = e.target.value))} />
                </>
              )}
              <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                {ch.question_ids.map((qid, qi) => {
                  const item = world.items.find((i) => i.question_id === qid);
                  return (
                    <li key={qid} style={{ display: "grid", gap: 4 }}>
                      <span>{byId.get(qid)?.text}</span>
                      {level !== "light" && item && (
                        <span className="s-row">
                          <input
                            className="s-input"
                            style={{ minHeight: 36, padding: "6px 10px", width: 160 }}
                            aria-label={`Acknowledgement after ${qid}`}
                            disabled={live}
                            value={item.acknowledgement}
                            onChange={(e) => edit((w) => void (w.items.find((i) => i.question_id === qid)!.acknowledgement = e.target.value))}
                          />
                          <Counter text={item.acknowledgement} limit={LIMITS.acknowledgement} />
                        </span>
                      )}
                      {!live && qi > 0 && (
                        <button type="button" className="btn btn--sm btn--ghost" style={{ justifySelf: "start" }} onClick={() => split(ci, qi)}>
                          Split here
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
              {level !== "light" && ci < world.chapters.length - 1 && (
                <>
                  <label className="s-help" htmlFor={`inter-${ch.chapter_id}`}>
                    Line on the way to the next chapter <Counter text={ch.interlude_line} limit={LIMITS.interlude} />
                  </label>
                  <input id={`inter-${ch.chapter_id}`} className="s-input" disabled={live} value={ch.interlude_line} onChange={(e) => edit((w) => void (w.chapters[ci].interlude_line = e.target.value))} />
                </>
              )}
              {!live && (
                <div className="s-row">
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => void regenerate(ch.chapter_id, "Rewrite this chapter's title, intro line and interlude line.")}>
                    Regenerate lines
                  </button>
                  {ci < world.chapters.length - 1 && (
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => merge(ci)}>
                      Merge with next
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <IntegrityPanel
        failures={failures}
        onFix={(f) => {
          const chapter = f.chapterId ?? world.chapters.find((c) => c.question_ids.includes(f.questionId ?? ""))?.chapter_id;
          if (chapter) document.getElementById(`chapter-${chapter}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

      {error && <p className="banner banner--danger">{error}</p>}
      {!live && failures.length > 0 && (
        <p className="s-help">
          Can&apos;t fix these? <a href={`/studio/s/${id}/publish`}>Publish as a plain survey instead</a>.
        </p>
      )}
      {!live && (
        <div className="sticky-actions">
          <span className="s-help">{failures.length ? `${failures.length} check${failures.length > 1 ? "s" : ""} to fix` : dirty ? "Unsaved changes" : "All checks pass"}</span>
          <span className="s-row">
            {dirty && (
              <button type="button" className="btn btn--md btn--secondary" onClick={() => void save()}>
                Save changes
              </button>
            )}
            <button type="button" className="btn btn--md btn--primary" disabled={failures.length > 0} onClick={() => void accept()}>
              Accept world · Next: Publish
            </button>
          </span>
        </div>
      )}

      {preview && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Phone preview" onKeyDown={(e) => e.key === "Escape" && setPreview(null)}>
          <div style={{ display: "grid", gap: 10, justifyItems: "center" }}>
            <div className="s-row">
              <div className="s-seg" role="group" aria-label="Preview mode">
                <button type="button" aria-pressed={preview === "story"} onClick={() => setPreview("story")}>
                  Story
                </button>
                <button type="button" aria-pressed={preview === "plain"} onClick={() => setPreview("plain")}>
                  Plain view
                </button>
              </div>
              <button type="button" className="btn btn--sm btn--secondary" onClick={() => setPreview(null)} autoFocus>
                <X size={14} weight="bold" aria-hidden="true" /> Close
              </button>
            </div>
            <div className="phone-frame">
              <PlayerApp key={preview} slug={survey.slug} preview={previewSurvey} previewArm={preview} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
