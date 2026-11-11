import { Lightbulb } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/Badge";
import { SectionHead } from "@/components/ui/SectionHead";
import { formatCount, percent } from "@/lib/compute";
import { DEMO_POLL, type PollStats } from "@/lib/demo-poll";
import { POLL_THEME } from "@/lib/sample-surveys";
import { GroupedBarCard } from "./GroupedBarCard";
import { KpiTile } from "./KpiTile";

/** M1 §2 Creator view: "How many joined, what they said, what to do next". */
export function CreatorView({ stats }: { stats: PollStats }) {
  const completion = percent(stats.completed, stats.participants);
  const themeShare = percent(POLL_THEME.mentions, POLL_THEME.writtenAnswers);
  const questionCount = DEMO_POLL.questions.length;

  return (
    <section className="band creator" id="creator" aria-labelledby="creator-title">
      <div className="wrap">
        <SectionHead id="creator-title" eyebrow="The creator's view" title="How many joined, what they said, what to do next">
          The poll you just played, from the other side.
        </SectionHead>

        <div className="cv-grid">
          <KpiTile
            label="Participants"
            value={stats.participants}
            sub="answered at least one"
            how={`Count of people with at least one answer = ${formatCount(stats.participants)}`}
          />
          <KpiTile
            label="Completion"
            value={completion}
            suffix="%"
            sub={`finished all ${questionCount}`}
            how={`Finished ÷ started = ${formatCount(stats.completed)} ÷ ${formatCount(stats.participants)}`}
            delay={80}
          />
          <KpiTile
            label="Median time"
            value={stats.medianSeconds}
            suffix="s"
            sub="first tap to submit"
            how={`Middle value of ${formatCount(stats.completed)} finish times, in seconds`}
            delay={160}
          />

          <GroupedBarCard groups={stats.bySlot} />

          <div className="card theme-card" data-reveal>
            <div className="theme-card__head">
              <Badge kind="ai">AI theme</Badge>
              <Badge kind="computed">
                {formatCount(POLL_THEME.mentions)} answers · {themeShare}%
              </Badge>
            </div>
            <h3 className="theme-card__label">{POLL_THEME.label}</h3>
            <p className="theme-card__from">From {formatCount(POLL_THEME.writtenAnswers)} written answers.</p>
            {POLL_THEME.quotes.map((q) => (
              <blockquote key={q.id} className="quote">
                “{q.text}”<span className="mono">{q.id}</span>
              </blockquote>
            ))}
          </div>

          <div className="card next-card" data-reveal>
            <span className="next-card__icon" aria-hidden="true">
              <Lightbulb size={22} weight="duotone" />
            </span>
            <div className="next-card__body">
              <Badge kind="ai">AI suggestion</Badge>
              <p className="next-card__text">Keep it under 10 questions. Open ones last.</p>
              <p className="next-card__why">
                Why: “long forms feel like homework” came up often. A link, not proof, so test a short and a long
                version.
              </p>
            </div>
          </div>
        </div>

        <p className="sample-note">
          <Badge kind="sample" /> Example numbers. In the product, every number is computed from real responses.
        </p>
      </div>
    </section>
  );
}
