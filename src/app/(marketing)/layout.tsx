import type { ReactNode } from "react";
import "@/styles/marketing.css";
import "@/styles/motion.css";

/**
 * Marketing surface (landing, later pricing and legal): loads the marketing styles and the
 * landing motion layer only here, so the Player and Studio don't download them.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return children;
}
