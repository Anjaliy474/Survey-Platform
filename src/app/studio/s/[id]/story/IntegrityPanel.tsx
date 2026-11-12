import { CheckCircle, XCircle } from "@phosphor-icons/react/dist/ssr";
import type { ValidationFailure } from "@/lib/story/validate-world";

/** The eight integrity rules (spec §3) plus copy and budget checks, mapped from validator rule ids. */
const ROWS: { label: string; rules: string[] }[] = [
  { label: "Questions show word for word", rules: [] },
  { label: "Same order as approved", rules: ["coverage"] },
  { label: "Every answer treated alike", rules: [] },
  { label: "Options look equal", rules: ["prop_family"] },
  { label: "No points, prizes or timers", rules: ["banned"] },
  { label: "Honest time on the title card", rules: ["time_budget"] },
  { label: "Plain form one tap away", rules: [] },
  { label: "Purpose and consent shown first", rules: [] },
  { label: "Chapters hold 1 to 4 questions, open ones alone", rules: ["chapter_size", "open_alone"] },
  { label: "Each answer style fits its question", rules: ["mechanic"] },
  { label: "Scenes and objects exist", rules: ["catalogue"] },
  { label: "Copy is short, with no numbers", rules: ["copy_length", "copy_empty", "digits", "tokens"] },
  { label: "Page weight within budget", rules: ["size_budget"] },
];

export function IntegrityPanel({ failures, onFix }: { failures: ValidationFailure[]; onFix: (f: ValidationFailure) => void }) {
  return (
    <section className="s-card" aria-labelledby="integrity-title">
      <h2 id="integrity-title" style={{ fontSize: "1.125rem" }}>
        Integrity checks
      </h2>
      <ul className="checks">
        {ROWS.map((row) => {
          const hits = failures.filter((f) => row.rules.includes(f.rule));
          return (
            <li key={row.label}>
              {hits.length ? (
                <XCircle className="bad" size={20} weight="fill" aria-label="Fails" />
              ) : (
                <CheckCircle className="ok" size={20} weight="fill" aria-label="Passes" />
              )}
              <span style={{ display: "grid", gap: 4 }}>
                {row.label}
                {hits.map((f, i) => (
                  <span key={i} className="s-help">
                    {f.message}{" "}
                    {(f.chapterId || f.questionId) && (
                      <button type="button" className="btn btn--sm btn--ghost" onClick={() => onFix(f)}>
                        Fix
                      </button>
                    )}
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
