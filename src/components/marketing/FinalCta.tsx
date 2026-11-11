import Link from "next/link";
import { Clouds } from "./Clouds";
import { MiniPoll } from "./MiniPoll";

/** M1 §10 Final call to action on the sky: one question, one button. */
export function FinalCta() {
  return (
    <section className="band band--sky final" id="final" aria-labelledby="final-title">
      <Clouds set="final" />
      <div className="wrap final__inner" data-reveal>
        <span className="eyebrow">One last question</span>
        <h2 id="final-title" className="final__title">
          Ready to make your first one?
        </h2>
        <MiniPoll />
        <Link className="btn btn--lg btn--marketing" href="/signup" prefetch={false}>
          Create a survey, free
        </Link>
      </div>
    </section>
  );
}
