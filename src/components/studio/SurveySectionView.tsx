"use client";

import { ArrowRight, ArrowUpRight, Copy, LinkSimple, LockSimple } from "@/components/icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { NEXT_STEP, SECTION_INFO, surveyHref } from "@/lib/studio/sections";
import { getSurvey } from "@/lib/player/samples";
import { studio, useStudio } from "@/lib/studio/store";
import type { Section, StudioSurvey } from "@/lib/studio/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BuilderView } from "./builder/BuilderView";
import { PublishView } from "./publish/PublishView";
import { ResultsView } from "./results/ResultsView";
import { DashboardView } from "./results/DashboardView";
import { ResponsesView } from "./results/ResponsesView";
import { AskView } from "./results/AskView";
import { ReportView } from "./results/ReportView";
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
  if (survey.status !== "draft" && section === "ask") return <AskView survey={survey} />;
  if (survey.status !== "draft" && section === "report") return <ReportView survey={survey} />;
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
        ) : published ? (
          <LiveQuestions survey={survey} />
        ) : (
          <EmptyState
            symbol={<LockSimple size={28} weight="bold" />}
            title="Draft the questions first"
            actions={
              <Link href={surveyHref(survey.id, "build")} className="btn btn--md btn--primary">
                Go to Questions
              </Link>
            }
          >
            This draft has no questions yet, so there’s nothing to style. Draft them in Questions, then come back.
          </EmptyState>
        )}
      </main>
    </>
  );
}

/**
 * A live or closed survey's questions, read-only. Changing questions after people have answered
 * would split the results (UI_UX_LAYOUT.md §5), so edits go into a duplicate until versioning exists.
 */
function LiveQuestions({ survey }: { survey: StudioSurvey }) {
  const router = useRouter();
  const player = survey.player ?? (survey.slug ? getSurvey(survey.slug) : undefined);
  return (
    <div className="livequestions">
      <div className="status-banner status-banner--info">
        <strong>This survey is {survey.status === "live" ? "live" : "closed"}, so its questions are locked.</strong>
        <span>Changing questions after people have answered would split your results. Make a copy to change them; the copy starts as a draft.</span>
        <button
          type="button"
          className="btn btn--sm btn--secondary"
          onClick={() => {
            const copy = studio.duplicate(survey.id);
            if (copy) router.push(surveyHref(copy.id, "build"));
          }}
        >
          <Copy size={16} weight="regular" aria-hidden="true" /> Duplicate to edit
        </button>
      </div>
      {player ? (
        <ol className="livequestions__list">
          {player.questions.map((q) => (
            <li key={q.id}>
              <strong>
                {q.id}. {q.text}
              </strong>
              {(q.options.length > 0 || q.scale) && (
                <span className="field__help">{q.options.length ? q.options.join(" · ") : `${q.scale?.min_label} … ${q.scale?.max_label}`}</span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="field__help">The questions for this survey aren’t stored in this browser.</p>
      )}
    </div>
  );
}
