import Link from "next/link";
import { Logo } from "./Logo";

async function CurrentYear() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#ways" },
      { label: "Styles", href: "#vibe" },
      { label: "Who it's for", href: "#who" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our principles", href: "#trust" },
      { label: "Try the demo poll", href: "#top" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
] as const;

/** Footer on a light band: logo, 3 link columns, "Made in Hyderabad", © year (§3.1). */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__grid">
        <div className="site-footer__brand">
          <Logo />
          <p>Short, playful surveys people actually finish, and insight you can trust.</p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title} className="site-footer__col">
            <h2>{col.title}</h2>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") ? (
                    <Link href={l.href} prefetch={false}>
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href}>{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="wrap site-footer__base">
        <span>Made in Hyderabad · Team 3, PD3.401 AI for Product Managers, IIIT Hyderabad</span>
        <span>
          © <CurrentYear /> PlaySurvey. Numbers and quotes on this page are sample data.
        </span>
      </div>
    </footer>
  );
}
