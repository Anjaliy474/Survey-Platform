"use client";

import { DEMO_USER } from "@/lib/studio/user";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { Gear, House, Plus, PlusCircle, SidebarSimple } from "@/components/icons";
import { ToastProvider } from "@/components/ui/Toast";

/* Sidebar preference: "auto" follows the screen size (icons only on tablets). */
type SidebarPref = "auto" | "expanded" | "collapsed";
const PREF_KEY = "playsurvey:sidebar";
const prefListeners = new Set<() => void>();
function readPref(): SidebarPref {
  try {
    const v = window.localStorage.getItem(PREF_KEY);
    return v === "expanded" || v === "collapsed" ? v : "auto";
  } catch {
    return "auto";
  }
}
function setPref(v: SidebarPref) {
  try {
    window.localStorage.setItem(PREF_KEY, v);
  } catch {}
  prefListeners.forEach((l) => l());
}
function subscribePref(l: () => void) {
  prefListeners.add(l);
  return () => {
    prefListeners.delete(l);
  };
}

/** Demo creator until sign-up exists (build step 12). */
const USER = DEMO_USER;

type NavItem = { href: string; label: string; Icon: ComponentType<{ size?: number; weight?: "regular" | "fill" }>; match: (p: string) => boolean };
const HOME: NavItem = { href: "/app", label: "Home", Icon: House, match: (p) => p === "/app" || p.startsWith("/app/s/") };
const NEW: NavItem = { href: "/app/new", label: "New survey", Icon: PlusCircle, match: (p) => p.startsWith("/app/new") };
const SETTINGS: NavItem = { href: "/app/settings", label: "Settings", Icon: Gear, match: (p) => p.startsWith("/app/settings") };

/**
 * Studio shell (UI_UX_LAYOUT.md §3.3): a 248px sand sidebar (collapsible to 72px icons, icons
 * by default on tablets) on desktop, a bottom tab bar on phones. Each page draws its own top bar.
 */
export function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pref = useSyncExternalStore(subscribePref, readPref, () => "auto" as SidebarPref);

  function toggle() {
    const collapsedNow =
      pref === "collapsed" || (pref === "auto" && window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches);
    setPref(collapsedNow ? "expanded" : "collapsed");
  }
  const collapsedLabel = pref === "collapsed" ? "Expand sidebar" : "Collapse sidebar";

  const item = (n: NavItem) => {
    const active = n.match(pathname);
    return (
      <Link key={n.href} href={n.href} className="sidebar__item" aria-current={active ? "page" : undefined} title={n.label}>
        <n.Icon size={22} weight={active ? "fill" : "regular"} />
        <span className="sidebar__label">{n.label}</span>
      </Link>
    );
  };

  return (
    <ToastProvider>
      <a href="#studio-main" className="skip-link">
        Skip to content
      </a>
      <div className="studio" data-sidebar={pref}>
        <aside className="sidebar" aria-label="Studio">
          <Link href="/" className="sidebar__brand" title="PlaySurvey home">
            <span className="logo__mark" aria-hidden="true" />
            <span className="sidebar__label">PlaySurvey</span>
          </Link>
          <Link href="/app/new" className="sidebar__new" title="New survey">
            <Plus size={18} />
            <span className="sidebar__label">New survey</span>
          </Link>
          <nav className="sidebar__nav" aria-label="Main">
            {item(HOME)}
          </nav>
          <div className="sidebar__bottom">
            {item(SETTINGS)}
            <div className="sidebar__user" title={USER.name}>
              <span className="avatar" aria-hidden="true">
                {USER.initials}
              </span>
              <span className="sidebar__label">{USER.name}</span>
            </div>
            <button type="button" className="sidebar__collapse" onClick={toggle} aria-label={collapsedLabel} title={collapsedLabel}>
              <SidebarSimple size={20} weight="regular" />
            </button>
          </div>
        </aside>

        <div className="studio__main" id="studio-main">
          {children}
        </div>

        <nav className="tabbar" aria-label="Main">
          {[HOME, NEW, SETTINGS].map((n) => {
            const active = n.match(pathname);
            return (
              <Link key={n.href} href={n.href} className="tabbar__item" aria-current={active ? "page" : undefined}>
                <n.Icon size={24} weight={active ? "fill" : "regular"} />
                <span>{n.label === "New survey" ? "New" : n.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </ToastProvider>
  );
}
