"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChatCircleText, LinkSimple, PaperPlaneRight, SquaresFour } from "@/components/icons";
import { Badge, ComputedMark } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { askAnswer, askPlan } from "@/lib/ai/client";
import type { AskAnswer, AskCaveat } from "@/lib/ai/types";
import { useSearchParam } from "@/lib/client-hooks";
import { fieldsFor } from "@/lib/results/schema";
import { type ToolResult, runTools } from "@/lib/results/tools";
import { surveyHref } from "@/lib/studio/sections";
import { studio } from "@/lib/studio/store";
import type { StudioSurvey } from "@/lib/studio/types";
import { ResultsTabs } from "../ResultsTabs";
import { TopBar } from "../TopBar";
import { MaskedText } from "./ThemesView";
import { useResultsData } from "./ResultsView";

const CAVEAT: Record<AskCaveat, string> = {
  small_group: "Small groups",
  flagged_responses: "Flagged responses left out",
  association_not_causation: "Association, not cause",
  convenience_sample: "Self-selected sample",
  few_periods: "Only a few time points",
  not_in_survey: "Not in this survey",
};

type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "working"; steps: string[] }
  | { id: number; role: "answer"; question: string; answer: AskAnswer; results: ToolResult[]; removed: boolean; alternative: string }
  | { id: number; role: "error"; text: string };

