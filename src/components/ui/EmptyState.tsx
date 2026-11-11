import type { ReactNode } from "react";

/**
 * Empty state (DESIGN.md §5.9): centred, max 420px, one small clay object on a soft sky disc,
 * an h2, one line of text and one main action. Never a blank area.
 */
export function EmptyState({
  symbol,
  title,
  children,
  actions,
  headingLevel = 2,
}: {
  symbol: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="empty">
      <div className="empty__disc" aria-hidden="true">
        <span className="empty__chip">{symbol}</span>
      </div>
      <Heading className="empty__title">{title}</Heading>
      {children && <div className="empty__text">{children}</div>}
      {actions && <div className="empty__actions">{actions}</div>}
    </div>
  );
}
