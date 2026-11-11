"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "@/components/icons";

const PLANS = [
  {
    name: "Free",
    for: "For trying it out and small surveys",
    features: ["Unlimited surveys", "All 4 styles and 3 themes", "AI question help and bias check", "Results overview and themes", "Up to a monthly response limit (to be decided)"],
    cta: { label: "Start free", href: "/signup" },
  },
  {
    name: "Pro",
    for: "For teams who run surveys every month",
    features: ["Everything in Free", "More responses each month", "Dashboards from plain words", "Ask your data and insight reports", "Your own colours and logo"],
    cta: { label: "Start free, upgrade later", href: "/signup" },
  },
] as const;

/** M2 Pricing (UI_UX_LAYOUT.md): two plans, an INR/USD toggle, and honest "To be decided" prices. */
export function PricingPlans() {
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  return (
    <>
      <div className="pricing__toggle segmented" role="group" aria-label="Currency">
        {(["INR", "USD"] as const).map((c) => (
          <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)}>
            {c === "INR" ? "₹ INR" : "$ USD"}
          </button>
        ))}
      </div>
      <div className="pricing__plans">
        {PLANS.map((p) => (
          <section key={p.name} className={`plan ${p.name === "Pro" ? "plan--pro" : ""}`} aria-labelledby={`plan-${p.name}`}>
            <h2 id={`plan-${p.name}`}>{p.name}</h2>
            <p className="plan__for">{p.for}</p>
            <p className="plan__price">
              <span className="plan__amount">{p.name === "Free" ? (currency === "INR" ? "₹0" : "$0") : "To be decided"}</span>
              {p.name === "Pro" && <span className="plan__note">Price in {currency === "INR" ? "rupees" : "US dollars"} once the team sets it.</span>}
            </p>
            <ul className="plan__features">
              {p.features.map((f) => (
                <li key={f}>
                  <Check size={16} weight="bold" aria-hidden="true" /> {f}
                </li>
              ))}
            </ul>
            <Link href={p.cta.href} prefetch={false} className={`btn btn--lg ${p.name === "Pro" ? "btn--marketing" : "btn--marketing-secondary"}`}>
              {p.cta.label}
            </Link>
          </section>
        ))}
      </div>
    </>
  );
}
