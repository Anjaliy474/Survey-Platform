import { Lightning, ListChecks, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { SectionHead } from "@/components/ui/SectionHead";
import { estimateSeconds, formatAbout } from "@/lib/compute";
import { FEST_DRAFT_QUESTIONS } from "@/lib/sample-surveys";
import { Clouds } from "./Clouds";
import { StartCard } from "./StartCard";

const PROMPTS = [
  "Feedback for our college fest",
  "Would students pay for a laundry pickup app?",
  "Customer satisfaction for our café",
  "Volunteer feedback after Sunday’s tree-plantation drive",
  "Should our clinic take bookings on WhatsApp?",
  "Quick workload check-in for our team",
  "Which snacks should the canteen stock?",
  "Hackathon exit poll",
];

/** M1 §3 Three ways to start, on a sky band. */
export function ThreeWays() {
  const draftEstimate = `${FEST_DRAFT_QUESTIONS.length} questions · ${formatAbout(estimateSeconds(FEST_DRAFT_QUESTIONS))}`;

  return (
    <section className="band band--sky ways" id="ways" aria-labelledby="ways-title">
      <Clouds set="band" />
      <div className="wrap">
        <SectionHead id="ways-title" eyebrow="Start any way" title="Bring questions, a problem, or just one line" center>
          AI suggests. You accept. Try it.
        </SectionHead>

        <div className="ways__grid">
          <StartCard
            tone="teal"
            icon={<ListChecks size={26} weight="duotone" />}
            title="Bring your questions"
            description="Paste them in. We fix bias, keep the good ones."
            typed="How amazing was our new canteen menu?"
            suggestion="diff"
          />
          <StartCard
            tone="persimmon"
            icon={<MagnifyingGlass size={26} weight="duotone" />}
            title="Describe your research"
            description="Name the decision. We suggest what to ask."
            typed="We run a café near campus. Should we open on Sundays?"
            delay={500}
            suggestion="new-question"
          />
          <StartCard
            tone="marigold"
            icon={<Lightning size={26} weight="duotone" />}
            title="Quick one-line prompt"
            description="One line in. A full draft out."
            typed="Feedback survey for our college fest"
            delay={1000}
            suggestion="draft"
            estimate={draftEstimate}
          />
        </div>
      </div>

      <div className="ticker" data-reveal>
        <p className="ticker__label">People ask things like</p>
        <div className="ticker__viewport">
          <ul className="ticker__track">
            {PROMPTS.map((p) => (
              <li key={p} className="ticker__chip">
                {p}
              </li>
            ))}
            {PROMPTS.map((p) => (
              <li key={`copy-${p}`} className="ticker__chip" aria-hidden="true">
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
