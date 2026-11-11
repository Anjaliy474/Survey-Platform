import { describe, expect, it } from "vitest";
import { gamifierFor, sixQuestions, validWorld } from "@/lib/survey/fixtures";
import type { PlayfulLevel, WorldSpec } from "@/lib/survey/types";
import { CATALOGUE } from "./catalogue";
import { validateWorld } from "./validate-world";

const questions = sixQuestions();
const ids = questions.map((q) => q.id);

function run(world: WorldSpec, level: PlayfulLevel = "medium", timeLimitSec: number | null = null) {
  return validateWorld(world, { questions, gamifier: gamifierFor(ids), level, timeLimitSec });
}
function rules(world: WorldSpec, level?: PlayfulLevel, limit?: number | null) {
  return run(world, level, limit ?? null).map((f) => f.rule);
}

describe("validateWorld", () => {
  it("passes a valid world", () => {
    expect(run(validWorld())).toEqual([]);
  });

  it("flags missing, duplicated and reordered questions", () => {
    const missing = validWorld();
    missing.chapters[0].question_ids = [];
    expect(rules(missing)).toContain("coverage");

    const dup = validWorld();
    dup.chapters[3].question_ids = ["Q6", "Q1"];
    expect(rules(dup)).toContain("coverage");

    const order = validWorld();
    order.chapters[1].question_ids = ["Q3", "Q2"];
    expect(rules(order)).toContain("coverage");
  });

  it("flags chapter sizes outside 1 to 4", () => {
    const empty = validWorld();
    empty.chapters[0].question_ids = [];
    expect(rules(empty)).toContain("chapter_size");
    const big = validWorld();
    big.chapters = [{ ...big.chapters[0], question_ids: ["Q1", "Q2", "Q3", "Q4", "Q5"] }, big.chapters[3]];
    expect(rules(big)).toContain("chapter_size");
  });

  it("keeps open questions alone in their chapter", () => {
    const w = validWorld();
    w.chapters[2].question_ids = ["Q4", "Q5", "Q6"];
    w.chapters = w.chapters.slice(0, 3);
    expect(rules(w)).toContain("open_alone");
  });

  it("checks mechanics against the question type", () => {
    const g = gamifierFor(ids);
    g.items[0].mechanic = "number_row_11";
    const out = validateWorld(validWorld(), { questions, gamifier: g, level: "medium", timeLimitSec: null });
    expect(out.map((f) => f.rule)).toContain("mechanic");
  });

  it("checks prop families against the template", () => {
    const w = validWorld();
    w.items[1].prop_family = "cups_pair";
    expect(rules(w)).toContain("prop_family");
  });

  it("checks scenes, slots and templates exist", () => {
    const w = validWorld();
    w.chapters[0].scene_id = "volcano";
    expect(rules(w)).toContain("catalogue");
    const s = validWorld();
    s.items[0].slot = "ceiling";
    expect(rules(s)).toContain("catalogue");
  });

  it("enforces copy lengths", () => {
    const intro = validWorld();
    intro.chapters[0].intro_line = "one two three four five six seven eight nine ten eleven twelve thirteen";
    expect(rules(intro)).toContain("copy_length");
    const ack = validWorld();
    ack.items[0].acknowledgement = "one two three four five six";
    expect(rules(ack)).toContain("copy_length");
    const pro = validWorld();
    pro.prologue = Array.from({ length: 21 }, () => "word").join(" ");
    expect(rules(pro, "full")).toContain("copy_length");
  });

  it("wants empty lead-in copy at Light", () => {
    expect(rules(validWorld(), "light")).toContain("copy_empty");
  });

  it("rejects digits but allows the three tokens", () => {
    const w = validWorld();
    w.chapters[0].interlude_line = "Only 3 left";
    expect(rules(w)).toContain("digits");
    const ok = validWorld();
    ok.chapters[0].interlude_line = "About {{time_left}} to go.";
    expect(rules(ok)).not.toContain("digits");
  });

  it("rejects banned words", () => {
    const w = validWorld();
    w.ending.line = "You WIN a prize";
    expect(rules(w)).toContain("banned");
  });

  it("enforces the time limit", () => {
    expect(rules(validWorld(), "medium", 60)).toContain("time_budget");
  });

  it("enforces the size budget", () => {
    const before = CATALOGUE.journey_map.sizeKb.clay;
    CATALOGUE.journey_map.sizeKb.clay = 151;
    try {
      expect(rules(validWorld())).toContain("size_budget");
    } finally {
      CATALOGUE.journey_map.sizeKb.clay = before;
    }
  });
});
