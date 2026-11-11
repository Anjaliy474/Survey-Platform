/**
 * The dataset's structure for the dashboard stage (combined.system.txt "Field types"). The AI sees
 * this, never the values. Personal fields are listed as `personal` so it knows not to use them.
 */
import type { SchemaField } from "@/lib/ai/types";
import { optionsFor, scaleLabels } from "@/lib/player/rules";
import type { PlayerSurvey, Question } from "@/lib/player/types";

const SHORT: [RegExp, string][] = [
  [/outlet|branch|store|location|which of our/i, "Outlet"],
  [/\bcity\b/i, "City"],
  [/recommend/i, "Recommendation (NPS)"],
  [/satisf/i, "Satisfaction"],
  [/order any food|food with/i, "Ordered food"],
  [/menu/i, "Menu wishes"],
  [/first (time|tree)/i, "First time"],
  [/how clear|instructions/i, "Clarity"],
  [/enjoy most/i, "Enjoyed most"],
  [/likely (are you )?to (join|come)/i, "Likely to return"],
  [/hear about/i, "How they heard"],
  [/\bage\b/i, "Age group"],
  [/\byear\b/i, "Year"],
];

export function shortLabel(q: Question): string {
  const hit = SHORT.find(([re]) => re.test(q.text));
  if (hit) return hit[1];
  const words = q.text.replace(/[?.!]/g, "").split(/\s+/).slice(0, 4).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function fieldsFor(survey: PlayerSurvey, themed: ReadonlySet<string>): SchemaField[] {
  const fields: SchemaField[] = [];
  for (const q of survey.questions) {
    const base = { field: q.id, label: shortLabel(q), question: q.text };
    if (q.collects_personal_data) fields.push({ ...base, type: "personal" });
    else if (q.type === "rating_scale") fields.push({ ...base, type: "ordinal_scale", options: scaleLabels(q) });
    else if (q.type === "nps_0_10") fields.push({ ...base, type: "nps" });
    else if (q.type === "multi_choice") fields.push({ ...base, type: "multi_choice", options: optionsFor(q) });
    else if (q.type === "single_choice" || q.type === "yes_no" || q.type === "number_band") fields.push({ ...base, type: "nominal", options: optionsFor(q) });
    else if (q.type === "long_text" && themed.has(q.id)) fields.push({ ...base, field: `themes:${q.id}`, label: `Themes in ${q.id}`, type: "themes" });
  }
  fields.push({ field: "date", label: "Response date", type: "date" });
  return fields;
}
