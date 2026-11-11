import { Plus } from "@phosphor-icons/react/dist/ssr";

const FAQS = [
  {
    q: "Will the playful format change my results?",
    a: "No. The wording, options and scale of every question stay exactly as you approved them. We only change how they’re shown. There are no points, prizes or timers, because those push people toward certain answers or make them rush.",
  },
  {
    q: "Where do the numbers come from?",
    a: "From code that counts and calculates your real responses. The AI writes words, like theme names and explanations, and every number carries a “Computed” tag so you can tell the difference.",
  },
  {
    q: "Do respondents need an app?",
    a: "No. They open a link in any phone browser, including straight from WhatsApp.",
  },
  {
    q: "What about personal data?",
    a: "We ask only for what your goal needs, make it optional, and show a clear purpose and consent line, in line with India’s DPDP rules. Responses can be deleted on request.",
  },
  {
    q: "Can I bring my Google Form?",
    a: "For now, paste your questions and we’ll suggest improvements. Direct import from Google Forms is on our roadmap.",
  },
  {
    q: "Hindi and regional languages?",
    a: "Planned for a later version. The design and copy are already written so they translate cleanly.",
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
