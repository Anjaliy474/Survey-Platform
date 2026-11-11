import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Player } from "@/components/player/Player";
import { PlayerMessage } from "@/components/player/PlayerMessage";
import { checkSurvey } from "@/lib/player/rules";
import { SAMPLE_SURVEYS, getSurvey } from "@/lib/player/samples";

export function generateStaticParams() {
  return SAMPLE_SURVEYS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const survey = getSurvey(slug);
  return {
    title: survey ? `${survey.title} · ${survey.creator.name}` : "Survey not found",
    robots: { index: false, follow: false },
  };
}

/** P1 Survey Player, `/s/:slug`. Public, no login. */
export default async function SurveyPage({ params }: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const survey = getSurvey(slug);
  if (!survey) notFound();

  if (survey.status === "closed") {
    return (
      <PlayerMessage
        theme={survey.theme}
        symbol="✓"
        title="This survey has closed."
        body={`Thanks for stopping by. ${survey.creator.name} is no longer collecting answers.`}
      />
    );
  }

  // Mechanics library + schema check: never show a survey that breaks the rules.
  const problems = checkSurvey(survey);
  if (problems.length > 0) {
    return (
      <PlayerMessage
        theme={survey.theme}
        title="This survey isn’t ready yet."
        body="Please check back later."
        details={process.env.NODE_ENV === "development" ? problems : undefined}
      />
    );
  }

  return <Player survey={survey} />;
}
