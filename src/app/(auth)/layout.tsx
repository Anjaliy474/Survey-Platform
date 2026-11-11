import type { ReactNode } from "react";
import "@/styles/forms.css";
import "@/styles/auth.css";

/** Auth surface (sign-up, log-in, onboarding): its own styles, nothing from the Studio. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
