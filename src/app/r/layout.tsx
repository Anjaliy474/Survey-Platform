import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/forms.css";
import "@/styles/results.css";
import "@/styles/key-insights.css";

export const metadata: Metadata = {
  title: "Shared survey analysis · PlaySurvey",
  robots: { index: false, follow: false },
};

/** A shared, read-only analysis: no Studio chrome, only the results styles. */
export default function SharedLayout({ children }: { children: ReactNode }) {
  return children;
}
