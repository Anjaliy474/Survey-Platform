import { notFound } from "next/navigation";
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

/** A page inside one survey: /app/s/:id/build, /style, /publish, /results, /themes, … */
export default async function SurveySection({ params }: PageProps<"/app/s/[id]/[section]">) {
  const { id, section } = await params;
  if (!isSection(section)) notFound();
  return <SurveySectionView id={id} section={section} />;
}
