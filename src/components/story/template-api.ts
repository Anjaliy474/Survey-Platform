import type { ComponentType, ReactNode } from "react";
import type { Chapter, Format, Look, Mood } from "@/lib/survey/types";

/** What a template draws around the question card for one chapter. */
export type StageProps = {
  chapter: Chapter;
  chapterIndex: number;
  chapterCount: number;
  look: Look;
  mood: Mood;
  reduced: boolean;
  /** "chapter" while answering, "interlude" while moving to the next scene. */
  mode: "chapter" | "interlude" | "prologue";
  /** Narration lines already shown, oldest first (Chat Story renders them as messages). */
  history: { from: "world" | "you"; text: string }[];
  /** Progress, sound and the plain-form switch, shown at the top. */
  hud?: ReactNode;
  children: ReactNode;
};

/** One option drawn as an in-world object. Every option of a question uses the same family. */
export type SkinProps = {
  family: string;
  index: number;
  count: number;
  selected: boolean;
  look: Look;
};

export type EndingProps = { look: Look; mood: Mood; reduced: boolean; line: string; children?: ReactNode };

export interface StoryTemplate {
  id: Format;
  Stage: ComponentType<StageProps>;
  Ending: ComponentType<EndingProps>;
  Skin: ComponentType<SkinProps>;
  /** Small static picture of a scene for the Studio storyboard. */
  Thumb: ComponentType<{ sceneId: string; look: Look; mood: Mood }>;
}

export function loadTemplate(format: Format): Promise<StoryTemplate> {
  switch (format) {
    case "journey_map":
      return import("./templates/journey-map").then((m) => m.journeyMap);
    case "stations_room":
      return import("./templates/stations-room").then((m) => m.stationsRoom);
    case "chat_story":
      return import("./templates/chat-story").then((m) => m.chatStory);
  }
}
