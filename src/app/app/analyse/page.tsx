import { AnalyseView } from "@/components/studio/start/AnalyseView";

export const metadata = { title: "Analyse data" };

/** Analyse data you already have: a CSV or pasted spreadsheet rows, straight to the analysis. */
export default function AnalysePage() {
  return <AnalyseView />;
}
