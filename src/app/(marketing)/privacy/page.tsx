import Link from "next/link";
import { PageShell } from "@/components/marketing/PageShell";

export const metadata = { title: "Privacy Policy", description: "What PlaySurvey collects, why, and the rights creators and respondents have." };

/** Privacy Policy, in plain words. A draft for the prototype until the team's legal review. */
export default function PrivacyPage() {
  return (
    <PageShell>
      <article className="legal wrap">
        <p className="legal__draft">Draft for the prototype · Last updated 11 November 2026</p>
        <h1>Privacy Policy</h1>
        <p className="legal__lede">
          PlaySurvey helps people make short surveys and understand the answers. This page explains what we collect, why, and what you can do about it. We follow India’s Digital
          Personal Data Protection Act, 2023 (DPDP).
        </p>

        <h2>Two kinds of people use PlaySurvey</h2>
        <ul>
          <li>
            <strong>Creators</strong> make surveys and read results. They have an account.
          </li>
          <li>
            <strong>Respondents</strong> answer surveys through a link. They never need an account.
          </li>
        </ul>
        <p>For respondents’ answers, the creator decides why the survey exists and is responsible for it. PlaySurvey processes the answers for them.</p>

        <h2>What we collect</h2>
        <ul>
          <li>From creators: email, name, an optional role and organisation, and the surveys you make. Passwords are stored only as a salted hash.</li>
          <li>From respondents: the answers given, when the survey was started and submitted, and an optional rating of how enjoyable it was. No names or device IDs unless a question asks for them.</li>
          <li>Personal data a question collects (such as an email for updates) is optional, marked as personal, never charted, and never sent to AI.</li>
        </ul>

        <h2>How AI is used</h2>
        <p>
          AI suggests questions, checks them for bias, writes the light words around them, and groups written answers into themes. Before any written answer reaches AI, code removes phone
          numbers, emails and ID numbers. AI never produces numbers: every count and percentage is computed by code. Responses are never used to train AI models.
        </p>

        <h2>Why we use it</h2>
        <ul>
          <li>To run the surveys you create and show you the results.</li>
          <li>To keep the service working and secure.</li>
          <li>Nothing else. We don’t sell data or use it for advertising.</li>
        </ul>

        <h2>Your rights</h2>
        <ul>
          <li>See the data we hold about you, and download it (Settings → Data and privacy → Download my data).</li>
          <li>Correct it, or ask us to delete it.</li>
          <li>Respondents can ask the survey’s creator to delete their answers. Creators can do this inside the product, by response ID.</li>
          <li>Withdraw consent at any time, which stops further use from then on.</li>
        </ul>

        <h2>How long we keep it</h2>
        <p>Creators decide how long to keep responses and can delete them at any time. When you delete your account, your surveys and their responses are deleted too.</p>

        <h2>This prototype</h2>
        <p>
          While PlaySurvey is a prototype, everything stays in your own browser: nothing is sent to a PlaySurvey server. Clearing your browser’s data removes it.
        </p>

        <h2>Questions</h2>
        <p>
          A grievance contact will be listed here before PlaySurvey launches. Until then, see the <Link href="/terms">Terms</Link> or the{" "}
          <Link href="/#faq">FAQ</Link>.
        </p>
      </article>
    </PageShell>
  );
}
