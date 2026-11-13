import { Badge } from "@/components/ui/Badge";
import { SectionHead } from "@/components/ui/SectionHead";
import { formatCount, percent } from "@/lib/compute";
import { DEMO_POLL, type PollStats } from "@/lib/demo-poll";
import { KpiTile } from "./KpiTile";

/** M1 §2 Creator view: "How many joined, what they said, what to do next". */
export function CreatorView({ stats }: { stats: PollStats }) {
  const completion = percent(stats.completed, stats.participants);
  const questionCount = DEMO_POLL.questions.length;

  return (
    <section className="band creator" id="creator" aria-labelledby="creator-title">
      <div className="wrap">
        <SectionHead id="creator-title" eyebrow="The creator's view" title="How many joined, what they said, what to do next">
          A quick live poll, as its creator sees it.
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
        </div>

        <p className="sample-note">
          <Badge kind="sample" /> Example numbers. In the product, every number is computed from real responses.
        </p>
      </div>
    </section>
  );
}
