"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ChartBar, Check, Lightbulb, Lightning, Star } from "@/components/icons";
import type { IconProps } from "@/components/icons";
import type { ComponentType } from "react";
import { GOALS, ROLES, type Role, account, safeNext, useMe } from "@/lib/account";
import { useSearchParam } from "@/lib/client-hooks";

const ROLE_ICON: Record<Role, ComponentType<IconProps>> = { business: Lightning, researcher: Lightbulb, community: Star, analyst: ChartBar };
const START_FOR: Record<Role, string> = { business: "Quick prompt", researcher: "Describe your research", community: "Quick prompt", analyst: "Bring your questions" };

/**
 * A2 Onboarding (UI_UX_LAYOUT.md): three skippable steps in under 30 seconds. Choices save as
 * they're made, so going back keeps them. Nothing personal is asked beyond the account.
 */
export function Onboarding() {
  const router = useRouter();
  const me = useMe();
  const [step, setStep] = useState(0);
  const role = me?.role ?? null;
  const goal = me?.goal ?? null;

  // Came from a page that needed an account (?next=…): finish there.
  const next = safeNext(useSearchParam("next"));
  const finish = (href: string) => {
    account.update({ onboarded: true });
    router.push(next ?? href);
  };

  return (
    <div className="onboard">
      <div className="onboard__top">
        <ol className="onboard__dots" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <li key={i} className={i === step ? "is-on" : i < step ? "is-done" : ""} aria-current={i === step ? "step" : undefined} />
          ))}
        </ol>
        <button type="button" className="btn btn--ghost" onClick={() => finish("/app")}>
          Skip
        </button>
      </div>

      {step === 0 && (
        <section aria-labelledby="ob-1">
          <h1 id="ob-1">What best describes you?</h1>
          <p className="onboard__sub">We’ll suggest the best way to start. You can change it later in Settings.</p>
          <div className="onboard__tiles" role="radiogroup" aria-labelledby="ob-1">
            {ROLES.map((r) => {
              const Icon = ROLE_ICON[r.value];
              return (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={role === r.value}
                  className="onboard__tile"
                  onClick={() => {
                    account.update({ role: r.value });
                    setStep(1);
                  }}
                >
                  <span className="onboard__icon" aria-hidden="true">
                    <Icon size={26} weight="regular" />
                  </span>
                  <strong>{r.label}</strong>
                  <span>{r.about}</span>
                  {role === r.value && (
                    <span className="onboard__check" aria-hidden="true">
                      <Check size={14} weight="bold" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="ob-2">
          <h1 id="ob-2">What’s your first survey about?</h1>
          <div className="chips" role="group" aria-labelledby="ob-2">
            {GOALS.map((g) => (
              <button key={g} type="button" className="chip" aria-pressed={goal === g} onClick={() => account.update({ goal: g })}>
                {g}
              </button>
            ))}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="ob-note">
              Anything to add? <span className="field__optional">(optional)</span>
            </label>
            <input
              id="ob-note"
              className="input"
              maxLength={140}
              placeholder="For example: feedback on our weekend menu"
              value={me?.goalNote ?? ""}
              onChange={(e) => account.update({ goalNote: e.target.value })}
            />
          </div>
          <div className="onboard__nav">
            <button type="button" className="btn btn--md btn--secondary" onClick={() => setStep(0)}>
              <ArrowLeft size={18} weight="bold" aria-hidden="true" /> Back
            </button>
            <button type="button" className="btn btn--md btn--primary" onClick={() => setStep(2)}>
              Next <ArrowRight size={18} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="ob-3">
          <h1 id="ob-3">You’re set</h1>
          <ul className="onboard__summary">
            <li>
              <span>You</span>
              <strong>{ROLES.find((r) => r.value === role)?.label ?? "Not chosen"}</strong>
            </li>
            <li>
              <span>First survey</span>
              <strong>
                {goal ?? "Not chosen"}
                {me?.goalNote ? `: ${me.goalNote}` : ""}
              </strong>
            </li>
            {role && (
              <li>
                <span>Suggested start</span>
                <strong>{START_FOR[role]}</strong>
              </li>
            )}
          </ul>
          <div className="onboard__nav">
            <button type="button" className="btn btn--md btn--secondary" onClick={() => setStep(1)}>
              <ArrowLeft size={18} weight="bold" aria-hidden="true" /> Back
            </button>
            <button type="button" className="btn btn--lg btn--primary" onClick={() => finish(`/app/new${role ? `?role=${role}` : ""}`)}>
              Start my first survey
            </button>
          </div>
          <p className="onboard__fine">
            Or{" "}
            <Link href={next ?? "/app"} className="link" onClick={() => account.update({ onboarded: true })}>
              look at the sample surveys first
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
