import Link from "next/link";
import type { ThemeName } from "@/lib/player/types";

/**
 * Friendly full-screen Player states (DESIGN.md §7.4): survey closed, not found, not ready.
 * Same column, same theme, one line of help and a way to PlaySurvey.
 */
export function PlayerMessage({
  title,
  body,
  theme = "marigold",
  symbol = "?",
  details,
}: {
  title: string;
  body: string;
  theme?: ThemeName;
  symbol?: string;
  details?: string[];
}) {
  return (
    <div className={`player theme-${theme}`}>
      <main className="player__main pl-message">
        <span className="pl-message__chip" aria-hidden="true">
          {symbol}
        </span>
        <h1 className="pl-welcome__title">{title}</h1>
        <p className="pl-purpose">{body}</p>
        {details && details.length > 0 && (
          <ul className="pl-message__details">
            {details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
        <Link href="/" prefetch={false} className="pl-madewith">
          Made with PlaySurvey
        </Link>
      </main>
    </div>
  );
}
