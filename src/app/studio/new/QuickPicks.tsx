"use client";

import { MagicWand, Sparkle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { AiWorkingPanel } from "@/components/studio/AiWorkingPanel";
import { studioApi } from "@/components/studio/api";
import { loadTemplate, type StoryTemplate } from "@/components/story/template-api";
import { CATALOGUE } from "@/lib/story/catalogue";
import { contrastRatio, passingShade, sensitiveBriefHint } from "@/lib/survey/contrast";
import { suggestPicks } from "@/lib/survey/suggest";
import { FORMATS, MOODS, type Format, type Look, type Mood, type PlayfulLevel, type QuickPicks as Picks } from "@/lib/survey/types";

const EXAMPLES = ["Feedback for our college fest", "Should our café open on Sundays?", "Would students pay for laundry pickup?"];
const AUDIENCES = ["Students", "Customers", "Employees", "Event attendees", "Everyone"];
const FORMAT_NOTES: Record<Format, string> = {
  journey_map: "Walk a trail; each stop is a question.",
  stations_room: "Explore one place, station by station.",
  chat_story: "The world messages you; reply with a tap.",
};
const MOOD_LABEL: Record<Mood, string> = {
  cosy: "Cosy",
  adventure: "Adventure",
  festive: "Festive",
  space: "Space",
  nature: "Nature",
  retro: "Retro",
  everyday_india: "Everyday India",
};
const LEVELS: { id: PlayfulLevel; label: string; help: string }[] = [
  { id: "light", label: "Light", help: "Scenes and chapter titles only." },
  { id: "medium", label: "Medium", help: "Scenes, short narration and a neutral “Noted.” after each answer." },
  { id: "full", label: "Full story", help: "Everything in Medium, plus a short opening line." },
];
const LIMITS: { label: string; value: number | null }[] = [
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "3 min", value: 180 },
  { label: "No limit", value: null },
];
const MAX_LOGO_BYTES = 200_000;

function Section({ title, help, children }: { title: string; help?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="s-field" aria-labelledby={id}>
      <h2 id={id} className="s-label" style={{ fontSize: "1rem" }}>
        {title}
      </h2>
      {help && <p className="s-help">{help}</p>}
      {children}
    </section>
  );
}

