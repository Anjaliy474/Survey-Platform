import { Onboarding } from "@/components/auth/Onboarding";
import { Clouds } from "@/components/marketing/Clouds";
import { Logo } from "@/components/marketing/Logo";

export const metadata = { title: "Welcome" };

/** A2 Onboarding (UI_UX_LAYOUT.md): a centred card on a soft sky. */
export default function OnboardingPage() {
  return (
    <div className="onboard-page">
      <Clouds set="final" />
      <div className="onboard-page__logo">
        <Logo />
      </div>
      <main className="onboard-page__card">
        <Onboarding />
      </main>
    </div>
  );
}
