import { Calculator, CheckCircle, Quotes, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import type { CSSProperties } from "react";
import { Badge, type BadgeKind } from "@/components/ui/Badge";

const ITEMS: { badge: BadgeKind; Icon: typeof Calculator; tone: string; title: string; body: string }[] = [
  {
    badge: "computed",
    Icon: Calculator,
    tone: "computed",
    title: "Numbers from code",
    body: "Calculated from your responses. Never invented.",
  },
  {
    badge: "ai",
    Icon: Quotes,
    tone: "ai",
    title: "Quotes you can trace",
    body: "Every theme links to real quotes.",
  },
  {
    badge: "human",
    Icon: CheckCircle,
    tone: "human",
    title: "You decide",
    body: "Nothing changes until you accept.",
  },
  {
    badge: "dpdp",
    Icon: ShieldCheck,
    tone: "rule",
    title: "Consent built in",
    body: "Minimal data, clear consent, DPDP-ready.",
  },
];

/** M1 §6 Trust strip: the four provenance promises. */
export function TrustStrip() {
  return (
    <section className="band trust" id="trust" aria-labelledby="trust-title">
      <div className="wrap">
        <h2 id="trust-title" className="trust__title" data-reveal>
          Built so you can trust the result
        </h2>
        <ul className="trust__grid">
          {ITEMS.map(({ badge, Icon, tone, title, body }, i) => (
            <li key={title} className="card trust__card" data-reveal style={{ "--reveal-delay": `${i * 70}ms` } as CSSProperties}>
              <span className={`trust__icon trust__icon--${tone}`} aria-hidden="true">
                <Icon size={24} weight="duotone" />
              </span>
              <Badge kind={badge} />
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
