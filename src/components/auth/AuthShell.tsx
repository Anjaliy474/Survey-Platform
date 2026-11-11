import type { ReactNode } from "react";
import { Clouds } from "@/components/marketing/Clouds";
import { Logo } from "@/components/marketing/Logo";

/**
 * Auth shell (UI_UX_LAYOUT.md §3.2): on desktop a sky panel with three floating clay objects
 * and one line, the form on the right; on phones the form with a thin sky strip on top.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth__sky" aria-hidden="true">
        <Clouds set="band" />
        <span className="auth__toy auth__toy--chip">?</span>
        <span className="auth__toy auth__toy--pill">
          <i />
          <i />
          <i />
        </span>
        <span className="auth__toy auth__toy--face">🙂</span>
        <p className="auth__line">Surveys people actually finish</p>
      </aside>
      <div className="auth__side">
        <div className="auth__logo">
          <Logo />
        </div>
        <main className="auth__main">{children}</main>
      </div>
    </div>
  );
}
