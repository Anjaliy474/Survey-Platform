import { AnswersToDecisions } from "@/components/marketing/AnswersToDecisions";
import { CreatorView } from "@/components/marketing/CreatorView";
import { Faq } from "@/components/marketing/Faq";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Hero } from "@/components/marketing/Hero";
import { MotionEffects } from "@/components/marketing/MotionEffects";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { ThreeWays } from "@/components/marketing/ThreeWays";
import { TrustStrip } from "@/components/marketing/TrustStrip";
import { WhoItsFor } from "@/components/marketing/WhoItsFor";
import { analyseCafeSurvey } from "@/lib/cafe-analysis";
import { pollStats } from "@/lib/demo-poll-data";

/**
 * Landing page (UI_UX_LAYOUT.md M1). Sections in spec order; §8 "Voices" stays hidden
 * until real pilot quotes exist, with permission.
 */
export default function LandingPage() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <CreatorView stats={pollStats} />
        <ThreeWays />
        <AnswersToDecisions data={analyseCafeSurvey()} />
        <TrustStrip />
        <WhoItsFor />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
      <ScrollReveal />
      <MotionEffects />
    </>
  );
}
