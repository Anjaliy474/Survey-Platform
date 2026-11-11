"use client";

import { useToast } from "@/components/ui/Toast";
import { studio } from "@/lib/studio/store";

/** Demo only, until the backend exists: put the sample surveys back. */
export function RestoreSamplesButton() {
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={() => {
        studio.restoreSamples();
        toast({ message: "Sample surveys restored." });
      }}
    >
      Demo only: restore the sample surveys
    </button>
  );
}
