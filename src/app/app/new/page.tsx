import { ComingSoon } from "@/components/studio/ComingSoon";
import { TopBar } from "@/components/studio/TopBar";

export const metadata = { title: "New survey" };

/** S2 Start chooser: arrives in build step 4. */
export default function NewSurvey() {
  return (
    <>
      <TopBar crumbs={[{ label: "Home", href: "/app" }, { label: "New survey" }]} />
      <main className="page">
        <h1 className="sr-only">New survey</h1>
        <ComingSoon
          title="Start chooser"
          about="Pick one of three ways to start: bring your questions, describe your research, or a quick one-line prompt. AI suggests, you decide."
          spec="S2 + S3 · build step 4"
        />
      </main>
    </>
  );
}
