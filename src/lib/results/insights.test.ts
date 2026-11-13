import { describe, expect, it } from "vitest";
import { getSurvey } from "@/lib/player/samples";
import type { PlayerSurvey } from "@/lib/player/types";
import { sampleResponses } from "./data";
import { computeInsights } from "./insights";

const NOW = new Date("2026-11-13T18:00:00").getTime();

function run(slug: string) {
  const survey = getSurvey(slug) as PlayerSurvey;
  const all = sampleResponses(survey, NOW) ?? [];
  const used = all.filter((r) => r.submittedAt !== null);
  return { set: computeInsights(survey, used, all), used };
}

describe("computeInsights", () => {
  it("finds more than the direct answers for the café sample", () => {
    const { set } = run("cafe-feedback");
    if (process.env.SHOW_INSIGHTS) console.log(JSON.stringify(set, null, 1));
    const kinds = new Set(set.insights.map((i) => i.kind));
    expect(set.insights[0].kind).toBe("score");
    expect(kinds.has("gap") || kinds.has("driver")).toBe(true);
    expect(set.insights.length).toBeGreaterThanOrEqual(4);
  });

  it("only reports comparisons that survive the significance test", () => {
    const { set } = run("cafe-feedback");
    for (const i of set.insights.filter((x) => x.kind === "gap" || x.kind === "driver" || x.kind === "demand")) {
      expect(i.confidence === "clear" || i.confidence === "likely").toBe(true);
      for (const g of i.groups ?? []) expect(g.n).toBeGreaterThanOrEqual(10);
    }
  });

  it("every percentage in a headline appears in the computed groups or score", () => {
    const { set } = run("cafe-feedback");
    for (const i of set.insights) {
      const pcts = [...i.headline.matchAll(/(\d+)%/g)].map((m) => Number(m[1]));
      const known = new Set((i.groups ?? []).map((g) => g.pct));
      if (i.kind === "score" || i.kind === "dropoff") continue;
      for (const p of pcts) expect(known.has(p)).toBe(true);
    }
  });

  it("keeps small surveys honest: no group comparisons under 10 per group", () => {
    const { set } = run("volunteer-feedback");
    if (process.env.SHOW_INSIGHTS) console.log(JSON.stringify(set, null, 1));
    expect(set.insights.some((i) => i.kind === "gap" || i.kind === "driver")).toBe(false);
    expect(set.notes.join(" ")).toMatch(/each group has 10/);
  });

  it("returns nothing for no responses", () => {
    const survey = getSurvey("cafe-feedback") as PlayerSurvey;
    expect(computeInsights(survey, [], []).insights).toEqual([]);
  });
});
