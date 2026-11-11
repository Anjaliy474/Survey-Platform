import type { ReactNode } from "react";
import { Calculator, Check, CheckCircle, Ruler, ShieldCheck, Sparkle, Warning } from "@phosphor-icons/react/dist/ssr";

/**
 * Provenance and status badges (DESIGN.md §3.4, §5.3).
 * AI = words written by the model · Computed = a number from the compute engine ·
 * You approved = a human accepted it · Sample data = prototype content.
 */
const KINDS = {
  ai: { label: "AI", Icon: Sparkle, className: "badge--ai" },
  computed: { label: "Computed", Icon: Calculator, className: "badge--computed" },
  human: { label: "You approved", Icon: CheckCircle, className: "badge--human" },
  rule: { label: "Rule", Icon: Ruler, className: "badge--rule" },
  dpdp: { label: "DPDP", Icon: ShieldCheck, className: "badge--rule" },
  warning: { label: "Check", Icon: Warning, className: "badge--warning" },
  success: { label: "Clear", Icon: Check, className: "badge--success" },
  sample: { label: "Sample data", Icon: null, className: "badge--sample" },
} as const;

export type BadgeKind = keyof typeof KINDS;

export function Badge({ kind, children, className = "" }: { kind: BadgeKind; children?: ReactNode; className?: string }) {
  const { label, Icon, className: kindClass } = KINDS[kind];
  return (
    <span className={`badge ${kindClass} ${className}`}>
      {Icon && <Icon size={12} weight="bold" aria-hidden="true" />}
      {children ?? label}
    </span>
  );
}
