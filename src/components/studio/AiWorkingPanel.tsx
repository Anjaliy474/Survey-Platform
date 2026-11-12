import { Badge } from "@/components/ui/Badge";

/**
 * AI working panel (DESIGN.md §5.10). The server doesn't stream stage events yet, so this
 * names the whole job honestly instead of ticking off steps it can't see.
 */
export function AiWorkingPanel({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="s-card working" role="status" aria-live="polite">
      <div className="s-row s-row--between">
        <strong>{title}</strong>
        <Badge kind="ai" />
      </div>
      <div className="working__bar" aria-hidden="true">
        <i />
      </div>
      <p className="s-help">{steps.join(" · ")}. This can take up to a minute.</p>
    </div>
  );
}
