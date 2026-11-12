import { Check } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

const STEPS = [
  { id: "questions", label: "Questions" },
  { id: "story", label: "Story" },
  { id: "publish", label: "Publish" },
  { id: "results", label: "Results" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

/** Step rail (DESIGN.md §5.11): done steps link back; Results stays locked until published. */
export function StepRail({ surveyId, current, reached, storyBlocked }: { surveyId: string; current: StepId; reached: StepId; storyBlocked?: boolean }) {
  const order = STEPS.map((s) => s.id);
  const reachedAt = order.indexOf(reached);
  return (
    <nav aria-label="Create steps">
      <ol className="rail">
        {STEPS.map((s, i) => {
          const done = i < order.indexOf(current) && i <= reachedAt;
          const isCurrent = s.id === current;
          const skipped = s.id === "story" && storyBlocked;
          const dot = <span className="rail__dot">{done ? <Check size={14} weight="bold" aria-hidden="true" /> : i + 1}</span>;
          const label = skipped ? `${s.label} (off)` : s.label;
          return (
            <li key={s.id} className={`${done ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`} aria-current={isCurrent ? "step" : undefined}>
              {i <= reachedAt && !isCurrent && !skipped ? (
                <Link href={`/studio/s/${surveyId}/${s.id}`} style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "inherit" }}>
                  {dot}
                  {label}
                </Link>
              ) : (
                <>
                  {dot}
                  {label}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
