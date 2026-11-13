import { Suspense } from "react";
import { QuestionReview } from "./QuestionReview";

export const metadata = { title: "Questions" };

async function WithId({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuestionReview id={id} />;
}

export default function QuestionsPage({ params }: PageProps<"/studio/s/[id]/questions">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <WithId params={params} />
    </Suspense>
  );
}
