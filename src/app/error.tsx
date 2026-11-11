"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Clouds } from "@/components/marketing/Clouds";
import { Logo } from "@/components/marketing/Logo";

/** E1 Error (UI_UX_LAYOUT.md): a calm apology, Try again and Go home. Studio work saves as you go. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="not-found">
      <Clouds set="final" />
      <div className="not-found__logo">
        <Logo />
      </div>
      <div className="not-found__body">
        <span className="not-found__chip" aria-hidden="true">
          !
        </span>
        <h1>Something went wrong on our side</h1>
        <p>Your work is saved. Try again, or head home and come back to it.</p>
        <div className="not-found__actions">
          <button type="button" className="btn btn--lg btn--marketing" onClick={() => retry()}>
            Try again
          </button>
          <Link className="btn btn--lg btn--marketing-secondary" href="/">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
