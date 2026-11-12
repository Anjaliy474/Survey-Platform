import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayerApp } from "./PlayerApp";

export const metadata: Metadata = { title: "Survey", robots: { index: false } };

async function Slug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PlayerApp slug={slug} />;
}

/** Public Player (UI_UX_LAYOUT.md P1). The survey loads on the client so answers can resume offline. */
export default function SurveyPage({ params }: PageProps<"/s/[slug]">) {
  return (
    <Suspense fallback={<main className="player theme-marigold" aria-busy="true" />}>
      <Slug params={params} />
    </Suspense>
  );
}
