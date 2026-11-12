/**
 * Matching a plain-language request to the survey's fields (shared by the dashboard_spec and
 * chat_with_data demo stand-ins). Only the dataset's structure is used, never its values.
 */
import type { SchemaField } from "./types";

const SYNONYMS: Record<string, RegExp> = {
  Outlet: /outlet|branch|store|location|city|cities|where/,
  City: /city|cities|location|where/,
  "Recommendation (NPS)": /recommend|nps|promoter|loyal/,
  Satisfaction: /satisf|happy|rating|rated/,
  "Ordered food": /food|order/,
  "Menu wishes": /menu|dish|item/,
  "First time": /first.time|new (visitor|volunteer)s?|returning/,
  Clarity: /clear|clarity|instruction/,
  "Enjoyed most": /enjoy/,
  "Likely to return": /likely|return|come back|join (the )?next/,
  "How they heard": /hear|heard|channel|source/,
  "Response date": /over time|trend|per day|daily|each day|by day|weekly|timeline/,
};
export const THEMES_WORDS = /complain|theme|comment|said|suggest|feedback|open answers|open-ended|written|what people/;

export function findFields(text: string, fields: SchemaField[]): SchemaField[] {
  const t = text.toLowerCase();
  const hits = fields.filter((f) => {
    if (f.type === "personal") return false;
    if (f.type === "themes") return THEMES_WORDS.test(t);
    const syn = SYNONYMS[f.label];
    if (syn?.test(t)) return true;
    return t.includes(f.label.toLowerCase()) || t.includes(f.field.toLowerCase());
  });
  // Keep the order they appear in the request.
  return hits.sort((a, b) => position(t, a) - position(t, b));
}
function position(t: string, f: SchemaField): number {
  const re = f.type === "themes" ? THEMES_WORDS : SYNONYMS[f.label];
  const at = re ? (re.exec(t)?.index ?? -1) : t.indexOf(f.label.toLowerCase());
  return at >= 0 ? at : 999;
}

