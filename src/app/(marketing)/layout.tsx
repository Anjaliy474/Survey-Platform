import type { ReactNode } from "react";
import "@/styles/marketing.css";

/** Marketing surface (landing, later pricing and legal): loads the marketing styles only here. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return children;
}