/** S3d "Start from a concept": only the concept is required; everything else has a default. */
export function QuickPicks() {
  const router = useRouter();
  const [concept, setConcept] = useState("");
  const [audience, setAudience] = useState("Everyone");
  const [ageBand, setAgeBand] = useState<"13+" | "18+">("18+");
  const [format, setFormat] = useState<Format | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [look, setLook] = useState<Look | null>(null);
  const [level, setLevel] = useState<PlayfulLevel>("medium");
  const [brandColor, setBrandColor] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<Partial<Record<Format, StoryTemplate>>>({});

  useEffect(() => {
    FORMATS.forEach((f) => void loadTemplate(f).then((t) => setTemplates((prev) => ({ ...prev, [f]: t }))));
  }, []);

  const suggestion = suggestPicks(concept);
  const picked = { format: format ?? suggestion.format, mood: mood ?? suggestion.mood, look: look ?? suggestion.look };
  const shade = brandColor ? passingShade(brandColor, "#ffffff") : null;

  async function submit(useDefaults: boolean) {
    if (concept.trim().length < 3) {
      setError("Tell us what the survey is about, in a few words.");
      return;
    }
    setError("");
    setBusy(true);
    const picks: Partial<Picks> = useDefaults
      ? { concept: concept.trim(), ...suggestion }
      : { concept: concept.trim(), audience, ageBand, ...picked, level, brandColor, logoDataUrl: logo, timeLimitSec: limit };
    const res = await studioApi.create(picks);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    router.push(`/studio/s/${res.data.survey.id}/questions`);
  }

  if (busy) {
    return (
      <>
        <h1>Drafting your survey</h1>
        <AiWorkingPanel title="Working on it" steps={["Reading your brief", "Shaping questions", "Checking for bias"]} />
      </>
    );
  }

  const Thumb = templates[picked.format]?.Thumb;

  return (
    <form
      className="studio__wrap"
      style={{ maxWidth: 760 }}
      onSubmit={(e) => {
        e.preventDefault();
        void submit(false);
      }}
    >
      <div className="s-field">
        <span className="eyebrow">Start from a concept</span>
        <h1>What&apos;s your survey about?</h1>
        <p className="muted">One line is enough. We draft the questions first, then build a small story world around them.</p>
      </div>

      <div className="s-field">
        <label className="s-label" htmlFor="concept">
          Your concept
        </label>
        <textarea
          id="concept"
          className="s-textarea"
          value={concept}
          maxLength={400}
          placeholder="For example: Feedback for our college fest"
          aria-describedby={error ? "concept-error" : undefined}
          onChange={(e) => setConcept(e.target.value)}
        />
        <div className="s-chips" aria-label="Examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="s-chip" onClick={() => setConcept(ex)}>
              {ex}
            </button>
          ))}
        </div>
        {error && (
          <p id="concept-error" className="banner banner--danger" role="alert">
            <WarningCircle size={18} weight="bold" aria-hidden="true" /> {error}
          </p>
        )}
        {sensitiveBriefHint(concept) && (
          <p className="banner banner--warning">This brief may touch a sensitive topic. Check the questions before turning on Story Mode.</p>
        )}
      </div>

      <div className="s-row">
        <button type="button" className="btn btn--md btn--secondary" onClick={() => void submit(true)}>
          <MagicWand size={18} weight="bold" aria-hidden="true" /> Make it for me
        </button>
        <span className="s-help">Uses the suggested picks below.</span>
      </div>

      <Section title="Who will play it?">
        <div className="s-chips">
          {AUDIENCES.map((a) => (
            <button key={a} type="button" className="s-chip" aria-pressed={audience === a} onClick={() => setAudience(a)}>
              {a}
            </button>
          ))}
        </div>
        <div className="s-seg" role="group" aria-label="Age band">
          {(["13+", "18+"] as const).map((b) => (
            <button key={b} type="button" aria-pressed={ageBand === b} onClick={() => setAgeBand(b)}>
              {b}
            </button>
          ))}
        </div>
      </Section>

      <Section title="How should it feel?" help={`Suggested: ${CATALOGUE[suggestion.format].label}. ${suggestion.reason}`}>
        <div className="s-picks">
          {FORMATS.map((f) => {
            const T = templates[f]?.Thumb;
            return (
              <button key={f} type="button" className="s-pick" aria-pressed={picked.format === f} onClick={() => setFormat(f)}>
                <span className={`s-pick__thumb story mood-${picked.mood} look-${picked.look}`}>{T && <T sceneId={CATALOGUE[f].scenes[0].id} look={picked.look} mood={picked.mood} />}</span>
                <span className="s-pick__name">
                  {CATALOGUE[f].label} {suggestion.format === f && <Sparkle size={14} weight="fill" aria-label="Suggested" />}
                </span>
                <span className="s-help">{FORMAT_NOTES[f]}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Pick a world mood">
        <div className="s-chips">
          {MOODS.map((m) => (
            <button key={m} type="button" className="s-chip" aria-pressed={picked.mood === m} onClick={() => setMood(m)}>
              {MOOD_LABEL[m]}
            </button>
          ))}
          <button type="button" className="s-chip" onClick={() => setMood(MOODS[Math.floor(Math.random() * MOODS.length)])}>
            Surprise me
          </button>
        </div>
      </Section>

      <Section title="Pick a look">
        <div className="s-picks" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {(["clay", "paper_cut"] as const).map((l) => (
            <button key={l} type="button" className="s-pick" aria-pressed={picked.look === l} onClick={() => setLook(l)}>
              <span className={`s-pick__thumb story mood-${picked.mood} look-${l}`}>{Thumb && <Thumb sceneId={CATALOGUE[picked.format].scenes[1]?.id ?? CATALOGUE[picked.format].scenes[0].id} look={l} mood={picked.mood} />}</span>
              <span className="s-pick__name">{l === "clay" ? "Clay" : "Paper-cut"}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="How playful?" help={LEVELS.find((x) => x.id === level)?.help}>
        <div className="s-seg" role="group" aria-label="Playful level">
          {LEVELS.map((x) => (
            <button key={x.id} type="button" aria-pressed={level === x.id} onClick={() => setLevel(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Your brand (optional)" help="We adjust your colour if it's hard to read.">
        <div className="s-row">
          <label className="s-label" htmlFor="brand">
            Colour
          </label>
          <input id="brand" type="color" value={brandColor ?? "#c4461b"} onChange={(e) => setBrandColor(e.target.value)} />
          {brandColor && shade && (
            <span className="s-row s-help">
              <span className="s-swatch" style={{ background: brandColor }} aria-label={`Your colour ${brandColor}`} />
              {shade.toLowerCase() !== brandColor.toLowerCase() && (
                <>
                  → <span className="s-swatch" style={{ background: shade }} aria-label={`Adjusted ${shade}`} />
                  Adjusted for contrast ({contrastRatio(shade, "#ffffff").toFixed(1)}:1)
                </>
              )}
            </span>
          )}
        </div>
        <div className="s-field">
          <label className="s-label" htmlFor="logo">
            Logo
          </label>
          <input
            id="logo"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return setLogo(null);
              if (file.size > MAX_LOGO_BYTES) {
                setError("That logo is over 200 KB. Try a smaller image.");
                e.target.value = "";
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setLogo(String(reader.result));
              reader.readAsDataURL(file);
            }}
          />
        </div>
      </Section>

      <Section title="Time limit" help="Scene time counts too, so the survey always fits.">
        <div className="s-chips">
          {LIMITS.map((x) => (
            <button key={x.label} type="button" className="s-chip" aria-pressed={limit === x.value} onClick={() => setLimit(x.value)}>
              {x.label}
            </button>
          ))}
        </div>
      </Section>

      <div className="sticky-actions">
        <span className="s-help">Next: we draft the questions. You review them before any story is built.</span>
        <button type="submit" className="btn btn--md btn--primary">
          Draft my survey
        </button>
      </div>
    </form>
  );
}
