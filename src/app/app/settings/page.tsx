import { ComingSoon } from "@/components/studio/ComingSoon";
import { RestoreSamplesButton } from "@/components/studio/RestoreSamplesButton";
import { TopBar } from "@/components/studio/TopBar";

export const metadata = { title: "Settings" };

/** X1 Settings: arrives in build step 12 with sign-up. */
export default function Settings() {
  return (
    <>
      <TopBar crumbs={[{ label: "Home", href: "/app" }, { label: "Settings" }]} />
      <main className="page">
        <h1 className="sr-only">Settings</h1>
        <ComingSoon
          title="Settings"
          about="Your profile, plus data and privacy: download your data, delete a survey's responses, and handle a respondent's deletion request."
          spec="X1 · build step 12"
        >
          <RestoreSamplesButton />
        </ComingSoon>
      </main>
    </>
  );
}
