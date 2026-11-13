import type { ReactNode } from "react";
import "@/styles/player-shell.css";
// Story Mode surveys (from the /studio Studio) share this route.
import "@/styles/story.css";

/** Public survey Player: no marketing or Studio chrome, only the Player styles. */
export default function PlayerLayout({ children }: { children: ReactNode }) {
  return children;
}
