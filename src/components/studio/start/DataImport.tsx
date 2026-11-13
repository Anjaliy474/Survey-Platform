"use client";

import { useRouter } from "next/navigation";
import { type DragEvent, useId, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Plus } from "@/components/icons";
import { useMe } from "@/lib/account";
import { optionsFor, scaleLabels } from "@/lib/player/rules";
import { getSurvey } from "@/lib/player/samples";
import { sampleResponses } from "@/lib/results/data";
import { type ColumnPlan, KIND_LABEL, MAX_ROWS, buildDataset, inferColumns, parseTable, toCsv } from "@/lib/results/importer";
import { surveyHref } from "@/lib/studio/sections";
import { studio } from "@/lib/studio/store";

type Loaded = { fileName: string; header: string[]; rows: string[][]; plan: ColumnPlan[]; total: number };

/** "Analyse existing data": a CSV file or pasted spreadsheet rows, straight to the analysis. */
export function DataImport() {
  const router = useRouter();
  const me = useMe();
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState("");
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);

  function load(text: string, fileName: string) {
    setError("");
    const { header, rows } = parseTable(text);
    if (header.length < 1 || rows.length < 1) {
      setError("We couldn’t find a header row and at least one response. The first row should hold the question names.");
      return;
    }
    const plan = inferColumns(header, rows);
    if (!plan.some((p) => p.kind !== "skip" && p.kind !== "timestamp" && p.kind !== "personal")) {
      setError("None of the columns look like answers we can chart. Check the first row holds the questions.");
      return;
    }
    setLoaded({ fileName, header, rows, plan, total: rows.length });
  }

  async function readFile(file: File) {
    if (/\.(xlsx|xls|numbers|ods)$/i.test(file.name)) {
      setError("Save it as CSV first: in Google Sheets, File → Download → CSV; in Excel, Save As → CSV. Or copy the cells and paste them below.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("That file is over 8 MB. Split it, or keep the columns you want to analyse.");
      return;
    }
    load(await file.text(), file.name);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) void readFile(file);
  }

  function useSample() {
    const survey = getSurvey("cafe-feedback");
    if (!survey) return;
    const rows = (sampleResponses(survey, Date.now()) ?? []).filter((r) => r.submittedAt !== null);
    const header = ["Timestamp", ...survey.questions.map((q) => q.text)];
    const body = rows.map((r) => {
      const d = new Date(r.submittedAt as number);
      const time = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
      return [
        time,
        ...survey.questions.map((q) => {
          const a = r.answers[q.id];
          if (a === undefined) return "";
          if (q.type === "nps_0_10") return String(a);
          if (q.type === "rating_scale") return scaleLabels(q)[a as number] ?? "";
          if (Array.isArray(a)) return a.map((i) => optionsFor(q)[i]).join(", ");
          if (typeof a === "number") return optionsFor(q)[a] ?? "";
          return String(a);
        }),
      ];
    });
    load(toCsv(header, body), "cafe-feedback-sample.csv");
  }

  function setKind(index: number, leaveOut: boolean) {
    if (!loaded) return;
    const fresh = inferColumns(loaded.header, loaded.rows)[index];
    setLoaded({ ...loaded, plan: loaded.plan.map((p) => (p.index === index ? (leaveOut ? { ...p, kind: "skip" } : fresh) : p)) });
  }

  function analyse() {
    if (!loaded) return;
    setBusy(true);
    const title = loaded.fileName.replace(/\.(csv|tsv|txt)$/i, "").replace(/[-_]+/g, " ").trim() || "Imported data";
    const survey = studio.createImported({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      fileName: loaded.fileName,
      build: (slug) => buildDataset({ title, slug, creator: me?.name || "You", rows: loaded.rows, plan: loaded.plan, now: Date.now() }),
    });
    router.push(surveyHref(survey.id, "results"));
  }

  if (loaded) {
    const kept = loaded.plan.filter((p) => p.kind !== "skip");
    const analysed = loaded.plan.filter((p) => p.kind !== "skip" && p.kind !== "timestamp" && p.kind !== "personal").length;
    const rows = Math.min(loaded.total, MAX_ROWS);
    return (
      <div className="start-data start-data__card">
        <div className="start-data__found">
          <p>
            <strong>{loaded.fileName}</strong>: {rows} {rows === 1 ? "response" : "responses"}, {analysed} {analysed === 1 ? "question" : "questions"} to analyse
            {loaded.total > MAX_ROWS ? ` (the first ${MAX_ROWS} rows)` : ""}.
          </p>
          <button type="button" className="start__textbtn" onClick={() => setLoaded(null)}>
            Use a different file
          </button>
        </div>
        <ul className="start-data__cols" aria-label="Columns we found">
          {loaded.plan.map((p) => (
            <li key={p.index} className={p.kind === "skip" ? "is-off" : undefined}>
              <span className="start-data__name">{p.name}</span>
              <span className={`start-data__kind start-data__kind--${p.kind}`}>{KIND_LABEL[p.kind]}</span>
              {p.kind !== "timestamp" && (
                <label className="start-data__use">
                  <input type="checkbox" checked={p.kind !== "skip"} onChange={(e) => setKind(p.index, !e.target.checked)} />
                  <span className="sr-only">Include {p.name}</span>
                </label>
              )}
            </li>
          ))}
        </ul>
        <p className="start__fine">Personal columns (emails, phone numbers, names) are kept private: never charted, never sent to AI.</p>
        <button type="button" className="btn btn--lg btn--primary start-data__go" onClick={analyse} disabled={busy || !kept.length}>
          Analyse {rows} {rows === 1 ? "response" : "responses"} <ArrowRight size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="start-data">
      <div
        className={`composer${drag ? " is-drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <label className="sr-only" htmlFor={`${id}-paste`}>
          Paste rows from Excel or Google Sheets, or drop a CSV file
        </label>
        <textarea
          id={`${id}-paste`}
          className="composer__input"
          rows={4}
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={drag ? "Drop it here" : "Paste rows from Excel or Google Sheets, or drop a CSV file here"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && pasted.trim()) {
              e.preventDefault();
              load(pasted, "Pasted data");
            }
          }}
        />
        <div className="composer__bar">
          <button type="button" className="composer__icon" onClick={() => fileRef.current?.click()} aria-label="Attach a CSV file" title="Attach a CSV file">
            <Plus size={18} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" className="composer__chip" onClick={useSample}>
            Try a sample sheet
          </button>
          <button type="button" className="composer__send" disabled={!pasted.trim()} onClick={() => load(pasted, "Pasted data")} aria-label="Read the pasted rows" title="Read the pasted rows">
            <ArrowUp size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void readFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {error ? (
        <p className="start__error" role="alert">
          {error}
        </p>
      ) : (
        <p className="start__fine start-data__hint">CSV exports from Google Forms, Typeform, SurveyMonkey or Excel. The first row should hold the question names.</p>
      )}
    </div>
  );
}
