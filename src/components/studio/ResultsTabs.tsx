"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RESULT_TABS, surveyHref } from "@/lib/studio/sections";
import type { Section } from "@/lib/studio/types";

/**
 * Results tabs after publishing (UI_UX_LAYOUT.md §3.3): Overview · Themes · Dashboard ·
 * Responses · Ask · Report, a scrollable chip row on phones. "Edit survey" warns first,
 * because changing a live survey splits its results.
 */
export function ResultsTabs({ surveyId, current, hasResponses }: { surveyId: string; current: Section; hasResponses: boolean }) {
  const router = useRouter();
  const [warn, setWarn] = useState(false);

  return (
    <div className="rtabs">
      <nav className="rtabs__list" aria-label="Results">
        {RESULT_TABS.map((t) => (
          <Link
            key={t.section}
            href={surveyHref(surveyId, t.section)}
            className="rtabs__tab"
            aria-current={t.section === current ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <button type="button" className="btn btn--ghost rtabs__edit" onClick={() => (hasResponses ? setWarn(true) : router.push(surveyHref(surveyId, "build")))}>
        Edit survey
      </button>
      <ConfirmDialog
        open={warn}
        title="Edit a live survey?"
        confirmLabel="Continue to edit"
        onClose={() => setWarn(false)}
        onConfirm={() => {
          setWarn(false);
          router.push(surveyHref(surveyId, "build"));
        }}
      >
        <p>Changing questions after people have answered will split your results. Earlier answers stay with the version they were given to.</p>
      </ConfirmDialog>
    </div>
  );
}
