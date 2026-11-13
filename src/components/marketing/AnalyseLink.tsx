"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useMe } from "@/lib/account";

/** "Analyse your data": straight to the page when logged in, through Log in first otherwise. */
export function AnalyseLink() {
  const me = useMe();
  const href = me?.signedIn ? "/app/analyse" : `/login?next=${encodeURIComponent("/app/analyse")}`;
  return (
    <Link className="btn btn--lg btn--marketing-secondary" href={href} prefetch={false}>
      Analyse your data <ArrowRight size={16} weight="bold" aria-hidden="true" />
    </Link>
  );
}
