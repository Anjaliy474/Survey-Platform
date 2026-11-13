"use client";

import { TopBar } from "../TopBar";
import { DataImport } from "./DataImport";

/** Analyse data: its own place, separate from making a survey. */
export function AnalyseView() {
  return (
    <>
      <TopBar crumbs={[{ label: "Home", href: "/app" }, { label: "Analyse data" }]} />
      <main className="page start">
        <div className="start__head">
          <h1 className="start__title">Analyse data you already have</h1>
          <p>Upload a sheet of responses. Get scores, key insights and a shareable report in seconds.</p>
        </div>
        <section className="start__area" aria-label="Your data">
          <DataImport />
        </section>
        <p className="start__note">Every number is computed from your rows. AI only writes words, and you review them.</p>
      </main>
    </>
  );
}
