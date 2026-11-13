"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowClockwise, MagnifyingGlass, Plus, Star, Warning } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useMe } from "@/lib/account";
import { useSearchParam } from "@/lib/client-hooks";
import { studio, useStudio } from "@/lib/studio/store";
import type { StudioSurvey, SurveyStatus } from "@/lib/studio/types";
import { HomeFindings, HomeSummary } from "./HomeOverview";
import { SurveyRow } from "./SurveyRow";
import { TopBar } from "./TopBar";

const FILTERS: { key: "all" | SurveyStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "live", label: "Live" },
  { key: "closed", label: "Closed" },
];
const IDEAS = ["Customer feedback", "Event feedback", "Research study"];

/**
 * S1 Home "Your surveys" (UI_UX_LAYOUT.md): every survey's status and live numbers at a glance.
 * States: loading (3 skeleton cards), empty, error with Retry. Preview them with ?preview=loading|empty|error.
 */
export function HomeView() {
  const state = useStudio();
  const me = useMe();
  const preview = useSearchParam("preview");
  const toast = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<StudioSurvey | null>(null);

  const view: "loading" | "error" | "ready" =
    preview === "loading" || state === null ? "loading" : preview === "error" || state.status === "error" ? "error" : "ready";
  const surveys = useMemo(
    () => (view === "ready" && state?.status === "ready" && preview !== "empty" ? [...state.surveys].sort((a, b) => b.updatedAt - a.updatedAt) : []),
    [view, state, preview],
  );
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, f.key === "all" ? surveys.length : surveys.filter((s) => s.status === f.key).length])),
    [surveys],
  );
  const q = query.trim().toLowerCase();
  const shown = surveys.filter((s) => (filter === "all" || s.status === filter) && (!q || s.title.toLowerCase().includes(q)));

  function duplicate(s: StudioSurvey) {
    const copy = studio.duplicate(s.id);
    if (copy) toast({ message: `Duplicated as “${copy.title}”.` });
  }
  function close(s: StudioSurvey) {
    studio.close(s.id);
    toast({ message: `Closed “${s.title}”. No new answers will be collected.`, action: { label: "Undo", onClick: () => studio.reopen(s.id) } });
  }

  return (
    <>
      <TopBar crumbs={[{ label: "Home" }]} />
      <main className="page">
        <div className="home-head">
          <div>
            <h1 className="page__title">{me?.name && me.signedIn ? `Hi, ${me.name.split(/[\s.@]/)[0]}` : "Home"}</h1>
            <p className="home-head__sub">Here’s how your surveys are doing.</p>
          </div>
          <Link href="/app/new" className="btn btn--md btn--primary">
            <Plus size={18} /> New survey
          </Link>
        </div>

        {view === "error" && (
          <div className="banner banner--danger" role="alert">
            <Warning size={20} weight="regular" />
            <span>We couldn’t load your surveys just now. Nothing has been lost.</span>
            <button type="button" className="btn btn--sm btn--secondary" onClick={() => studio.reload()}>
              <ArrowClockwise size={16} weight="regular" /> Retry
            </button>
          </div>
        )}

        {view === "loading" && (
          <div className="slist" aria-busy="true" aria-label="Loading your surveys">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="srow srow--skeleton" aria-hidden="true">
                <span className="skeleton" style={{ width: "46%", height: 18 }} />
                <span className="skeleton" style={{ width: "18%", height: 14 }} />
              </div>
            ))}
          </div>
        )}

        {view === "ready" && surveys.length === 0 && (
          <EmptyState
            symbol={<Star size={30} weight="fill" />}
            title="Your first survey is a minute away."
            actions={
              <>
                <Link href="/app/new" className="btn btn--md btn--primary">
                  Start a survey
                </Link>
                <div className="idea-chips" aria-label="Ideas to start from">
                  {IDEAS.map((idea) => (
                    <Link key={idea} href={`/app/new/prompt?q=${encodeURIComponent(idea)}`} className="chip">
                      {idea}
                    </Link>
                  ))}
                </div>
                {preview !== "empty" && (
                  <button type="button" className="btn btn--ghost" onClick={() => studio.restoreSamples()}>
                    Demo only: restore the sample surveys
                  </button>
                )}
              </>
            }
          >
            Bring your own questions, describe what you want to learn, or start from one line.
          </EmptyState>
        )}

        {view === "ready" && surveys.length > 0 && (
          <>
            <HomeSummary surveys={surveys} />
            <HomeFindings surveys={surveys} />
            <div className="home-tools">
              <h2 className="home-h2">Surveys</h2>
              <div className="chips" role="group" aria-label="Filter surveys">
                {FILTERS.map((f) => (
                  <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                    {f.label} <span className="chip__count">{counts[f.key]}</span>
                  </button>
                ))}
              </div>
              <label className="search">
                <MagnifyingGlass size={18} weight="regular" />
                <span className="sr-only">Search surveys</span>
                <input type="search" placeholder="Search surveys" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
            </div>

            <p className="sr-only" aria-live="polite">
              {shown.length} {shown.length === 1 ? "survey" : "surveys"} shown
            </p>

            {shown.length > 0 ? (
              <div className="slist">
                <div className="slist__head" aria-hidden="true">
                  <span>Survey</span>
                  <span>Responses</span>
                  <span>Completion</span>
                  <span>Last 7 days</span>
                  <span>Edited</span>
                  <span />
                </div>
                <ul className="slist__rows" aria-label="Surveys">
                  {shown.map((s) => (
                    <SurveyRow key={s.id} survey={s} onDuplicate={() => duplicate(s)} onClose={() => close(s)} onDelete={() => setToDelete(s)} />
                  ))}
                </ul>
              </div>
            ) : (
              <div className="no-match">
                <p>
                  No {filter === "all" ? "" : `${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} `}surveys
                  {q ? ` match “${query.trim()}”` : " yet"}.
                </p>
                <button
                  type="button"
                  className="btn btn--sm btn--secondary"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Show all surveys
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete “${toDelete?.title ?? ""}”?`}
        confirmLabel="Delete survey"
        tone="danger"
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          studio.remove(toDelete.id);
          toast({ message: `Deleted “${toDelete.title}”.` });
          setToDelete(null);
        }}
      >
        <p>
          This deletes the survey and all{toDelete?.stats ? ` ${toDelete.stats.finished}` : ""} of its responses. This can’t be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}
