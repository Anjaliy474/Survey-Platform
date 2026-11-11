import Link from "next/link";
import { Clouds } from "@/components/marketing/Clouds";
import { Logo } from "@/components/marketing/Logo";

export const metadata = { title: "Page not found" };

/** E1 404: sky band, one floating clay question-mark chip, one way home. */
export default function NotFound() {
  return (
    <main className="not-found">
      <Clouds set="final" />
      <div className="not-found__logo">
        <Logo />
      </div>
      <div className="not-found__body">
        <span className="not-found__chip" aria-hidden="true">
          ?
        </span>
        <h1>We couldn’t find that page</h1>
        <p>It may have moved, or it isn’t built yet. Sign-up and the Studio are coming next.</p>
        <Link className="btn btn--lg btn--marketing" href="/">
          Go home
        </Link>
      </div>
    </main>
  );
}
