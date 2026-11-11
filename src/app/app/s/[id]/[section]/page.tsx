import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SurveySectionView } from "@/components/studio/SurveySectionView";
import { SECTIONS, SECTION_INFO, isSection } from "@/lib/studio/sections";

const SAMPLE_IDS = ["cafe-feedback", "volunteer-feedback", "fest-food", "laundry-pickup", "canteen-menu-poll"];

export function generateStaticParams() {
  return SAMPLE_IDS.flatMap((id) => SECTIONS.map((section) => ({ id, section })));
}

export async function generateMetadata({ params }: PageProps<"/app/s/[id]/[section]">) {
  const { section } = await params;
  return { title: isSection(section) ? SECTION_INFO[section].title : "Not found" };
}

/**
 * A page inside one survey: /app/s/:id/build, /style, /publish, /results, /themes, …
 * The URL is read inside <Suspense> so the shared shell stays URL-independent (Next 16).
 */
export default function SurveySection({ params }: PageProps<"/app/s/[id]/[section]">) {
  return (
    <Suspense fallback={<SectionLoading />}>
      <SectionFromUrl params={params} />
    </Suspense>
  );
}

async function SectionFromUrl({ params }: { params: PageProps<"/app/s/[id]/[section]">["params"] }) {
  const { id, section } = await params;
  if (!isSection(section)) notFound();
  return <SurveySectionView id={id} section={section} />;
}

function SectionLoading() {
  return (
    <main className="page" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <span className="skeleton" style={{ width: "40%", height: 28, marginBottom: 24 }} />
      <span className="skeleton" style={{ width: "100%", height: 220 }} />
    </main>
  );
}
