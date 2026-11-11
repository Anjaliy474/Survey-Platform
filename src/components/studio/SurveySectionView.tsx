"use client";

import { ArrowRight, ArrowUpRight, LinkSimple, LockSimple } from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { NEXT_STEP, SECTION_INFO, surveyHref } from "@/lib/studio/sections";
import { useStudio } from "@/lib/studio/store";
import type { Section } from "@/lib/studio/types";
import Link from "next/link";
import { ComingSoon } from "./ComingSoon";
import { BuilderView } from "./builder/BuilderView";
import { PublishView } from "./publish/PublishView";
import { ResultsView } from "./results/ResultsView";
import { DashboardView } from "./results/DashboardView";
import { ResponsesView } from "./results/ResponsesView";
import { ThemesView } from "./results/ThemesView";
import { StyleView } from "./style/StyleView";
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

  if (survey.status === "draft" && section === "build") return <BuilderView survey={survey} />;
  if (section === "publish" && (survey.status !== "draft" || survey.step === "publish")) return <PublishView survey={survey} />;
  if (survey.status !== "draft" && section === "results") return <ResultsView survey={survey} />;
  if (survey.status !== "draft" && section === "themes") return <ThemesView survey={survey} />;
  if (survey.status !== "draft" && section === "dashboard") return <DashboardView survey={survey} />;
  if (survey.status !== "draft" && section === "responses") return <ResponsesView survey={survey} />;
  const reachedStyle = survey.step === "style" || survey.step === "publish";
  if (survey.status === "draft" && section === "style" && reachedStyle && survey.builder) return <StyleView survey={survey} />;

  const published = survey.status !== "draft";
  const publicUrl = survey.slug ? `/s/${survey.slug}` : null;
  const secondary: TopAction[] = [];
  let primary: TopAction | undefined;

  if (published && publicUrl) {
    secondary.push({ label: "View survey", href: publicUrl, external: true, Icon: ArrowUpRight });
    if (survey.status === "live") {
      primary = { label: "Share", Icon: LinkSimple, href: surveyHref(survey.id, "publish") };
    }
  }
  if (!published) {
    const next = section === "build" || section === "style" ? NEXT_STEP[section] : null;
    if (next) primary = { label: `Next: ${next.label}`, href: surveyHref(survey.id, next.section), Icon: ArrowRight, iconAfter: true };
  }

  const lockedResults = !published && RESULT_SECTIONS.includes(section);
  const lockedStep = !published && ((section === "style" && !reachedStyle) || (section === "publish" && survey.step !== "publish"));

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
        {lockedStep ? (
          <EmptyState
            symbol={<LockSimple size={28} weight="bold" />}
            title="Finish the earlier steps first"
            actions={
              <Link href={surveyHref(survey.id, survey.step)} className="btn btn--md btn--primary">
                Continue where you left off
              </Link>
            }
          >
            {section === "style" ? "Approve your questions, then pick how the survey looks." : "Pick a style for your survey, then publish it here."}
          </EmptyState>
        ) : lockedResults ? (
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
