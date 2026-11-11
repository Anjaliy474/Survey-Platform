import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";

export const metadata = { title: "Terms", description: "The rules for using PlaySurvey, in plain words." };

/** Terms of use, in plain words. A draft for the prototype until the team's legal review. */
export default function TermsPage() {
  return (
    <PageShell>
      <article className="legal wrap">
        <p className="legal__draft">Draft for the prototype · Last updated 11 November 2026</p>
        <h1>Terms</h1>
        <p className="legal__lede">These are the rules for using PlaySurvey. By creating an account or publishing a survey, you agree to them.</p>

        <h2>Your surveys are yours</h2>
        <p>You own the surveys you make and the answers they collect. You give PlaySurvey permission to store and process them only to run the service for you.</p>

        <h2>Ask fairly</h2>
        <ul>
          <li>Tell people why you’re asking. Every survey shows a purpose line.</li>
          <li>Ask for personal or sensitive data only when you need it, and say so in the consent line.</li>
          <li>Don’t use PlaySurvey to mislead people, collect passwords or payment details, harass anyone, or break the law.</li>
          <li>Honour deletion requests from your respondents promptly.</li>
        </ul>

        <h2>AI suggests, you decide</h2>
        <p>
          AI drafts questions, words and themes. Nothing applies until you accept it, and you’re responsible for what you publish. Numbers come from code, but a survey only tells you about the
          people who chose to answer, so read results with that in mind.
        </p>

        <h2>The service</h2>
        <p>
          PlaySurvey is a prototype. It may change, have bugs, or lose data stored in your browser. Don’t rely on it for anything critical yet. We may suspend surveys that break these rules.
        </p>

        <h2>Prices</h2>
        <p>
          Everything is free during the prototype. Plans are described on the <Link href="/pricing">Pricing</Link> page once they’re set; we’ll give notice before any charge.
        </p>

        <h2>Privacy</h2>
        <p>
          How we handle data is described in the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </article>
    </PageShell>
  );
}
