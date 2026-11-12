import type { Metadata } from "next";
import Link from "next/link";
import { House, Plus } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/marketing/Logo";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Studio · PlaySurvey" }, robots: { index: false } };

/** Studio shell (UI_UX_LAYOUT.md §3.3). One shared demo workspace, no sign-in yet. */
export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <div className="studio">
      <aside className="studio__side">
        <Logo />
        <nav className="studio__nav" aria-label="Studio">
          <Link href="/studio">
            <House size={20} weight="regular" aria-hidden="true" /> Home
          </Link>
          <Link href="/studio/new">
            <Plus size={20} weight="bold" aria-hidden="true" /> New survey
          </Link>
        </nav>
        <p className="s-help studio__brand-note" style={{ marginTop: "auto" }}>
          Demo workspace. Anyone with the link can see these surveys.
        </p>
      </aside>
      <main className="studio__main" id="main">
        <div className="studio__wrap">{children}</div>
      </main>
    </div>
  );
}
