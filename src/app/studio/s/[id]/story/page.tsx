import { Suspense } from "react";
import { StoryStudio } from "./StoryStudio";

export const metadata = { title: "Story" };

async function WithId({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoryStudio id={id} />;
}

export default function StoryPage({ params }: PageProps<"/studio/s/[id]/story">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <WithId params={params} />
    </Suspense>
  );
}
