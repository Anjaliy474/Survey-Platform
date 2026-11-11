import { Plus } from "@phosphor-icons/react/dist/ssr";

const FAQS = [
  {
    q: "Will the playful format change my results?",
    a: "No. Wording, options and scales stay exactly as approved. Only the look changes, and there are no points, prizes or timers.",
  },
  {
    q: "Where do the numbers come from?",
    a: "From code, counting your real responses. AI only writes words. Every number carries a “Computed” tag.",
  },
  {
    q: "Do respondents need an app?",
    a: "No. Any phone browser works, straight from WhatsApp.",
  },
  {
    q: "What about personal data?",
    a: "Only what your goal needs, always optional, with clear consent under India’s DPDP rules. Deletable on request.",
  },
  {
    q: "Can I bring my Google Form?",
    a: "Paste your questions for now. Direct import is on the roadmap.",
  },
  {
    q: "Hindi and regional languages?",
    a: "Coming later. The copy is written to translate cleanly.",
  },
];

/** M1 §9 FAQ: six native accordion items (details/summary, works without JS). */
export function Faq() {
  return (
    <section className="band band--mist faq" id="faq" aria-labelledby="faq-title">
      <div className="wrap">
        <div className="section-head section-head--center" data-reveal>
          <span className="eyebrow">FAQ</span>
          <h2 id="faq-title" className="section-head__title">
            Questions, answered briefly
          </h2>
        </div>
        <div className="faq__list">
          {FAQS.map((item) => (
            <details key={item.q} className="faq__item" data-reveal>
              <summary>
                <span>{item.q}</span>
                <span className="faq__icon" aria-hidden="true">
                  <Plus size={18} weight="bold" />
                </span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
