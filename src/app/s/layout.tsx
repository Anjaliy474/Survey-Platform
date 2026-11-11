import type { ReactNode } from "react";
import "@/styles/player-shell.css";

/** Public survey Player: no marketing or Studio chrome, only the Player styles. */
export default function PlayerLayout({ children }: { children: ReactNode }) {
  return children;
}
