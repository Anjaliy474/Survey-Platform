import type { CreateStep, Section } from "./types";

/** Step rail (DESIGN.md §5.11): Questions → Style → Publish → Results. */
export const STEPS: { section: Section; label: string }[] = [
  { section: "build", label: "Questions" },
  { section: "style", label: "Style" },
  { section: "publish", label: "Publish" },
  { section: "results", label: "Results" },
];

/** Results tabs after publishing (UI_UX_LAYOUT.md §3.3). */
export const RESULT_TABS: { section: Section; label: string }[] = [
  { section: "results", label: "Overview" },
  { section: "themes", label: "Themes" },
  { section: "dashboard", label: "Dashboard" },
  { section: "responses", label: "Responses" },
  { section: "ask", label: "Ask" },
  { section: "report", label: "Report" },
];

export const SECTIONS: Section[] = ["build", "style", "publish", "results", "themes", "dashboard", "responses", "ask", "report"];

export function isSection(value: string): value is Section {
  return (SECTIONS as string[]).includes(value);
}

/** What each page will hold, for the placeholders until it's built (spec section and build step). */
export const SECTION_INFO: Record<Section, { title: string; about: string; spec: string }> = {
  build: { title: "Question builder", about: "Review AI suggestions, fix bias flags and approve every change before moving on.", spec: "S4 · build step 5" },
  style: { title: "Style and gamify", about: "Pick how the survey feels: style, playful level and theme, with a live phone preview.", spec: "S5 · build step 6" },
  publish: { title: "Publish and share", about: "A final checklist, then a link, a WhatsApp share and a QR code.", spec: "S6 · build step 7" },
  results: { title: "Results overview", about: "Who took part, completion, where people dropped off, and a chart per question.", spec: "R1 · build step 8" },
  themes: { title: "Themes", about: "Open answers grouped into themes, each backed by real quotes and response IDs.", spec: "R3 · build step 9" },
  dashboard: { title: "Dashboard", about: "Describe the dashboard you want in plain words; every number is computed.", spec: "R4 · build step 10" },
  responses: { title: "Responses", about: "Every response in a table, flags you can keep or exclude, and CSV export.", spec: "R2 · build step 13" },
  ask: { title: "Ask your data", about: "Ask questions in plain words and get answers with the base and the calculation.", spec: "R5 · build step 13" },
  report: { title: "Insight report", about: "A written report for creators, analysts or leadership, with evidence for every claim.", spec: "R6 · build step 13" },
};

export const NEXT_STEP: Record<CreateStep, { section: Section; label: string } | null> = {
  build: { section: "style", label: "Style" },
  style: { section: "publish", label: "Publish" },
  publish: null,
};

export const surveyHref = (id: string, section: Section) => `/app/s/${id}/${section}`;

/** Where a survey card leads: drafts continue where they left off, published ones open results. */
export const cardHref = (s: { id: string; status: string; step: CreateStep }) =>
  surveyHref(s.id, s.status === "draft" ? s.step : "results");
