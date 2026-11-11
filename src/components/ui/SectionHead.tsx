import type { ReactNode } from "react";

/** Eyebrow + display title + intro, max 640px (DESIGN.md §9). */
export function SectionHead({
  id,
  eyebrow,
  title,
  children,
  center = false,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`section-head ${center ? "section-head--center" : ""}`} data-reveal>
      <span className="eyebrow">{eyebrow}</span>
      <h2 id={id} className="section-head__title">
        {title}
      </h2>
      {children && <p className="section-head__intro">{children}</p>}
    </div>
  );
}