/** Numbers in an answer show as Computed chips (they were all checked against the tool results). */
function ChippedText({ text }: { text: string }) {
  // IDs such as Q5 or R-0004 stay plain text; only standalone figures become chips.
  const parts = text.split(/((?<![\w-])[+-]?\d+(?:\.\d+)?%?(?: out of \d+)?)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^[+-]?\d/.test(p) ? (
          <span key={i} className="num-chip" title="Computed from responses">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const describeCall = (r: ToolResult) => {
  const args = Object.entries(r.args)
    .filter(([, v]) => v !== null && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return `${r.tool}(${args})`;
};

/**
 * R5 Ask your data (UI_UX_LAYOUT.md): questions in plain words, answers with every number computed
 * by code, the base always given, and the calculation one click away.
 */
export function AskView({ survey }: { survey: StudioSurvey }) {
  const toast = useToast();
  const about = useSearchParam("about");
  const { player, rows } = useResultsData(survey);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const themed = useMemo(() => new Set(Object.keys(survey.themes ?? {})), [survey.themes]);
  const fields = useMemo(() => (player ? fieldsFor(player, themed) : []), [player, themed]);

  const starters = useMemo(() => {
    const rating = fields.find((f) => f.type === "ordinal_scale");
    const group = fields.find((f) => f.type === "nominal" && (f.options?.length ?? 0) > 2) ?? fields.find((f) => f.type === "nominal");
    const list: string[] = [];
    if (about === "dashboard" && survey.dashboard) list.push(...survey.dashboard.spec.charts.filter((c) => c.type !== "kpi_tile").slice(0, 2).map((c) => `Tell me more about “${c.title}”`));
    if (rating && group) list.push(`How does ${rating.label.toLowerCase()} differ by ${group.label.toLowerCase()}?`);
    if (fields.some((f) => f.type === "themes")) list.push("What do people mention most in their written answers?");
    else if (fields.some((f) => f.type === "nps")) list.push("What is the Net Promoter Score?");
    list.push("Should we open on Sundays?");
    return [...new Set(list)].slice(0, 3);
  }, [fields, about, survey.dashboard]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [msgs]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || !player || busy) return;
    setBusy(true);
    setInput("");
    const uid = nextId.current++;
    const wid = nextId.current++;
    setMsgs((m) => [...m, { id: uid, role: "user", text: q }, { id: wid, role: "working", steps: [] }]);
    const plan = await askPlan(q, fields);
    if (!plan) {
      setMsgs((m) => m.map((x) => (x.id === wid ? { id: wid, role: "error", text: "I couldn’t reach the assistant. Try again in a moment." } : x)));
      setBusy(false);
      return;
    }
    // Code runs the tools on the data; only their results go back to the assistant.
    const results = runTools(plan.calls, { survey: player, rows, review: survey.review ?? {}, themes: survey.themes ?? {} });
    setMsgs((m) => m.map((x) => (x.id === wid ? { id: wid, role: "working", steps: results.map((r) => r.plain) } : x)));
    const res = await askAnswer(q, fields, plan, results);
    setMsgs((m) =>
      m.map((x) =>
        x.id === wid
          ? res
            ? { id: wid, role: "answer", question: q, answer: res.answer, results, removed: res.removed, alternative: plan.alternative }
            : { id: wid, role: "error", text: "I couldn’t reach the assistant. Try again in a moment." }
          : x,
      ),
    );
    setBusy(false);
  }

  function pin(m: Extract<Msg, { role: "answer" }>) {
    const chart = m.answer.suggested_chart;
    if (!chart) return;
    studio.patch(survey.id, (s) => {
      const d = s.dashboard;
      const n = (d?.spec.charts ?? []).reduce((mx, c) => Math.max(mx, Number(c.chart_id.replace(/\D/g, "")) || 0), 0) + 1;
      const c = { ...chart, chart_id: `C${n}` };
      return {
        dashboard: {
          spec: d?.spec ? { ...d.spec, charts: [...d.spec.charts, c].slice(0, 8) } : { title: "Pinned from Ask", description: "Charts pinned from Ask your data.", filters: [], charts: [c], dashboard_caveats: ["convenience_sample"] },
          mapping: d?.mapping ?? [],
          questions: d?.questions ?? [],
          flags: d?.flags ?? [],
          codeNotes: d?.codeNotes ?? [],
          accepted: d?.accepted ?? [],
          changed: [c.chart_id],
          requests: d?.requests ?? [],
          updatedAt: Date.now(),
          engine: "demo",
        },
      };
    });
    setPinned((p) => [...p, m.question]);
    toast({ message: "Pinned to the dashboard as a draft card." });
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  return (
    <>
      <TopBar
        crumbs={[{ label: "Home", href: "/app" }, { label: survey.title }]}
        status={survey.status}
        secondary={survey.slug ? [{ label: "View survey", href: `/s/${survey.slug}`, external: true, Icon: ArrowUpRight }] : []}
        primary={survey.status === "live" ? { label: "Share", Icon: LinkSimple, href: surveyHref(survey.id, "publish") } : undefined}
      />
      <ResultsTabs surveyId={survey.id} current="ask" hasResponses={rows.length > 0} />
      <div className="ask">
        <main className="ask__col">
          <h1 className="sr-only">Ask your data: {survey.title}</h1>
          {msgs.length === 0 && (
            <div className="ask__empty">
              <ChatCircleText size={32} weight="fill" aria-hidden="true" />
              <h2>Ask anything about your results</h2>
              <p>Answers use only numbers computed from your responses, and always say how many people they’re based on.</p>
              {about === "dashboard" && <span className="caveat-chip">About your dashboard</span>}
            </div>
          )}
          <ol className="ask__msgs" aria-live="polite">
            {msgs.map((m) => (
              <li key={m.id} className={`bubble-row bubble-row--${m.role === "user" ? "me" : "ai"}`}>
                {m.role === "user" && <p className="abubble abubble--me">{m.text}</p>}
                {m.role === "working" && (
                  <div className="abubble abubble--ai abubble--working" role="status">
                    <p>
                      <Badge kind="ai" /> Looking at your data…
                    </p>
                    {m.steps.length > 0 && (
                      <ul>
                        {m.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {m.role === "error" && <p className="abubble abubble--ai">{m.text}</p>}
                {m.role === "answer" && <AnswerBubble m={m} onAsk={(q) => void ask(q)} onEdit={setInput} onPin={() => pin(m)} pinned={pinned.includes(m.question)} />}
              </li>
            ))}
          </ol>
          <div ref={endRef} />
          <form className="ask__composer" onSubmit={submit}>
            {msgs.length === 0 && (
              <div className="chips" role="group" aria-label="Starter questions">
                {starters.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => void ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="ask__inputrow">
              <label htmlFor="ask-input" className="sr-only">
                Ask a question about your results
              </label>
              <input id="ask-input" className="input ask__input" placeholder="Ask a question about your results…" value={input} maxLength={400} onChange={(e) => setInput(e.target.value)} disabled={busy} />
              <button type="submit" className="btn btn--md btn--primary ask__send" disabled={busy || !input.trim()} aria-label="Send">
                <PaperPlaneRight size={20} weight="fill" aria-hidden="true" />
              </button>
            </div>
          </form>
        </main>
        <aside className="ask__rail" aria-label="Suggestions">
          <h2>Suggested questions</h2>
          <ul>
            {starters.map((s) => (
              <li key={s}>
                <button type="button" className="ask__suggest" onClick={() => void ask(s)} disabled={busy}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
          {pinned.length > 0 && (
            <>
              <h2>Pinned answers</h2>
              <ul>
                {pinned.map((p) => (
                  <li key={p} className="ask__pinned">
                    <SquaresFour size={14} weight="regular" aria-hidden="true" /> {p}
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function AnswerBubble({
  m,
  onAsk,
  onEdit,
  onPin,
  pinned,
}: {
  m: Extract<Msg, { role: "answer" }>;
  onAsk: (q: string) => void;
  onEdit: (q: string) => void;
  onPin: () => void;
  pinned: boolean;
}) {
  const a = m.answer;
  const queries = m.results.filter((r) => r.tool === "run_query");
  return (
    <div className="abubble abubble--ai">
      <div className="abubble__head">
        <Badge kind="ai" />
        {!m.removed && queries.length > 0 && <Badge kind="computed">Numbers computed</Badge>}
      </div>
      <p className="abubble__answer">{m.removed ? a.answer : <ChippedText text={a.answer} />}</p>
      {!m.removed && a.interpretation_used && (
        <p className="abubble__reading">
          I read your question as: {a.interpretation_used}
          {m.alternative && (
            <>
              {" "}
              <button type="button" className="abubble__link" onClick={() => onEdit(m.alternative)}>
                Ask it differently
              </button>
            </>
          )}
        </p>
      )}
      {a.quotes.length > 0 && (
        <ul className="quotes">
          {a.quotes.map((q) => (
            <li key={q.response_id}>
              <blockquote>
                “<MaskedText text={q.text} />”
              </blockquote>
              <span className="rid">{q.response_id}</span>
            </li>
          ))}
        </ul>
      )}
      {queries.some((r) => "with_flagged" in r.result && r.result.with_flagged && r.result.rows.length === 1) && (
        <table className="abubble__both">
          <tbody>
            {queries.map((r) =>
              "with_flagged" in r.result && r.result.with_flagged && r.result.rows.length === 1 ? (
                <tr key={r.call_id}>
                  <th scope="row">Without flagged</th>
                  <td>
                    {r.result.rows[0].value} (n = {r.result.rows[0].n})
                  </td>
                  <th scope="row">With flagged</th>
                  <td>
                    {r.result.with_flagged.rows[0].value} (n = {r.result.with_flagged.rows[0].n})
                  </td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      )}
      {a.caveats.length > 0 && (
        <div className="abubble__chips">
          {a.caveats.map((c) => (
            <span key={c} className="caveat-chip">
              {CAVEAT[c]}
            </span>
          ))}
        </div>
      )}
      {!m.removed && m.results.length > 0 && (
        <details className="abubble__how">
          <summary>Show how this was calculated</summary>
          {m.results.map((r) => (
            <div key={r.call_id} className="abubble__call">
              <code>{describeCall(r)}</code>
              {"rows" in r.result && (
                <ul>
                  {r.result.rows.map((row) => (
                    <li key={row.group}>
                      {row.group}: {row.value} · n = {row.n}
                      {row.small && " · small group"}
                    </li>
                  ))}
                </ul>
              )}
              {"rows" in r.result && r.result.with_flagged && (
                <>
                  <p className="abubble__sub">Including the {r.result.with_flagged.flagged_count} flagged responses:</p>
                  <ul>
                    {r.result.with_flagged.rows.map((row) => (
                      <li key={row.group}>
                        {row.group}: {row.value} · n = {row.n}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {"themes" in r.result && r.result.available && (
                <ul>
                  {r.result.themes.map((t) => (
                    <li key={t.label}>
                      {t.label}: {t.count} · {t.share}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <p className="field__help">
            Every number above comes from code <ComputedMark />; the assistant only chose what to count and wrote the words.
          </p>
        </details>
      )}
      <div className="abubble__actions">
        {a.suggested_chart && !m.removed && (
          <button type="button" className="btn btn--sm btn--secondary" onClick={onPin} disabled={pinned}>
            <SquaresFour size={16} weight="regular" aria-hidden="true" /> {pinned ? "Pinned" : "Pin to dashboard"}
          </button>
        )}
        {a.follow_up_suggestions.map((f) => (
          <button key={f} type="button" className="chip" onClick={() => onAsk(f)}>
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
