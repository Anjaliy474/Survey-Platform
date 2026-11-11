import { PlayerMessage } from "@/components/player/PlayerMessage";

export const metadata = { title: "Survey not found", robots: { index: false } };

/** Player "not found" state (DESIGN.md §7.4). */
export default function SurveyNotFound() {
  return <PlayerMessage title="We couldn’t find this survey." body="Check the link you were sent, or ask the person who shared it." />;
}
