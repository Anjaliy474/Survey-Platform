import { describe, expect, it } from "vitest";
import { suggestPicks } from "./suggest";

describe("suggestPicks", () => {
  it("uses the prepared example's choices when the concept matches one", () => {
    expect(suggestPicks("Feedback for our college fest")).toMatchObject({ format: "journey_map", mood: "festive", look: "clay" });
    expect(suggestPicks("Should our café open on Sundays?")).toMatchObject({ format: "stations_room", mood: "cosy" });
    expect(suggestPicks("Would students pay for laundry pickup?")).toMatchObject({ format: "chat_story", mood: "everyday_india" });
  });

  it("suggests a place for venues and a chat for quick pulses", () => {
    expect(suggestPicks("Feedback on our clinic waiting room").format).toBe("stations_room");
    expect(suggestPicks("Quick pulse check-in for the team").format).toBe("chat_story");
    expect(suggestPicks("How was the hackathon weekend?").format).toBe("journey_map");
  });

  it("picks a mood from the topic, cosy by default", () => {
    expect(suggestPicks("Hackathon feedback").mood).toBe("space");
    expect(suggestPicks("Garden club survey").mood).toBe("nature");
    expect(suggestPicks("Something completely generic").mood).toBe("cosy");
  });

  it("always gives a one-line reason", () => {
    expect(suggestPicks("anything").reason.length).toBeGreaterThan(10);
  });
});
