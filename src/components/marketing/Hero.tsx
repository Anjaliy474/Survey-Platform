import { Check, Smiley, Star } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { AnalyseLink } from "./AnalyseLink";
import { ClayToys } from "./ClayToys";
import { Clouds } from "./Clouds";
import { RotatingWord } from "./RotatingWord";
import { StoryDemo } from "./StoryDemo";

const WORDS = ["finish", "enjoy", "share", "remember"] as const;

/** M1 §1 Hero: sky, clouds, clay pieces, rotating word, and a three-scene story survey to try. */
export function Hero() {
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
          Two-minute surveys people play like a story. Insight you can act on. Try one below.
        </p>
        <div className="hero__cta">
          <Link className="btn btn--lg btn--marketing" href="/signup" prefetch={false}>
            Create a survey, free
          </Link>
          <AnalyseLink />
        </div>
      </div>

      <div className="poll-stage">
        <div className="poll-glow" aria-hidden="true" />
        <StoryDemo />
      </div>

      <ClayToys />
    </section>
  );
}
