# Story Mode: design

**Status:** approved by Nisarg, 12 Nov 2026
**Owner:** Nisarg (design), Team 3, PD3.401
**Brainstorm with all options:** https://claude.ai/artifact/Wg7nAg4hqCPYU4xSr24rMF (private until shared)
**Reads with:** `DESIGN.md`, `UI_UX_LAYOUT.md`, `combined.system.txt`, `survey-platform-architecture.mmd`

How decisions are marked in this document:
- **Chosen:** picked by Nisarg on 12 Nov 2026 ("use the recommended set" from the brainstorm).
- **My call:** settled by Claude while writing this; the team can overrule it.
- **Open:** needs the team before building (section 13).

---

## 1. Intent

A creator types a concept ("Feedback for our college fest") and the survey is delivered as a small playable world: a trail, a café, a chat with the world. Each question is a moment in that world. Respondents finish because it feels like a short journey with an end, not because they are paid in points.

The promise that makes it PlaySurvey's and not a gimmick: **the story changes the stage, the pace and the ending, never the question.** Answers from a Story Mode survey must be as trustworthy as answers from a plain form, and the product proves it with a built-in story-vs-plain comparison.

### Why now
The landing page already sells "surveys people actually finish". Story Mode is the most visible proof of that promise, and the A/B comparison gives the course project hard evidence (completion, enjoyment, answer stability).

