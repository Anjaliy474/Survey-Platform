import { SharedAnalysis } from "@/components/studio/results/SharedAnalysis";

/** /r#<analysis>: the analysis lives in the link after the #, so it is never sent to a server. */
export default function SharedAnalysisPage() {
  return <SharedAnalysis />;
}
