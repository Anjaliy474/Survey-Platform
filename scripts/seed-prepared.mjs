#!/usr/bin/env node
/**
 * Publishes the three prepared demo surveys (fest, café, laundry) on a running PlaySurvey.
 *
 *   node scripts/seed-prepared.mjs                       # http://localhost:3000
 *   node scripts/seed-prepared.mjs https://your-app.vercel.app
 *
 * Each survey goes through the same API a creator uses: create → approve questions →
 * build world → accept → publish (50/50 story vs plain). Prints the public links.
 */
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

const EXAMPLES = [
  { concept: "Feedback for our college fest", audience: "Students", format: "journey_map", mood: "festive", look: "clay", level: "medium" },
  { concept: "Should our café open on Sundays?", audience: "Customers", format: "stations_room", mood: "cosy", look: "paper_cut", level: "medium" },
  { concept: "Would students pay for laundry pickup?", audience: "Students", format: "chat_story", mood: "everyday_india", look: "clay", level: "medium" },
];

async function call(path, method = "GET", body) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${data.error ?? JSON.stringify(data)}`);
  return data;
}

for (const picks of EXAMPLES) {
  const { survey } = await call("/api/surveys", "POST", { picks });
  await call(`/api/surveys/${survey.id}`, "PATCH", { questionsApproved: true });
  const built = await call(`/api/surveys/${survey.id}/world`, "POST");
  if (built.failures.length) throw new Error(`World for "${picks.concept}" failed checks: ${built.failures.map((f) => f.message).join("; ")}`);
  await call(`/api/surveys/${survey.id}`, "PATCH", { worldAccepted: true });
  await call(`/api/surveys/${survey.id}/publish`, "POST", { splitAB: true });
  console.log(`${picks.concept}\n  play:    ${base}/s/${survey.slug}\n  studio:  ${base}/studio/s/${survey.id}/results\n`);
}
