import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

/** Placeholder for a Studio page that a later build step will fill in. */
export function ComingSoon({ title, about, spec, children }: { title: string; about: string; spec: string; children?: ReactNode }) {
  return (
    <EmptyState
      symbol="✦"
      title={`${title} is coming next`}
      actions={
        <>
          <Link href="/app" className="btn btn--md btn--secondary">
            Back to your surveys
          </Link>
          {children}
        </>
      }
    >
      <p>{about}</p>
      <p className="empty__spec">UI_UX_LAYOUT.md {spec}</p>
    </EmptyState>
  );
}
