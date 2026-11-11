import { PageShell } from "@/components/marketing/PageShell";
import { PricingPlans } from "@/components/marketing/PricingPlans";
import "@/styles/forms.css";

export const metadata = { title: "Pricing", description: "PlaySurvey plans. Free while it's a prototype; Pro prices are still to be decided." };

const FAQ = [
  { q: "Is PlaySurvey free right now?", a: "Yes. Everything is free while PlaySurvey is a prototype. We’ll give notice before any plan costs money." },
  { q: "Why don’t you show a Pro price?", a: "The team hasn’t set one yet. We’d rather say so than show a made-up number or a fake discount." },
  { q: "Do respondents ever pay or sign up?", a: "Never. People answer through a link, with no account and no app." },
  { q: "What happens to my data if I stop using it?", a: "You can download everything or delete it from Settings → Data and privacy at any time." },
];

/** M2 Pricing (UI_UX_LAYOUT.md): plans, a "what counts" explainer, and the FAQ. */
export default function PricingPage() {
  return (
    <PageShell>
      <div className="wrap pricing">
        <header className="pricing__head">
          <h1>Simple plans, honest prices</h1>
          <p>Start free. Pro adds dashboards, Ask your data and reports for teams who survey often.</p>
        </header>
        <PricingPlans />
        <section className="pricing__explain" aria-labelledby="counts">
          <h2 id="counts">What counts as a response?</h2>
          <p>
            One person submitting a survey. Someone who opens the link and leaves without submitting doesn’t count, and neither does a response you exclude as spam or a duplicate.
            Previews you take in the Studio never count.
          </p>
        </section>
        <section className="pricing__faq" aria-labelledby="faq">
          <h2 id="faq">Questions</h2>
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      </div>
    </PageShell>
  );
}