### Prior art, honestly
Market research has tested game-like survey designs for more than a decade (Jon Puleston's work at GMI is the best-known), and quiz builders wrap personality quizzes in stories. What we have not found is a product that turns any concept into a bespoke playable world automatically while guaranteeing the data stays as clean as a plain form. That guarantee is the differentiator.

## 2. Goals, non-goals, anti-goals

**Goals**
1. Any approved question set can be played as a story world, generated from the creator's concept and a few quick picks, in under a minute of creator effort.
2. Completion and enjoyment go up versus the plain form.
3. Closed-question answer distributions do not meaningfully change versus the plain form.
4. Works on a mid-range Android phone inside WhatsApp's in-app browser.

**Non-goals (first release)**
- Free-roam worlds where respondents pick question order.
- AI-generated images or AI-written scene code.
- Characters, avatars or mascots.
- Story Mode for sensitive topics.
- Sound effects on taps, living crowd worlds, creator-built templates, regional languages.

**Anti-goals (failure even if it "works")**
- Any answer rewarded with a nicer scene, path, sound or reaction.
- Any option made to look more appealing than another.
- Points, scores, streaks, leaderboards, prizes, timers or skill/timing-based answering.
- A premise that presumes a result ("save the empty café").
- A survey that takes longer than its title card promised.

## 3. The eight integrity rules (enforced in code, not options)

1. **Word for word.** Question text, options and scale labels render exactly as approved, as real readable text.
2. **Same order.** The story never reorders questions; it only places chapter breaks.
3. **Every answer treated alike.** No answer changes the path, scene, reaction or ending. Paths always rejoin.
4. **Equal objects.** All options of a question render as objects from one prop family (five identical lanterns). Only the chosen object changes state after the tap.
5. **No points, prizes, timers or skill.** Progress is the story itself.
6. **Honest effort.** The title card shows question count and total time including scene time; "Chapter 2 of 4 · about 1 min left" stays visible.
7. **Plain form one tap away.** Respondents can switch to the plain style at any time with answers kept.
8. **Consent first.** `purpose_line` and `consent_line` show verbatim on the title card before any story content.

## 4. Decisions (the chosen set)

| Area | Chosen |
|---|---|
| Formats in first release | **Journey Map**, **Stations Room**, **Chat Story** |
| Looks in first release | **Clay**, **Paper-cut** |
| Where it lives | **Both:** a new "Start from a concept" start that pre-selects Story, and Story as a 5th style in the Style step |
| How worlds are drawn | **Hand-built scene templates; the AI picks, arranges, tints and writes** |
| Guide | **Voice only:** a narrator in text, no face, no character |
| Answering | **Tap decides, animation follows,** identical for every option |
| Echo of answers | **None:** the world looks the same whatever you answer |
| Ending | **Ending scene + journey postcard** (shareable, shows no answers), then the existing enjoyment tap and reveal |
| Sound | **Optional ambient loop, off by default,** loaded only when switched on |
| Creator control | **Guided intake + per-scene edits** in a storyboard |
| Proof | **A/B split on by default during the pilot** |
| Page weight | **300 KB cap for Story Mode** (one template loaded, no video) |
| Sensitive topics | **Story Mode off;** Studio explains and offers a calm plain style |

### Rule changes these choices need (DESIGN.md)
- **§4 "Never put illustrations inside questions":** amend to allow neutral scenes *around* the question card, under integrity rules 3–4. Illustrations still never depict an option or an outcome.
- **§12 Player budget 150 KB:** add a Story Mode budget of 300 KB JS+CSS+art before fonts, measured on the published survey, with the plain style still under 150 KB.
- **Rule 11 (no mascot):** unchanged. The voice-only guide keeps it.
- **Rule 4 / gamifier banned list:** unchanged.

## 5. Creator experience (Studio)

### 5.1 Entry points
- **New start S3d "Start from a concept"** (`/app/new/concept`), a fourth card on the start chooser. It runs the quick-prompt question flow and pre-selects Story in Style.
- **Style step S5:** Story becomes a 5th style card beside One per screen, Pages, Chat and Classic. Selecting it on any survey opens the quick picks.

### 5.2 Quick picks (intake)
Only the concept is required. Every other input has an AI default with a one-line reason. **Make it for me** accepts all defaults.

| # | Input | Control | Default (my call) |
|---|---|---|---|
| 1 | What's your survey about? (required) | Text, one line or a short brief | — |
| 2 | Who will play it? + age band (13+ / 18+) | Chips | From the shaper's inferred audience |
| 3 | How should it feel? | 3 format cards with moving thumbnails (Journey Map, Stations Room, Chat Story) | AI suggestion, with reason |
| 4 | World mood | Chips: Cosy, Adventure, Festive, Space, Nature, Retro, Everyday India, Surprise me | AI suggestion |
| 5 | Look | Swatches: Clay, Paper-cut | Clay |
| 6 | How playful? | Existing dial plus a top level: Light, Medium, Full story | Medium |
| 7 | Brand (optional) | Logo upload, one colour | None; colour is contrast-checked |
| 8 | Time limit | Chips: 1, 2, 3 min, No limit | From the question set |

"Mystery" and "Quest"-style premises are not offered (premise bias risk).

**Sensitive topics (my call):** Story is disabled for the whole survey when the approved question set contains any question the shaper marked `sensitive: true`. Studio shows "Story Mode is off for sensitive topics, so the survey stays calm and private." and offers the plain style. The brief's wording alone never blocks Story (a café survey asking about prices stays eligible); if the brief mentions health, money, workplace or identity but no question is marked sensitive, Studio only shows a one-line reminder to check.

**The plain style (my call):** "plain" everywhere in this document (the A/B plain arm, "Prefer a plain form?", every fallback) means the **One per screen** style at the same playful level, capped at Medium, using the same gamifier output. The A/B therefore measures the story layer alone, not gamification.

**Gamifier and world_builder together (my call):** the gamifier runs as today with style `one_per_screen` and playful level = the chosen level capped at `medium` (Full story maps to `medium`). Its mechanics, helper text, feedback and closing copy are used in both arms. In the story arm, `world_builder` intro lines replace the gamifier's lead-ins, and its interlude lines replace milestones; the gamifier's lead-ins and milestones are still stored and used by the plain arm.

Playful levels in Story Mode (**my call**):
- **Light:** scenes and chapter titles only; no lead-ins, no interludes.
- **Medium:** scenes, lead-ins, one interlude between chapters, ending scene.
- **Full story:** Medium plus a prologue (≤ 4 s, skippable).
Acknowledgement after an answer (≤ 5 words, same for every answer) appears at Medium and Full, as in the gamifier rules.

### 5.3 Order of operations
1. Quick picks are collected (concept start) or opened from Style.
2. The question set is shaped and approved in the existing Builder (S4), unchanged. **Story generation never starts before the question set is approved.**
3. Gamifier runs as today (mechanic per question, microcopy).
4. `world_builder` runs (section 7). The AI working panel shows real stages: Building the world → Planning chapters → Checking the rules → Preparing preview.

### 5.4 World card
Shows title, premise, format, mood, look and narrator voice sample. Actions: **Accept**, **Regenerate**, **Edit** (title, premise, mood). Draft (dashed) until accepted, per DESIGN.md rule 3.

### 5.5 Storyboard
A horizontal strip of chapters (stacked on mobile). Each chapter card shows its scene thumbnail, its question IDs and text (read-only, linked to Build), its intro line, and the acknowledgement line.
- **Swap scene:** choose another scene from the same template.
- **Reword line:** edit or regenerate the intro line (word counter, limits from section 7).
- **Move chapter break:** merge or split chapters. Question order is locked.
- Chapter edits run `world_builder` in `edit_chapter` mode, so unchanged chapters keep their content.

### 5.6 Integrity panel
A checklist that must be all green before Publish: the eight rules, copy limits, banned words, size budget (KB), and time budget (questions + scene time ≤ limit). Each failed row names the chapter and offers **Fix**.

### 5.7 Preview and publish
- Preview plays the whole story in the existing phone frame, with a **Plain view** toggle.
- Publish (S6) gains a **Story vs plain** setting: "Split 50/50 to compare" (on by default during the pilot) or "Everyone gets the story".
- The share sheet's WhatsApp preview uses the world title and the title-card art.

### 5.8 Results
Results overview (R1) gains a **Story vs plain** card when a split ran: completion, median time, enjoyment, plain-form switches, and per-question distribution comparison, all Computed (section 10).

## 6. Respondent experience (Player, `/s/:slug`)

| Step | What happens | Time budget |
|---|---|---|
| Title card | World title, "6 questions · about 2 min", purpose and consent verbatim, **Play**, and "Prefer a plain form?" | counted as 5 s |
| Prologue (Full only) | One line and a short scene; tap to skip | ≤ 4 s |
| Chapter | Scene arrives (≤ 1 s), intro line, question card with the exact text, tap, the same small animation for every option, Next. Back always works | 10 s closed / 45 s open (existing rules) |
| Interlude (Medium, Full) | A short move to the next scene, with "about N min left" | ≤ 2 s each |
| Open question | A postcard (Journey Map), notebook (Stations Room) or message (Chat Story); always optional with Skip | 45 s |
| Ending | Ending scene (once, same for everyone), enjoyment tap, reveal (20+ responses) or teaser, journey postcard | counted as 10 s |

- **Time estimate (my call):** existing rule (10 s closed, 45 s open) + 5 s title card + 2 s per interlude + 4 s prologue (Full) + 10 s ending. The rules engine uses this sum for the title card and the time limit.
- **Answers save per question** exactly as the Player does today; switching to plain keeps them.
- **The question card always has a solid background** and meets contrast; scenes sit behind and around it.
- **Reduced motion:** scenes are still images with 120 ms crossfades; no walking, no parallax.
- **Screen readers:** each screen announces "Question X of Y" and the exact question; scenes are `aria-hidden`; controls are real radios and checkboxes with visible text labels.
- **Keyboard:** same keys as the plain Player (arrows, number keys, Enter).
- **Journey postcard:** the world title, the route walked and "Thanks for taking part", downloadable as PNG. It never shows answers.

## 7. AI: the `world_builder` stage

New stage in `combined.system.txt`, root tag `<world_request>`. Same principles as the gamifier: refers to questions by ID, writes no numbers (only `{{questions_left}}`, `{{time_left}}`, `{{respondent_count}}`), never rewrites question text, options or scales.

**Input:** approved questions (id, type, option count, sensitive, open), gamifier output, quick picks (format, mood, look, playful level, audience, age band, brand colour), template catalogue (scene IDs, prop families per mechanic, slot names), time limit.

**Output schema (draft):**

```json
{
  "mode": "create | edit_chapter",
  "world": {
    "title": "≤ 5 words",
    "premise": "One sentence; about taking part or deciding, never presuming an outcome",
    "template": "journey_map | stations_room | chat_story",
    "mood": "cosy | adventure | festive | space | nature | retro | everyday_india",
    "look": "clay | paper_cut",
    "narrator_voice": "One line describing the tone"
  },
  "prologue": "≤ 20 words; empty unless playful level is full",
  "chapters": [
    {
      "chapter_id": "C1",
      "title": "≤ 4 words",
      "question_ids": ["Q1"],
      "scene_id": "From the template catalogue",
      "intro_line": "≤ 12 words; empty at Light",
      "interlude_line": "≤ 12 words; empty at Light"
    }
  ],
  "items": [
    {
      "question_id": "Q1",
      "slot": "Slot name in the scene",
      "prop_family": "From the template's families for this mechanic",
      "acknowledgement": "≤ 5 words, same for every answer; empty at Light"
    }
  ],
  "ending": { "scene_id": "", "line": "≤ 20 words", "postcard_title": "≤ 6 words" },
  "notes_for_creator": [],
  "flags": []
}
```

**Writing rules** (added to the stage): no evaluative words about answers; no presumption in premise, titles or lines; no numbers; simple inclusive English; at most one emoji per line; no characters, faces or named people; never describe the respondent.

**Evals (golden set additions):** a sensitive brief must not produce a world (Studio blocks it before the call, and the stage returns a flag if called); a "prove our café is loved" brief must get a neutral premise; three runs of the same input must keep every option in one prop family; every banned word must be absent.

## 8. Validator (code, before preview and publish)

1. Every approved question ID appears exactly once across chapters, in approved order.
2. Chapters hold 1 to 4 questions; open questions are alone in their chapter. (Sensitive questions never reach this stage; see 5.2.)
3. Each item's mechanic is allowed for its type (gamifier table) and the `prop_family` is valid for that mechanic in the chosen template.
4. Every option of a question renders from the one prop family (enforced by the template, checked by the validator).
5. Word limits hold; no digits; tokens only from the allowed three; banned words absent: win, winner, score, points, prize, reward, level up, streak, hurry, correct, wrong, best answer.
6. `scene_id`, `slot`, `template` and `look` exist in the catalogue.
7. Size budget: the template × look's measured size (stored in the catalogue, section 9) fits the 300 KB Story Mode budget.
8. Time budget: section 6 sum ≤ time limit.
9. The plain fallback renders from the same survey definition.

**On failure:** retry `world_builder` once with the failures listed; if it fails again, Studio shows the failures and offers the plain style with the chosen theme (**my call**).

## 9. Rendering and templates

- **Template module:** one code-split React module per format, `src/components/story/templates/<id>/`. It exports its scene catalogue, slots, prop families per mechanic, interlude transitions and ending scene. Looks are CSS and SVG asset packs per template (`clay`, `paper_cut`).
- **Mechanics:** templates reuse the seven Player mechanics from `src/components/player/` and only restyle them as in-world objects. Underneath they stay the same accessible radio/checkbox components with visible labels, so data capture is identical to the plain Player.
- **Prop families** are designed by us, never generated: a family is a set of identical objects that differ only by label (lanterns, signposts, cups, jars, stars, chips-as-posters). The selected state is the only visual difference.
- **Motion:** the existing `motion` library and CSS; SVG and CSS art only; no video, canvas engines or 3D. Next chapter assets preload while the current question is answered.
- **Chat Story** reuses the existing Chat style layout, adding scene stickers as chapter dividers.
- **Loading:** the Player loads the survey definition, gamifier output and world spec once, then dynamically imports the one template and look.
- **Fallback:** any render error switches to the plain style with answers kept and logs the error.

**How the 300 KB is counted (my call):** gzip-compressed JS + CSS + images and SVG transferred for the `/s/:slug` route on first load, fonts excluded, including the framework runtime, the shared Player and `motion`. This is the same measure used for the plain Player's 150 KB, so a template plus one look may add at most about 150 KB gzipped on top of the plain Player. Measured in CI per template × look and written to the catalogue.

**Template scope for the first release (my call):** each template ships **6 base scenes** plus an ending scene, and prop families for all seven mechanics, in each of the two looks. Moods are applied by tint, ambient effect and a small set of swappable props per mood, not by separate scenes. That is 2 scene templates × 7 scenes × 2 looks, plus Chat Story's stickers (one set of about 8 per look).

## 10. Measurement (A/B)

- **Assignment:** each respondent is randomly assigned story or plain on first load (50/50), stored with the response; a respondent who switches to plain mid-way stays in the story arm for analysis and is counted as a switch.
- **Computed per arm:** completion rate, drop-off by question, median time, enjoyment, open-answer length (words), plain-form switches.
- **Answer stability:** per closed question, compare distributions between arms with a chi-square test in the compute layer, with multiple-testing correction across questions. A flagged difference shows on the Story vs plain card as "Answers to Q3 differ between story and plain. Review its scene." This is the bias alarm.
- **Small samples:** the card shows "Too few responses to compare" until each arm has 30 responses (**my call**).
- **Targets:** set by the team before the pilot (section 13).

## 11. Data model additions

- `surveys.world_spec` (JSON, the accepted `world_builder` output) and `surveys.story_settings` (quick picks, split on/off), both versioned with the question set.
- `responses.arm` (`story | plain`) and `responses.switched_to_plain` (boolean).
- Events: `story_chapter_viewed`, `story_skip_prologue`, `story_switch_plain`, `story_sound_on`.

## 12. Demo release: Saturday 14 Nov 2026

**Chosen:** the full first release, shown at Saturday's demo, built entirely by AI (Claude in Claude Code). The team agrees to the DESIGN.md amendments in section 4.

### 12.1 Stack (my call, from what the team has)
- **App:** the existing Next.js 16 project, deployed to Vercel so the audience can play on their phones.
- **Data:** a Supabase project (Postgres). Tables for surveys, questions, world specs, responses and events, with row-level security: anyone may read a published survey and insert a response; only the demo workspace can write surveys.
- **Live AI:** Gemini 2.5 Flash on Google AI Studio's free tier, called only from server routes, using JSON-schema output for each stage (shaper, bias checker, gamifier, world_builder), with the prompts from `combined.system.txt`.
- **Why not Claude at runtime:** Claude in this session writes the code and the demo content, but the deployed app can't call this session. Calling Claude from the app would need a paid Anthropic API key. Gemini's free tier costs nothing for a demo.
- **Demo safety net:** three demo concepts (college fest, café Sundays, laundry pickup) get pre-generated question sets and worlds stored in Supabase. If Gemini is slow or rate-limited during the demo, Studio offers the stored version and labels it "Prepared example".
- **Needed from the team:** a Gemini API key and a Supabase project, both owned by a teammate, added later to the environment variables by the team (Claude never enters keys).
- **Building before the keys arrive (my call):** all data access goes through one storage interface with two adapters: Supabase (used when its environment variables are set) and a local JSON-file store for development. AI calls go through one client that uses Gemini when its key is set and the prepared examples otherwise. The Supabase schema ships as SQL migration files the team runs on their project.

### 12.2 What ships by Saturday

| Area | In the demo release | Simplified for Saturday |
|---|---|---|
| Studio entry | "Start from a concept" page with the quick picks (5.2) | No sign-up or login: one shared demo workspace |
| Questions | Live shaper + bias checker; a review list with Accept / Edit per question and bias flags | Not the full S4 Builder (no drag reorder, no diff view, no Left-out drawer) |
| Story | World card, storyboard (swap scene, reword line, move chapter break), integrity panel, preview with Plain view | Regenerate per chapter only, no full world edit form |
| Templates | Journey Map, Stations Room, Chat Story × Clay, Paper-cut, at the full scope of section 9: 6 base scenes + ending per scene template, each look with its own art treatment | Nothing cut (Nisarg, 12 Nov) |
| Player | Title card, chapters, all 7 mechanics, interludes, open-question postcard, ending scene, enjoyment tap, reveal at 20+ responses, journey postcard with PNG download, plain toggle, reduced motion | Nothing cut |
| Publish | Public link `/s/:slug`, QR code, WhatsApp share, A/B split on | No close-date settings |
| Results | Story vs plain card: completion, median time, enjoyment, switches, per-question distributions with the answer-shift alarm | No themes, dashboard or report pages |
| Sound | Optional ambient loop per mood, off by default | Nothing cut |

**Pilot targets (my call):** none are set before the demo. The demo reports whatever the audience's play-throughs show, clearly labelled with the response count, and the team sets targets after.

**Build branch (my call):** start from `landing-motion` (PR #1) so the deployed demo includes the improved landing page; PR #1 should merge first.

### 12.3 Risks specific to the deadline
- **Two days for the whole stack, with nothing cut from Story Mode.** The only simplifications are outside Story Mode (no login, a review list instead of the full Builder, no themes/dashboard/report pages). If the build falls behind, Claude tells Nisarg what is at risk; nothing is dropped without asking.
- **Gemini free-tier limits** during a live demo: the prepared examples cover it.
- **Untested on real phones:** a play-through on at least one Android phone in WhatsApp's browser before Saturday is part of done.

## 13. Later phases

Story Mode depends on the Survey Player (UI_UX_LAYOUT.md build step 2: all seven mechanics, welcome, thank-you, reveal) and on Style and Publish (steps 6–7). For the demo these are built in the simplified form described in 12.2; after the demo they grow into the full pages.

| Phase | Scope | Exit check |
|---|---|---|
| **1 · Demo release** (by Sat 14 Nov) | Section 12.2 | Demo played live on phones |
| **1b · Harden** (after the demo) | Full S4 Builder, sign-up, a pilot with one real club or café survey | Pilot shows no answer shift |
| **2 · Richer worlds** | More formats (Comic Panels, Arcade Skins, Build-a-Thing), more looks, AI-generated backdrops with moderation and size caps, story demo on the landing page | Ship only formats whose A/B shows no answer shift |
| **3 · Later** | Living crowd world, creator-made templates, regional languages | After core P0 pages are done |

**Docs to update in Phase 1:** DESIGN.md (rule amendments in section 4, Story components), UI_UX_LAYOUT.md (S3d, Story style in S5, storyboard, integrity panel, Story vs plain card), `combined.system.txt` (new stage), architecture diagram (world builder, validator, template library).

## 14. Answered on 12 Nov 2026

- **Deadline and scope:** demo on Saturday 14 Nov; the full first release (section 12).
- **Stack:** Supabase; a free AI provider (Gemini free tier chosen, section 12.1).
- **Rule amendments:** the team agrees.
- **Who builds:** everything is built by AI.
- **Pilot targets:** not set before the demo (my call, section 12.2).

## 15. Left to the builder

Component structure inside templates, animation curves and durations within DESIGN.md motion tokens, exact scene art, file layout under `src/components/story/`, how the catalogue is serialised for the AI prompt, and test strategy.
