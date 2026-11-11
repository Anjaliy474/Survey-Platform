/**
 * The Story Mode template catalogue: every scene, slot and prop family the AI may use.
 * The same data is sent to the world_builder stage and checked by the validator,
 * so the AI can only pick things the templates actually draw.
 */
import type { Format, Look, Mechanic } from "@/lib/survey/types";

export type SceneDef = { id: string; label: string; slots: string[] };

export type TemplateDef = {
  id: Format;
  label: string;
  scenes: SceneDef[];
  endingSceneId: string;
  propFamilies: Record<Mechanic, string[]>;
  /** Gzipped KB this template × look adds on top of the plain Player (measured in CI, Task 17). */
  sizeKb: Record<Look, number>;
};

const SLOTS = ["center", "left", "right"];
const scene = (id: string, label: string): SceneDef => ({ id, label, slots: SLOTS });

export const CATALOGUE: Record<Format, TemplateDef> = {
  journey_map: {
    id: "journey_map",
    label: "Journey Map",
    scenes: [
      scene("gate", "The gate"),
      scene("market_street", "Market street"),
      scene("riverside", "Riverside"),
      scene("hill_path", "Hill path"),
      scene("stage_square", "Stage square"),
      scene("night_sky", "Night sky"),
    ],
    endingSceneId: "lantern_release",
    propFamilies: {
      tap_chips_single: ["signposts", "posters"],
      tap_chips_multi: ["posters", "bunting"],
      this_or_that: ["lanterns_pair", "gates_pair"],
      segmented_scale: ["lamp_row"],
      emoji_scale: ["lantern_row"],
      number_row_11: ["star_row"],
      text_box: ["postcard"],
    },
    sizeKb: { clay: 0, paper_cut: 0 },
  },
  stations_room: {
    id: "stations_room",
    label: "Stations Room",
    scenes: [
      scene("counter", "The counter"),
      scene("menu_wall", "Menu wall"),
      scene("window_seat", "Window seat"),
      scene("shelf_corner", "Shelf corner"),
      scene("notice_board", "Notice board"),
      scene("back_garden", "Back garden"),
    ],
    endingSceneId: "closing_time",
    propFamilies: {
      tap_chips_single: ["menu_cards"],
      tap_chips_multi: ["jar_labels"],
      this_or_that: ["cups_pair"],
      segmented_scale: ["jar_row"],
      emoji_scale: ["mug_row"],
      number_row_11: ["shelf_numbers"],
      text_box: ["notebook"],
    },
    sizeKb: { clay: 0, paper_cut: 0 },
  },
  chat_story: {
    id: "chat_story",
    label: "Chat Story",
    scenes: Array.from({ length: 8 }, (_, i) => scene(`sticker_${i + 1}`, `Sticker ${i + 1}`)),
    endingSceneId: "chat_end",
    propFamilies: {
      tap_chips_single: ["reply_chips"],
      tap_chips_multi: ["reply_chips"],
      this_or_that: ["reply_chips"],
      segmented_scale: ["reply_chips"],
      emoji_scale: ["reply_chips"],
      number_row_11: ["reply_chips"],
      text_box: ["reply_chips"],
    },
    sizeKb: { clay: 0, paper_cut: 0 },
  },
};

/** A template plus one look may add at most this much (spec §9: 300 KB total, plain ≤ 150 KB). */
export const TEMPLATE_BUDGET_KB = 150;
