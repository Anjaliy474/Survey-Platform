"use client";

import { useMemo } from "react";
import { useNowMinute } from "@/lib/client-hooks";
import { type Overview, overview } from "@/lib/results/compute";
import { type InsightSet, computeInsights } from "@/lib/results/insights";
import { type Snapshot, buildSnapshot } from "@/lib/results/snapshot";
import type { StudioSurvey } from "@/lib/studio/types";
import { useResultsData } from "./ResultsView";

const NO_REVIEW = {};

/** A survey's overview, insights and shareable snapshot, with the default flag rules. */
export function useAnalysis(survey: StudioSurvey): { data: Overview | null; set: InsightSet | null; snapshot: Snapshot | null } {
  const { player, rows, isSample } = useResultsData(survey);
  const now = useNowMinute();
  const review = survey.review;
  return useMemo(() => {
    if (!player || !now) return { data: null, set: null, snapshot: null };
    const data = overview(player, rows, { includeFlagged: false, review: review ?? NO_REVIEW, now });
    const set = computeInsights(player, data.rows, rows);
    const snapshot = buildSnapshot({ title: survey.title, creator: player.creator.name, isSample, data, set, now });
    return { data, set, snapshot };
  }, [player, rows, review, now, survey.title, isSample]);
}
