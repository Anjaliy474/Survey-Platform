import { describe, expect, it } from "vitest";
import { buildDataset, inferColumns, parseTable } from "./importer";

const FORMS = `Timestamp,Email address,Which outlet?,How satisfied were you?,How likely are you to recommend us?,What should we add?,Anything else?
13/11/2026 09:15:02,a@x.com,Gachibowli,Dissatisfied,4,"Breakfast plates, Vegan options",Too noisy to study
13/11/2026 10:02:44,b@x.com,Banjara Hills,Very satisfied,10,Cold brew,"Love it, ""best"" coffee"
13/11/2026 13:40:10,c@x.com,Gachibowli,Neutral,6,"Breakfast plates, Desserts",
14/11/2026 18:05:00,d@x.com,Kondapur,Satisfied,9,Desserts,Slow service at lunch
14/11/2026 19:30:00,e@x.com,Banjara Hills,Very dissatisfied,0,"Vegan options, Cold brew",
14/11/2026 20:10:00,f@x.com,Kondapur,Satisfied,8,"Breakfast plates, Cold brew",ok`;

describe("parseTable", () => {
  it("reads quoted CSV with commas and doubled quotes", () => {
    const { header, rows } = parseTable(FORMS);
    expect(header).toHaveLength(7);
    expect(rows).toHaveLength(6);
    expect(rows[1][6]).toBe('Love it, "best" coffee');
    expect(rows[0][5]).toBe("Breakfast plates, Vegan options");
  });
  it("reads tab-separated rows pasted from a spreadsheet", () => {
    const { header, rows } = parseTable("Team\tScore\nA\t4\nB\t5\n");
    expect(header).toEqual(["Team", "Score"]);
    expect(rows).toEqual([
      ["A", "4"],
      ["B", "5"],
    ]);
  });
});

describe("inferColumns", () => {
  const { header, rows } = parseTable(FORMS);
  const plan = inferColumns(header, rows);
  const kind = (name: string) => plan.find((p) => p.name.startsWith(name))?.kind;

  it("recognises each column type", () => {
    expect(kind("Timestamp")).toBe("timestamp");
    expect(kind("Email")).toBe("personal");
    expect(kind("Which outlet")).toBe("single");
    expect(kind("How satisfied")).toBe("rating");
    expect(kind("How likely")).toBe("nps");
    expect(kind("What should we add")).toBe("multi");
    expect(kind("Anything else")).toBe("text");
  });

  it("puts a text scale in order, worst to best", () => {
    expect(plan.find((p) => p.name.startsWith("How satisfied"))?.options).toEqual(["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"]);
  });
});

describe("buildDataset", () => {
  it("turns rows into a survey and responses the Results pages can read", () => {
    const { header, rows } = parseTable(FORMS);
    const plan = inferColumns(header, rows);
    const d = buildDataset({ title: "Café", slug: "import-x", creator: "Me", rows, plan, now: new Date("2026-11-15T12:00:00").getTime() });
    expect(d.responses).toHaveLength(6);
    expect(d.hasTimes).toBe(true);
    const email = d.survey.questions.find((q) => q.text.startsWith("Email"));
    expect(email?.collects_personal_data).toBe(true);
    const sat = d.survey.questions.find((q) => q.type === "rating_scale")!;
    expect(d.responses[1].answers[sat.id]).toBe(4); // Very satisfied
    const multi = d.survey.questions.find((q) => q.type === "multi_choice")!;
    expect(d.responses[0].answers[multi.id]).toEqual([multi.options.indexOf("Breakfast plates"), multi.options.indexOf("Vegan options")]);
    expect(new Date(d.responses[0].submittedAt).getHours()).toBe(9);
  });
});
