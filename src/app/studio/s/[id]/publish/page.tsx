import { Suspense } from "react";
import { PublishStep } from "./PublishStep";

export const metadata = { title: "Publish" };

async function WithId({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublishStep id={id} />;
}

export default function PublishPage({ params }: PageProps<"/studio/s/[id]/publish">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <WithId params={params} />
    </Suspense>
  );
}
