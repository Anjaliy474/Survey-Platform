import { ArrowDown, Check, Smiley, Star } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { PollStats } from "@/lib/demo-poll";
import { ClayToys } from "./ClayToys";
import { Clouds } from "./Clouds";
import { LivePoll } from "./LivePoll";
import { RotatingWord } from "./RotatingWord";

const WORDS = ["finish", "enjoy", "share", "remember"] as const;

/** M1 §1 Hero: sky, clouds, clay pieces, rotating word, and the live poll card. */
export function Hero({ stats }: { stats: PollStats }) {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <Clouds set="hero" />

      <div className="wrap hero__copy">
        <h1 id="hero-title" className="hero__title">
          <span className="sr-only">Surveys people actually finish</span>
          <span aria-hidden="true">
            Surveys{" "}
            <span className="hero-chips">
              <span className="hero-chip hero-chip--teal">
                <Check weight="bold" />
              </span>
              <span className="hero-chip hero-chip--marigold">
                <Star weight="fill" />
              </span>
              <span className="hero-chip hero-chip--persimmon">
                <Smiley weight="bold" />
              </span>
            </span>{" "}
            people actually <RotatingWord words={WORDS} />
          </span>
        </h1>
        <p className="hero__sub">
          Two-minute, game-like surveys. Insight you can act on. Try one below.
        </p>
        <div className="hero__cta">
          <Link className="btn btn--lg btn--marketing" href="/studio/new" prefetch={false}>
            Create a survey, free
          </Link>
          <a className="btn btn--lg btn--marketing-secondary" href="#creator">
            See what creators get <ArrowDown size={16} weight="bold" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="poll-stage">
        <div className="poll-glow" aria-hidden="true" />
        <LivePoll stats={stats} />
      </div>

      <ClayToys />
    </section>
  );
}
