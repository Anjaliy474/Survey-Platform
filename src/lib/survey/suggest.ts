/** Quick-pick defaults with a one-line reason (spec §5.2): the AI-style suggestion, made in code. */
import { findPrepared } from "@/lib/ai/prepared";
import type { Format, Look, Mood } from "./types";

const PLACE = /\b(caf[eé]|shop|store|restaurant|canteen|mess|clinic|office|hostel|library|gym|salon|hotel|venue|room)/i;
const QUICK = /\b(quick|pulse|check-in|checkin|would .* pay|price|pricing|app|idea)\b/i;

const MOODS: [RegExp, Mood][] = [
  [/\b(fest|festival|event|party|concert|wedding|diwali|holi|celebration)\b/i, "festive"],
  [/\b(hackathon|tech|space|startup|product|science)\b/i, "space"],
  [/\b(garden|plant|green|tree|nature|park|eco|sustainab)/i, "nature"],
  [/\b(trip|trek|travel|adventure|tour|hike|outing)\b/i, "adventure"],
  [/\b(game|gaming|retro|arcade|music)\b/i, "retro"],
  [/\b(hostel|campus|chai|laundry|dhaba|auto|train|monsoon|student)/i, "everyday_india"],
  [/\b(caf[eé]|coffee|tea|bakery|book|library|home)/i, "cosy"],
];

export type Suggestion = { format: Format; mood: Mood; look: Look; reason: string };

export function suggestPicks(concept: string): Suggestion {
  const prepared = findPrepared(concept);
  if (prepared) {
    const { format, mood, look } = prepared.picks;
    return { format, mood, look, reason: "Matches one of our prepared examples, so it's ready instantly." };
  }
  const mood = MOODS.find(([re]) => re.test(concept))?.[1] ?? "cosy";
  if (PLACE.test(concept)) {
    return { format: "stations_room", mood, look: "paper_cut", reason: "It's about a place, so people explore it station by station." };
  }
  if (QUICK.test(concept)) {
    return { format: "chat_story", mood, look: "clay", reason: "A short, quick topic feels natural as a chat." };
  }
  return { format: "journey_map", mood, look: "clay", reason: "A journey gives the survey a clear start, middle and end." };
}
