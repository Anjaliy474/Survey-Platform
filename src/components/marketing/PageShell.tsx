import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";

/** Simple marketing pages (pricing, privacy, terms): a light header, one column, the footer. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="page-shell__head">
        <div className="wrap page-shell__bar">
          <Logo />
          <nav className="page-shell__nav" aria-label="Account">
            <Link href="/login" prefetch={false}>
              Log in
            </Link>
            <Link className="btn btn--md btn--marketing" href="/signup" prefetch={false}>
              Get started free
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className="page-shell">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
