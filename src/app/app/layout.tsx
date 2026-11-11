import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StudioShell } from "@/components/studio/StudioShell";
import "@/styles/forms.css";
import "@/styles/studio.css";
import "@/styles/studio-create.css";
import "@/styles/builder.css";
import "@/styles/player-shell.css";

export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · PlaySurvey Studio" },
  robots: { index: false, follow: false },
};

/** Studio (signed-in app): sidebar, bottom tabs on phones, quiet cream canvas. */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioShell>{children}</StudioShell>;
}
