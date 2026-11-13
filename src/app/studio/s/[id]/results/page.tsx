import { Suspense } from "react";
import { StoryVsPlain } from "./StoryVsPlain";

export const metadata = { title: "Results" };

async function WithId({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoryVsPlain id={id} />;
}

export default function ResultsPage({ params }: PageProps<"/studio/s/[id]/results">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <WithId params={params} />
    </Suspense>
  );
}
