"use client";

import { useEffect } from "react";
import type { StoryPlayerProps } from "@/app/s/[slug]/PlayerApp";

/** Placeholder until Task 9: the story arm hands straight over to the plain Player. */
export function StoryPlayer({ onSwitchPlain }: StoryPlayerProps) {
  useEffect(() => onSwitchPlain(0), [onSwitchPlain]);
  return null;
}
