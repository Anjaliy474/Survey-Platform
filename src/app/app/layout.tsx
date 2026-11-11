import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StudioShell } from "@/components/studio/StudioShell";
import "@/styles/studio.css";

export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · PlaySurvey Studio" },
  robots: { index: false, follow: false },
};

/** Studio (signed-in app): sidebar, bottom tabs on phones, quiet cream canvas. */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioShell>{children}</StudioShell>;
}
