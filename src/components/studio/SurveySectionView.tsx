"use client";

import { ArrowRight, ArrowUpRight, LinkSimple, LockSimple } from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { NEXT_STEP, SECTION_INFO, surveyHref } from "@/lib/studio/sections";
import { useStudio } from "@/lib/studio/store";
import type { Section } from "@/lib/studio/types";
import Link from "next/link";
import { ComingSoon } from "./ComingSoon";
import { ResultsTabs } from "./ResultsTabs";
import { StepRail } from "./StepRail";
import { TopBar, type TopAction } from "./TopBar";

const RESULT_SECTIONS: Section[] = ["results", "themes", "dashboard", "responses", "ask", "report"];

/**
 * A page inside one survey: top bar, then the step rail (drafts) or the results tabs (published),
 * then the section. Sections arrive in later build steps, so for now they show what will be here.
 */
export function SurveySectionView({ id, section }: { id: string; section: Section }) {
  const state = useStudio();
  const toast = useToast();
  const survey = state?.status === "ready" ? state.surveys.find((s) => s.id === id) : undefined;
  const info = SECTION_INFO[section];

  if (state === null) {
    return (
      <>
        <TopBar crumbs={[{ label: "Home", href: "/app" }, { label: "…" }]} />
        <main className="page" aria-busy="true">
          <span className="skeleton" style={{ display: "block", width: "40%", height: 28, marginBottom: 24 }} />
          <span className="skeleton" style={{ display: "block", width: "100%", height: 220 }} />
        </main>
      </>
    );
  }

  if (!survey) {
    return (
      <>
        <TopBar crumbs={[{ label: "Home", href: "/app" }, { label: "Not found" }]} />
        <main className="page">
          <EmptyState
            symbol="?"
            title="We couldn’t find that survey"
            headingLevel={1}
            actions={
              <Link href="/app" className="btn btn--md btn--primary">
                Back to your surveys
              </Link>
            }
          >
            It may have been deleted, or the link is from another browser.
          </EmptyState>
        </main>
      </>
    );
  }

  const published = survey.status !== "draft";
  const publicUrl = survey.slug ? `/s/${survey.slug}` : null;
  const secondary: TopAction[] = [];
  let primary: TopAction | undefined;

  if (published && publicUrl) {
    secondary.push({ label: "View survey", href: publicUrl, external: true, Icon: ArrowUpRight });
    if (survey.status === "live") {
      primary = {
        label: "Share",
        Icon: LinkSimple,
        onClick: async () => {
          const link = `${window.location.origin}${publicUrl}`;
          try {
            await navigator.clipboard.writeText(link);
            toast({ message: "Link copied. Paste it into WhatsApp, email or a post." });
          } catch {
            toast({ message: `Copy this link: ${link}` });
          }
        },
      };
    }
  }
  if (!published) {
    const next = section === "build" || section === "style" ? NEXT_STEP[section] : null;
    if (next) primary = { label: `Next: ${next.label}`, href: surveyHref(survey.id, next.section), Icon: ArrowRight, iconAfter: true };
  }

  const lockedResults = !published && RESULT_SECTIONS.includes(section);

  return (
    <>
      <TopBar
        crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
        status={survey.status}
        saved={!published}
        primary={primary}
        secondary={secondary}
      />
      {published ? (
        <ResultsTabs surveyId={survey.id} current={section} hasResponses={(survey.stats?.finished ?? 0) > 0} />
      ) : (
        <StepRail surveyId={survey.id} reached={survey.step} current={section} />
      )}
      <main className="page">
        <h1 className="sr-only">
          {info.title}: {survey.title}
        </h1>
        {lockedResults ? (
          <EmptyState
            symbol={<LockSimple size={28} weight="bold" />}
            title="Results unlock after you publish"
            actions={
              <Link href={surveyHref(survey.id, survey.step)} className="btn btn--md btn--primary">
                Continue setting up
              </Link>
            }
          >
            Finish the steps first. Once people answer, their responses show up here.
          </EmptyState>
        ) : (
          <ComingSoon title={info.title} about={info.about} spec={info.spec} />
        )}
      </main>
    </>
  );
}
