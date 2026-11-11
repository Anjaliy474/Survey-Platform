# Story Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A creator types a concept, approves AI-shaped questions, gets an AI-built story world (Journey Map, Stations Room or Chat Story, in Clay or Paper-cut), publishes a link, respondents play it (or a plain form, 50/50), and Studio compares story vs plain, all by Saturday 14 Nov 2026.

**Architecture:** Pure TypeScript domain logic in `src/lib/` (types, rules, validator, stats) with Vitest tests; one storage interface with a local JSON adapter and a Supabase adapter chosen by env; one AI client that calls Gemini 2.5 Flash over REST when a key exists and falls back to prepared examples; Next.js route handlers as the API; a Player (`/s/[slug]`) that renders either the plain one-per-screen style or a code-split story template; a minimal Studio under `/studio` with no login.

**Tech Stack:** Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript, Tailwind 4 with PlaySurvey tokens, `motion`, `@phosphor-icons/react`, Vitest, zod, `@supabase/supabase-js`, `qrcode`, Web Audio API (synthesised ambient sound, no audio files).

**Spec:** `docs/superpowers/specs/2026-11-12-story-mode-design.md`

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/01-app/` before writing a route handler, page, server/client component or caching code (AGENTS.md: this Next.js has breaking changes; `cacheComponents: true` is on).
- Tokens only (`src/styles/tokens.css`): no raw hex or px in components; new tokens go in `tokens.css`.
- Every number on screen comes from `src/lib/` code and wears the Computed badge; AI output is draft until the creator accepts it.
- Player mechanics are only: `tap_chips_single`, `tap_chips_multi`, `this_or_that`, `segmented_scale`, `emoji_scale`, `number_row_11`, `text_box`.
- No points, scores, badges, streaks, leaderboards, prizes, avatars, characters, countdown timers, sliders or skill/timing-based answering anywhere in the Player.
- Integrity rules 1–8 from spec §3 hold in every template.
- Copy limits (words): world title ≤ 5, premise 1 sentence, prologue ≤ 20, chapter title ≤ 4, intro line ≤ 12, interlude line ≤ 12, acknowledgement ≤ 5, ending line ≤ 20, postcard title ≤ 6.
- Banned words in any story copy: win, winner, score, points, prize, reward, level up, streak, hurry, correct, wrong, best answer.
- Allowed copy tokens: `{{questions_left}}`, `{{time_left}}`, `{{respondent_count}}`; no other digits in AI copy.
- Time: 10 s per closed question, 45 s per open question, + 5 s title card, + 2 s per interlude, + 4 s prologue (Full only), + 10 s ending.
- Reveal only after submit and only with ≥ 20 responses; comparison only with ≥ 30 responses per arm.
- Story Mode budget: ≤ 300 KB gzip JS+CSS+images on first load of `/s/[slug]`, fonts excluded; plain style ≤ 150 KB.
- Respect `prefers-reduced-motion` everywhere (still scenes, ≤ 120 ms crossfades).
- Touch targets ≥ 48 px in the Player, ≥ 44 px in Studio; works at 360 px with no horizontal scroll.
- Claude never enters API keys; env vars: `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Do not commit `.omc/` or `.data/`; add `.data/` to `.gitignore`.
- Commit steps run only once Nisarg has given permission to commit for this build.

## Review Focus

1. **Gemini returns bad JSON, a partial world or breaks a rule** → the server retries once with the failures listed, then offers the prepared example (if the concept matches) or the plain style; Studio never shows a broken world. Test in Task 6.
2. **A respondent reloads mid-survey or switches to plain** → the same response continues with answers kept; no second response row. Test in Task 7.
3. **Double-tapped Submit or a second visit after finishing** → exactly one completed response; the second visit shows "You've already answered this one. Thanks!". Test in Task 7.
4. **An arm has 0 or a handful of responses** → the comparison shows "Too few responses to compare", never NaN or a p-value. Test in Task 4.
5. **A question with many or long options (8+ chips, 40-character labels)** → the prop family wraps into rows inside the question card at 360 px, labels never truncated. Check in Task 9's browser step.

---

### Task 1: Test setup, domain types and the mechanics table

**Files:**
- Create: `vitest.config.ts`, `src/lib/survey/types.ts`, `src/lib/survey/mechanics.ts`
- Test: `src/lib/survey/mechanics.test.ts`
- Modify: `package.json` (devDeps `vitest`, deps `zod`; script `"test": "vitest run"`), `.gitignore` (add `.data/`)

**Interfaces:**
- Produces (`types.ts`):
  - `QuestionType = "single_choice" | "multi_choice" | "rating_scale" | "nps_0_10" | "yes_no" | "number_band" | "short_text" | "long_text"`
  - `Mechanic` = the seven names above
  - `Question { id: string; text: string; type: QuestionType; options: string[]; scale: { points: number; min_label: string; max_label: string } | null; required: boolean; sensitive: boolean; collects_personal_data: boolean; role: string; reason: string; maps_to_decision: string; change: { action: string; source_id: string; before: string; why: string }; maxPicks?: number }` (shaper schema from `combined.system.txt`)
  - `QuestionSet { purpose_line: string; consent_line: string; summary_for_creator: string; decisions_informed: string[]; assumptions: string[]; status: string; questions: Question[]; notes_for_creator: string[]; flags: string[] }`
  - `BiasReport` = bias_checker output schema
  - `GamifierItem { question_id: string; mechanic: Mechanic; lead_in: string; feedback_after_answer: string; helper_text: string }`, `Gamifier` = gamifier output schema (style fixed `one_per_screen`)
  - `PlayfulLevel = "light" | "medium" | "full"`; `Format = "journey_map" | "stations_room" | "chat_story"`; `Look = "clay" | "paper_cut"`; `Mood = "cosy" | "adventure" | "festive" | "space" | "nature" | "retro" | "everyday_india"`
  - `QuickPicks { concept: string; audience: string; ageBand: "13+" | "18+"; format: Format; mood: Mood; look: Look; level: PlayfulLevel; brandColor: string | null; logoDataUrl: string | null; timeLimitSec: number | null }`
  - `WorldSpec`, `Chapter`, `StoryItem`, `Ending` = spec §7 schema, with `scene_id`, `slot`, `prop_family` as strings
  - `SurveyStatus = "draft" | "live"`; `Survey { id: string; slug: string; status: SurveyStatus; picks: QuickPicks; questionSet: QuestionSet | null; questionsApproved: boolean; bias: BiasReport | null; gamifier: Gamifier | null; world: WorldSpec | null; worldAccepted: boolean; splitAB: boolean; prepared: boolean; createdAt: string; publishedAt: string | null }`
  - `Arm = "story" | "plain"`; `Answer = number | number[] | string | null`; `ResponseRecord { id: string; surveyId: string; arm: Arm; switchedToPlain: boolean; answers: Record<string, Answer>; startedAt: string; completedAt: string | null; enjoyment: number | null; visitorId: string }`
  - `StoryEvent { surveyId: string; responseId: string; type: "story_chapter_viewed" | "story_skip_prologue" | "story_switch_plain" | "story_sound_on"; at: string; data?: Record<string, string | number> }`
  - zod schemas for each AI output: `questionSetSchema`, `biasReportSchema`, `gamifierSchema`, `worldSpecSchema`
- Produces (`mechanics.ts`): `allowedMechanics(q: Question): Mechanic[]`; `isOpen(q: Question): boolean` (short_text, long_text)

- [ ] **Step 1:** `npm install -D vitest --ignore-scripts` and `npm install zod --ignore-scripts`; add the `test` script and `vitest.config.ts` (node environment, `@` alias to `src`).
- [ ] **Step 2: Write the failing test** `mechanics.test.ts`:
  - single_choice with 2 options → `["tap_chips_single", "this_or_that"]`; with 3 options → `["tap_chips_single"]`
  - multi_choice → `["tap_chips_multi"]`; nps_0_10 → `["number_row_11"]`; yes_no → `["this_or_that"]`; number_band → `["tap_chips_single"]`; short_text and long_text → `["text_box"]`
  - rating_scale whose text matches satisfied/feel/happy → `["segmented_scale", "emoji_scale"]`; "How likely…" or "agree" → `["segmented_scale"]`
- [ ] **Step 3:** Run `npm test` → FAIL (module not found).
- [ ] **Step 4:** Implement `types.ts` and `mechanics.ts` (emoji_scale only when the text matches `/satisf|feel|happy|enjoy/i` and not `/agree|likely|often/i`).
- [ ] **Step 5:** Run `npm test` → PASS. Commit `feat: add story mode domain types and mechanics table`.

### Task 2: Time estimate and brand colour contrast

**Files:**
- Create: `src/lib/survey/timing.ts`, `src/lib/survey/contrast.ts`
- Test: `src/lib/survey/timing.test.ts`, `src/lib/survey/contrast.test.ts`

**Interfaces:**
- Consumes: `Question`, `WorldSpec`, `PlayfulLevel`, `isOpen` (Task 1)
- Produces: `plainSeconds(questions: Question[]): number`; `storySeconds(questions: Question[], chapterCount: number, level: PlayfulLevel): number`; `formatAbout(seconds: number): string` (re-export from `src/lib/compute.ts`); `contrastRatio(hexA: string, hexB: string): number` (WCAG 2.1); `passingShade(brandHex: string, againstHex: string, min = 4.5): string` (darkens or lightens in HSL lightness steps of 2% until it passes); `sensitiveBriefHint(concept: string): boolean` (matches health, mental, money, salary, income, workplace, manager, identity, religion, caste)

- [ ] **Step 0: Contrast tests** (`contrast.test.ts`): `contrastRatio("#ffffff", "#000000")` = 21; `contrastRatio("#C4461B", "#ffffff")` ≈ 4.95 (±0.05); `passingShade("#FFC233", "#ffffff")` returns a colour whose ratio against white is ≥ 4.5; `sensitiveBriefHint("Should our café raise prices?")` is false, `sensitiveBriefHint("Workplace stress check-in")` is true. Brand colour is applied only through `passingShade` (Task 9 sets it as the story accent; Task 14 shows the original and the adjusted swatch).

- [ ] **Step 1: Write the failing test:**
  - `plainSeconds` of 5 closed + 1 open = 95
  - `storySeconds` same questions, 4 chapters, `light` = 95 + 5 + 10 = 110 (no interludes at Light)
  - `medium` = 95 + 5 + 3×2 + 10 = 116; `full` = 116 + 4 = 120
  - `storySeconds` with 1 chapter, `medium` → no interludes (= 95 + 5 + 10)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement in `timing.ts` (interludes = chapterCount − 1, only at medium and full).
- [ ] **Step 4:** Run → PASS. Commit `feat: add story time estimate and brand contrast`.

### Task 3: Template catalogue and world validator

**Files:**
- Create: `src/lib/story/catalogue.ts`, `src/lib/story/validate-world.ts`
- Test: `src/lib/story/validate-world.test.ts`

**Interfaces:**
- Consumes: types (Task 1), `allowedMechanics`, `storySeconds` (Task 2)
- Produces:
  - `CATALOGUE: Record<Format, TemplateDef>` where `TemplateDef { id: Format; scenes: { id: string; label: string; slots: string[] }[]; endingSceneId: string; propFamilies: Record<Mechanic, string[]>; sizeKb: Record<Look, number> }`
  - Journey Map scenes (6 + ending): `gate`, `market_street`, `riverside`, `hill_path`, `stage_square`, `night_sky`, ending `lantern_release`. Stations Room scenes: `counter`, `menu_wall`, `window_seat`, `shelf_corner`, `notice_board`, `back_garden`, ending `closing_time`. Chat Story: `chat_thread` only, plus 8 sticker ids `sticker_1`…`sticker_8`.
  - Prop families per mechanic (designed in Tasks 10–12): Journey Map `{ tap_chips_single: ["signposts","posters"], tap_chips_multi: ["posters","bunting"], this_or_that: ["lanterns_pair","gates_pair"], segmented_scale: ["lamp_row"], emoji_scale: ["lantern_row"], number_row_11: ["star_row"], text_box: ["postcard"] }`; Stations Room `{ tap_chips_single: ["menu_cards"], tap_chips_multi: ["jar_labels"], this_or_that: ["cups_pair"], segmented_scale: ["jar_row"], emoji_scale: ["mug_row"], number_row_11: ["shelf_numbers"], text_box: ["notebook"] }`; Chat Story every mechanic `["reply_chips"]`.
  - `sizeKb` starts at 0 and is filled by Task 17's measurement.
  - `ValidationFailure { rule: string; chapterId?: string; questionId?: string; message: string }`
  - `validateWorld(world: WorldSpec, ctx: { questions: Question[]; gamifier: Gamifier; level: PlayfulLevel; timeLimitSec: number | null }): ValidationFailure[]`
  - `BANNED_WORDS: string[]`, `wordCount(s: string): number`

- [ ] **Step 1: Write failing tests** (a valid 6-question fixture world passes with `[]`), then one test per rule, each expecting a failure with this `rule` id:
  - `coverage`: a question missing, duplicated, or out of approved order
  - `chapter_size`: a chapter with 0 or 5 questions; `open_alone`: an open question sharing a chapter
  - `mechanic`: the gamifier mechanic not allowed for the type; `prop_family`: a family not in the template for that mechanic
  - `catalogue`: unknown `scene_id`, `slot` or `template`
  - `copy_length`: intro line of 13 words; acknowledgement of 6; prologue of 21 when level is full
  - `copy_empty`: a non-empty intro line at Light
  - `digits`: "Only 3 left" in an interlude line; `{{time_left}}` passes
  - `banned`: "You win a prize" in the ending line (case-insensitive, whole words)
  - `time_budget`: `storySeconds` > `timeLimitSec`
  - `size_budget`: `sizeKb[look]` > 150
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `catalogue.ts` and `validate-world.ts`.
- [ ] **Step 4:** Run → PASS. Commit `feat: add story template catalogue and world validator`.

### Task 4: A/B assignment and story-vs-plain comparison

**Files:**
- Create: `src/lib/stats/chi-square.ts`, `src/lib/survey/ab.ts`, `src/lib/survey/compare.ts`
- Test: `src/lib/stats/chi-square.test.ts`, `src/lib/survey/compare.test.ts`

**Interfaces:**
- Consumes: `ResponseRecord`, `Question`, `median`, `percent` (`src/lib/compute.ts`)
- Produces:
  - `chiSquare(table: number[][]): { statistic: number; df: number; p: number } | null` (null when any row or column total is 0 after dropping empty columns)
  - `holm(pValues: number[]): number[]` (adjusted, same order)
  - `assignArm(splitAB: boolean, rand?: () => number): Arm` (`"story"` when split is off)
  - `MIN_PER_ARM = 30`
  - `ArmStats { n: number; completed: number; completionPct: number; medianSeconds: number; enjoymentMean: number | null; switches: number }`
  - `compareArms(responses: ResponseRecord[], questions: Question[]): { story: ArmStats; plain: ArmStats; enough: boolean; shifts: { questionId: string; pAdjusted: number; differs: boolean }[] }`

- [ ] **Step 1: Write failing tests:**
  - `chiSquare([[10,20],[20,10]])` → statistic ≈ 6.667, df 1, p ≈ 0.0098 (±0.0005)
  - `chiSquare([[0,0],[5,5]])` → null
  - `holm([0.01, 0.04, 0.03])` → `[0.03, 0.06, 0.06]`
  - `compareArms` with 29 story + 40 plain → `enough: false`, `shifts: []`
  - with 0 plain → `plain.n === 0`, `enough: false`, no NaN anywhere (`Number.isNaN` false for all numeric fields; `enjoymentMean` null)
  - with 40 + 40 identical distributions → every `differs: false`; with a forced opposite split on Q1 → Q1 `differs: true` (pAdjusted < 0.05)
  - `switchedToPlain` responses count in the story arm and in `switches`
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; chi-square p-value via the regularised upper incomplete gamma function (series / continued fraction, Numerical Recipes `gammq`). Multi-choice questions compare per-option picked/not-picked tables and take the smallest p for that question before Holm. Open questions are skipped.
- [ ] **Step 4:** Run → PASS. Commit `feat: add a/b assignment and story vs plain comparison`.

### Task 5: Storage interface, local adapter, Supabase adapter and schema

**Files:**
- Create: `src/lib/store/store.ts`, `src/lib/store/local-store.ts`, `src/lib/store/supabase-store.ts`, `src/lib/store/index.ts`, `supabase/migrations/0001_story_mode.sql`
- Test: `src/lib/store/local-store.test.ts`
- Modify: `package.json` (dep `@supabase/supabase-js`)

**Interfaces:**
- Consumes: `Survey`, `ResponseRecord`, `StoryEvent`, `Answer`, `Arm` (Task 1)
- Produces:
  - `interface SurveyStore { createSurvey(s: Survey): Promise<Survey>; getSurvey(id: string): Promise<Survey | null>; getSurveyBySlug(slug: string): Promise<Survey | null>; listSurveys(): Promise<Survey[]>; updateSurvey(id: string, patch: Partial<Survey>): Promise<Survey>; startResponse(r: ResponseRecord): Promise<ResponseRecord>; getResponse(id: string): Promise<ResponseRecord | null>; saveAnswer(responseId: string, questionId: string, answer: Answer): Promise<void>; markSwitched(responseId: string): Promise<void>; completeResponse(responseId: string, enjoyment: number | null): Promise<ResponseRecord>; listResponses(surveyId: string): Promise<ResponseRecord[]>; logEvent(e: StoryEvent): Promise<void> }`
  - `getStore(): SurveyStore` (Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, else local at `.data/store.json`)
  - `newId(prefix: string): string`, `newSlug(title: string): string` (kebab title + 4 random base36 chars)

- [ ] **Step 1: Write failing tests** for `LocalStore` against a temp file: create/get/getBySlug/list; `saveAnswer` twice on the same question keeps the latest; `completeResponse` twice returns the same `completedAt` (idempotent, Review Focus 3); `markSwitched` sets the flag without changing `arm`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `LocalStore` (one JSON file, writes serialised through a promise queue) and `SupabaseStore` (same behaviour over tables `surveys`, `responses`, `events`; survey body stored as `jsonb`; `completeResponse` uses `update … where completed_at is null` then reads back).
- [ ] **Step 4:** Write `0001_story_mode.sql`: tables `surveys(id text pk, slug text unique, status text, body jsonb, created_at timestamptz, published_at timestamptz)`, `responses(id text pk, survey_id text references surveys, arm text check (arm in ('story','plain')), switched_to_plain boolean default false, answers jsonb default '{}', enjoyment int, visitor_id text, started_at timestamptz, completed_at timestamptz)`, `events(id bigserial pk, survey_id text, response_id text, type text, data jsonb, at timestamptz)`; RLS on all three with no anon policies (the app only uses the service role on the server).
- [ ] **Step 5:** Run → PASS. Commit `feat: add survey store with local and supabase adapters`.

### Task 6: AI client, stages, world_builder prompt and prepared examples

**Files:**
- Create: `src/lib/ai/gemini.ts`, `src/lib/ai/stages.ts`, `src/lib/ai/prepared/fest.json`, `src/lib/ai/prepared/cafe.json`, `src/lib/ai/prepared/laundry.json`, `src/lib/ai/prepared/index.ts`
- Test: `src/lib/ai/stages.test.ts`
- Modify: `combined.system.txt` (add `<world_request>` → `world_builder` to the stage list and a new `<stage name="world_builder">` block with spec §7's job, writing rules and schema)

**Interfaces:**
- Consumes: zod schemas (Task 1), `validateWorld`, `CATALOGUE` (Task 3)
- Produces:
  - `callGemini<T>(rootTag: string, payload: unknown, schema: z.ZodType<T>, jsonSchema: object): Promise<T>` (POST `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=…`, `systemInstruction` = full `combined.system.txt`, user text = `<rootTag>JSON</rootTag>`, `generationConfig: { responseMimeType: "application/json", responseSchema }`, 45 s timeout, throws `AiError` on HTTP or parse failure)
  - `shapeQuestions(picks: QuickPicks): Promise<{ result: QuestionSet; prepared: boolean }>`
  - `checkBias(set: QuestionSet, picks: QuickPicks): Promise<BiasReport>`
  - `gamify(set: QuestionSet, level: PlayfulLevel): Promise<Gamifier>`
  - `buildWorld(input: { set: QuestionSet; gamifier: Gamifier; picks: QuickPicks }, edit?: { world: WorldSpec; chapterId: string; instruction: string }): Promise<{ world: WorldSpec; failures: ValidationFailure[]; prepared: boolean }>`
  - `findPrepared(concept: string): PreparedExample | null` (case-insensitive keyword match: fest, café/cafe + Sunday, laundry)
  - `aiAvailable(): boolean`

- [ ] **Step 1: Write failing tests** (stub `fetch`):
  - no `GEMINI_API_KEY` + concept "Feedback for our college fest" → prepared fest set, `prepared: true`
  - no key + an unmatched concept → throws `AiError` with message "AI isn't connected yet. Add a Gemini key or try one of the prepared examples."
  - Gemini returns invalid JSON once then valid → result parsed, fetch called twice
  - `buildWorld` where the first response fails validation (13-word intro) and the retry passes → `failures: []`, second request includes the failure messages
  - both attempts fail validation → `failures` non-empty and, when a prepared example matches, `world` = prepared world with `prepared: true` (Review Focus 1)
  - each prepared JSON passes its zod schema and `validateWorld` with `[]`
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Write the prepared examples (spec §12.1): fest → Journey Map, festive, clay, 6 questions; café Sundays → Stations Room, cosy, paper_cut, 7 questions; laundry pickup → Chat Story, everyday_india, clay, 6 questions. Questions follow the shaper rules; worlds follow spec §7 and the validator.
- [ ] **Step 4:** Implement `gemini.ts`, `stages.ts`, `prepared/index.ts`; add the `world_builder` stage text to `combined.system.txt` (catalogue serialised into the request payload, not the system prompt).
- [ ] **Step 5:** Run → PASS. Commit `feat: add gemini client, stages and prepared examples`.

### Task 7: API routes

**Files:**
- Create: `src/app/api/surveys/route.ts` (POST), `src/app/api/surveys/[id]/route.ts` (GET, PATCH), `src/app/api/surveys/[id]/world/route.ts` (POST build, PATCH edit chapter), `src/app/api/surveys/[id]/publish/route.ts` (POST), `src/app/api/surveys/[id]/results/route.ts` (GET), `src/app/api/play/[slug]/route.ts` (POST start/resume), `src/app/api/play/[slug]/answer/route.ts` (POST), `src/app/api/play/[slug]/complete/route.ts` (POST), `src/app/api/play/[slug]/event/route.ts` (POST)
- Create: `src/lib/api/handlers.ts` (route logic as plain functions so tests don't need Next)
- Test: `src/lib/api/handlers.test.ts`

**Interfaces:**
- Consumes: `getStore` (Task 5), stages (Task 6), `validateWorld` (Task 3), `assignArm`, `compareArms` (Task 4)
- Produces (JSON bodies):
  - `POST /api/surveys { picks }` → `{ survey }` (runs shapeQuestions + checkBias; sensitive question → `survey.picks.format` kept but `storyBlocked: true` in response)
  - `PATCH /api/surveys/:id { questionSet?, questionsApproved?, picks? }` → `{ survey }`; approving runs `gamify`
  - `POST /api/surveys/:id/world` → `{ survey, failures, prepared }` (409 if questions not approved or any question sensitive)
  - `PATCH /api/surveys/:id/world { chapterId, instruction } | { world }` (manual swap/reword/break edits, validated) → `{ survey, failures }`
  - `POST /api/surveys/:id/publish { splitAB }` → `{ survey, url }` (409 unless world accepted and `validateWorld` is `[]`; after publish world PATCH → 409)
  - `GET /api/surveys/:id/results` → `compareArms` output + `total`
  - `POST /api/play/:slug { responseId?, visitorId }` → `{ survey (public fields only), response }`: resumes when `responseId` exists for this survey, returns `alreadyAnswered: true` if completed; else creates with `assignArm`
  - `POST /api/play/:slug/answer { responseId, questionId, answer }`; `POST …/complete { responseId, enjoyment }` → `{ response, reveal }` (reveal only when completed count ≥ 20: per eligible closed non-sensitive question, `percentsSummingTo100` of option counts); `POST …/event { responseId, type, data }`; `PATCH`-style switch is `event` type `story_switch_plain` plus `markSwitched`
- `handlers.ts` exports one function per route with signature `(store: SurveyStore, input: unknown, params: Record<string,string>) => Promise<{ status: number; body: unknown }>`; each route file only parses the request and calls it.

- [ ] **Step 1: Write failing tests** against `LocalStore` + prepared AI:
  - create from "Feedback for our college fest" → survey with 6 questions, `questionsApproved: false`
  - build world before approval → 409
  - full happy path: approve → world → accept → publish → play start returns an arm; 2nd start with the same `responseId` returns the same response (Review Focus 2)
  - complete twice → same `completedAt`; start after completion → `alreadyAnswered: true` (Review Focus 3)
  - world PATCH after publish → 409
  - reveal absent with 19 completed, present with 20
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `handlers.ts` and the thin route files (read `15-route-handlers.md` first; dynamic `params` are async in this version, check the doc).
- [ ] **Step 4:** Run → PASS; `npx tsc --noEmit` clean. Commit `feat: add studio and player api routes`.

### Task 8: Complete Player mechanics and the plain Player

**Files:**
- Modify: `src/components/player/mechanics.tsx` (add `TapChipsSingle`, `SegmentedScale`, `NumberRow11`, `TextBox`; keep existing exports)
- Create: `src/components/player/Mechanic.tsx` (dispatches `GamifierItem.mechanic` + `Question` to the right component, `skin?: string` prop passed through), `src/components/player/PlainPlayer.tsx`, `src/components/player/TitleCard.tsx`, `src/components/player/ThankYou.tsx`, `src/components/player/Reveal.tsx`, `src/components/player/usePlayerSession.ts`
- Create: `src/app/s/[slug]/page.tsx`, `src/app/s/[slug]/PlayerApp.tsx`
- Modify: `src/styles/player.css`

**Interfaces:**
- Consumes: play API (Task 7), types, `storySeconds`/`plainSeconds`, `formatAbout`
- Produces:
  - `<Mechanic question={Question} item={GamifierItem} value={Answer} onChange={(a: Answer) => void} skin?: string />`
  - `usePlayerSession(slug: string): { state: "loading" | "ready" | "closed" | "not_found" | "already" | "offline"; survey; response; answer(qid: string, a: Answer): void; complete(enjoyment: number | null): Promise<RevealData | null>; switchToPlain(): void; logEvent(type, data?): void }` (stores `responseId` and `visitorId` in localStorage; queues answers while offline and resends)
  - `<PlainPlayer survey response session />` = one-per-screen per DESIGN.md §7 (progress bar, remaining pill, lead-in, question, mechanic, feedback, Back/Next, 400 ms auto-advance for single-select, Skip for text)
  - `<TitleCard title purposeLine consentLine meta="6 questions · about 2 min" onPlay onPlain? />`, `<ThankYou onEnjoyment />` (5 labelled faces), `<Reveal data />`

- [ ] **Step 1:** Implement the four mechanics with the same roving-key pattern as the existing three; `SegmentedScale` fills only the chosen segment; `NumberRow11` splits 0–5 / 6–10 under 400 px; `TextBox` always has Skip.
- [ ] **Step 2:** Implement session hook, plain Player, title card, thank-you, reveal and `/s/[slug]` (server page loads nothing secret; `PlayerApp` is the client root; arm `plain` renders `PlainPlayer`, arm `story` renders the story Player from Task 9 via `next/dynamic`).
- [ ] **Step 3:** Browser check with the prepared fest survey published through the API: plain arm plays start to finish at 360 px and 1280 px, keyboard only, reduced motion; reload mid-way resumes; second visit shows "You've already answered this one. Thanks!".
- [ ] **Step 4:** `npm test`, `npx tsc --noEmit`, `npx eslint src` clean. Commit `feat: add complete player mechanics and plain player`.

### Task 9: Story engine

**Files:**
- Create: `src/components/story/StoryPlayer.tsx`, `src/components/story/QuestionCard.tsx`, `src/components/story/PropChoice.tsx`, `src/components/story/Interlude.tsx`, `src/components/story/Prologue.tsx`, `src/components/story/EndingScene.tsx`, `src/components/story/PlainSwitch.tsx`, `src/components/story/template-api.ts`, `src/styles/story.css`
- Modify: `src/app/globals.css` (import `story.css`), `src/styles/tokens.css` (story tokens)

**Interfaces:**
- Consumes: `<Mechanic skin>` (Task 8), `WorldSpec`, `CATALOGUE`, session hook
- Produces:
  - `template-api.ts`: `interface StoryTemplate { id: Format; Scene: ComponentType<{ sceneId: string; look: Look; mood: Mood; active: boolean; reduced: boolean }>; Ending: ComponentType<{ look: Look; mood: Mood; reduced: boolean }>; skins: Record<string, ComponentType<SkinProps>> }`; `SkinProps { label: string; index: number; count: number; selected: boolean; look: Look }` (renders the object for one option; the button, role and label stay in `PropChoice`)
  - `loadTemplate(format: Format): Promise<StoryTemplate>` (dynamic import per format)
  - `<StoryPlayer survey response session template />`: title card → prologue (full) → chapters (scene + `QuestionCard`) → interludes (medium/full) → open-question card → submit → `EndingScene` → `ThankYou` → `Reveal`/teaser → postcard (Task 13). Progress line "Chapter 2 of 4 · about 1 min left". Back always works. `PlainSwitch` visible on every screen.
  - `<QuestionCard>` = solid-background card with the exact question text and `<Mechanic skin={item prop_family}>`; contrast passes on every scene
  - `<PropChoice>` renders every option with the same skin component; only `selected` differs; options wrap into rows; labels never truncate

- [ ] **Step 1:** Implement the engine against a placeholder template (`templates/_placeholder`) that draws a flat tinted scene.
- [ ] **Step 2:** Browser check: story arm of the fest survey plays end to end with the placeholder; switch to plain mid-way keeps answers; reduced motion shows still scenes; screen reader text "Question X of Y"; a question with 8 forty-character options wraps at 360 px (Review Focus 5).
- [ ] **Step 3:** Lint/type/test clean. Commit `feat: add story engine`.

### Task 10: Journey Map template (Clay and Paper-cut)

**Files:**
- Create: `src/components/story/templates/journey-map/index.tsx`, `scenes.tsx`, `skins.tsx`, `journey-map.css`

**Interfaces:**
- Consumes: `StoryTemplate`, `SkinProps` (Task 9)
- Produces: default export `journeyMap: StoryTemplate` with the 6 scenes + `lantern_release` ending and every skin named in the catalogue for `journey_map`

- [ ] **Step 1:** Build the 7 scenes as layered SVG (sky, far, mid, near planes; the trail; the walker dot moving between stops). Clay: glossy pastel shapes with `--ps-clay-*` highlights. Paper-cut: flat layered silhouettes with offset drop shadows and a paper grain made from an SVG `feTurbulence` filter. Moods change palette tokens (7 mood palettes as CSS custom properties on the scene root) and swap one ambient effect (lights twinkle, falling petals, stars, fireflies, rain dots, drifting clouds, kite).
- [ ] **Step 2:** Build skins: `signposts`, `posters`, `bunting`, `lanterns_pair`, `gates_pair`, `lamp_row`, `lantern_row`, `star_row`, `postcard`. Each option identical except label; selected = glow/lift only.
- [ ] **Step 3:** Browser check all 7 scenes × 2 looks × 3 moods at 360 px and 1280 px, light theme of the Player, reduced motion; question card contrast.
- [ ] **Step 4:** Lint/type clean. Commit `feat: add journey map story template`.

### Task 11: Stations Room template (Clay and Paper-cut)

**Files:**
- Create: `src/components/story/templates/stations-room/index.tsx`, `scenes.tsx`, `skins.tsx`, `stations-room.css`

**Interfaces:** same shape as Task 10; default export `stationsRoom: StoryTemplate` with scenes `counter`, `menu_wall`, `window_seat`, `shelf_corner`, `notice_board`, `back_garden`, ending `closing_time`, and skins `menu_cards`, `jar_labels`, `cups_pair`, `jar_row`, `mug_row`, `shelf_numbers`, `notebook`.

- [ ] **Step 1:** Build scenes as one room seen from different stations, with the active station lit and the next one glowing faintly (guided order, no free roam).
- [ ] **Step 2:** Build skins.
- [ ] **Step 3:** Same browser check as Task 10.
- [ ] **Step 4:** Commit `feat: add stations room story template`.

### Task 12: Chat Story template (Clay and Paper-cut)

**Files:**
- Create: `src/components/story/templates/chat-story/index.tsx`, `stickers.tsx`, `chat-story.css`

**Interfaces:** default export `chatStory: StoryTemplate`; `Scene` renders the thread with the world's narrator messages (intro and interlude lines as bubbles, typing dots ≤ 300 ms), 8 stickers per look as chapter dividers, skin `reply_chips`.

- [ ] **Step 1:** Implement thread, previous answers shown read-only above (tap to go back), stickers, skin.
- [ ] **Step 2:** Browser check as Task 10 (stickers × 2 looks).
- [ ] **Step 3:** Commit `feat: add chat story template`.

### Task 13: Journey postcard and ambient sound

**Files:**
- Create: `src/components/story/Postcard.tsx`, `src/lib/story/postcard-canvas.ts`, `src/components/story/AmbientSound.tsx`, `src/lib/story/ambient.ts`
- Test: `src/lib/story/postcard-canvas.test.ts`

**Interfaces:**
- Produces: `drawPostcard(ctx: CanvasRenderingContext2D, data: { title: string; chapters: string[]; look: Look; mood: Mood }): void`; `postcardFileName(title: string): string` → `"<kebab-title>-postcard.png"`; `<Postcard world onDownload />` (canvas → `toBlob` → download link); `startAmbient(mood: Mood): () => void` (Web Audio: filtered noise + slow oscillator pad per mood, gain ≤ 0.15, fade in 1 s); `<AmbientSound mood />` speaker toggle, off by default, logs `story_sound_on`

- [ ] **Step 1: Write failing test:** `postcardFileName("Fest Night Trail")` → `"fest-night-trail-postcard.png"`; `drawPostcard` on a mock context draws the title and each chapter title and never any answer text (spy `fillText` calls contain only title, chapter titles and "Thanks for taking part").
- [ ] **Step 2:** Run → FAIL; implement; run → PASS.
- [ ] **Step 3:** Browser check: postcard downloads as PNG; sound starts only after the toggle, stops on leave.
- [ ] **Step 4:** Commit `feat: add journey postcard and ambient sound`.

### Task 14: Studio shell, quick picks and question review

**Files:**
- Create: `src/app/studio/layout.tsx` (sidebar: Home, New survey; top bar with status badge), `src/app/studio/page.tsx` (survey cards with status and Continue), `src/app/studio/new/page.tsx` + `QuickPicks.tsx`, `src/app/studio/s/[id]/questions/page.tsx` + `QuestionReview.tsx`, `src/components/studio/AiWorkingPanel.tsx`, `src/components/studio/StepRail.tsx`, `src/styles/studio.css`
- Modify: `src/app/globals.css` (import `studio.css`); landing CTAs `href="/signup"` → `/studio/new` in `SiteHeader.tsx`, `Hero.tsx`, `FinalCta.tsx`

**Interfaces:**
- Consumes: `/api/surveys` routes (Task 7), types
- Produces: step rail steps `Questions → Story → Publish → Results`

- [ ] **Step 1:** Quick picks per spec §5.2 (8 inputs, only concept required, defaults with one-line reasons, **Make it for me**, three prepared-example chips "Feedback for our college fest", "Should our café open on Sundays?", "Would students pay for laundry pickup?"). Submit shows the AI working panel with stages Reading your brief → Shaping questions → Checking for bias; errors keep the input and show Retry. When `sensitiveBriefHint(concept)` is true, show the one-line reminder "This brief may touch a sensitive topic. Check the questions before turning on Story Mode." Brand colour shows the chosen and the `passingShade` swatch side by side.
- [ ] **Step 2:** Question review: AI summary card (AI badge), purpose/consent block (locked), one card per question with type, role, reason, bias flags by severity, Accept / Edit (inline text and options) per question, **Accept all**; **Next: Story** enabled when all accepted, no critical bias left unaddressed, no `[placeholder]` left; sensitive questions show "Story Mode is off for sensitive topics…" and Next goes to Publish with the plain style. "Prepared example" badge when `prepared`.
- [ ] **Step 3:** Browser check at 360 px and 1280 px, keyboard only.
- [ ] **Step 4:** Commit `feat: add studio shell, quick picks and question review`.

### Task 15: World card, storyboard, integrity panel and preview

**Files:**
- Create: `src/app/studio/s/[id]/story/page.tsx`, `WorldCard.tsx`, `Storyboard.tsx`, `IntegrityPanel.tsx`, `PreviewModal.tsx`

**Interfaces:**
- Consumes: `/api/surveys/:id/world` (Task 7), `validateWorld` (Task 3, run client-side too for instant feedback), `StoryPlayer` (Task 9) in preview mode (no API writes)

- [ ] **Step 1:** World card (title, premise, format, mood, look, narrator voice; Accept / Regenerate / Edit title-premise-mood), draft dashed until accepted.
- [ ] **Step 2:** Storyboard: chapter cards with scene thumbnail (the template's `Scene` at small size, reduced motion), question texts read-only with link to questions, intro line and acknowledgement editable with word counters, **Swap scene** (menu of the template's scenes), **Regenerate line**, **Merge with next** / **Split here**.
- [ ] **Step 3:** Integrity panel: the eight rules, copy limits, banned words, size budget (`sizeKb`), time budget (`storySeconds` vs limit), each failure with chapter name and **Fix** (scrolls to it). Publish link enabled only when all green.
- [ ] **Step 4:** Preview modal: phone frame, plays the whole story, **Plain view** toggle.
- [ ] **Step 5:** Browser check; commit `feat: add world card, storyboard, integrity panel and preview`.

### Task 16: Publish and the Story vs plain results card

**Files:**
- Create: `src/app/studio/s/[id]/publish/page.tsx`, `ShareSheet.tsx`, `src/app/studio/s/[id]/results/page.tsx`, `StoryVsPlain.tsx`
- Modify: `package.json` (dep `qrcode`, devDep `@types/qrcode`)

**Interfaces:**
- Consumes: publish and results routes (Task 7), `compareArms` output, `Badge`, `KpiTile`

- [ ] **Step 1:** Publish: checklist (questions accepted, world accepted, integrity green), split toggle "Split 50/50 to compare" on by default, **Publish**; after publish "It's live!", link + Copy (toast "Copied", fallback select), **Share on WhatsApp** (`https://wa.me/?text=` + world title + link), QR card + **Download QR** (PNG), "Go to results".
- [ ] **Step 2:** Results: sample caveat banner with total n (Computed); Story vs plain card with per-arm completion, median time, enjoyment, switches (all Computed, `n` shown); below 30 per arm "Too few responses to compare (story n = X, plain n = Y)"; when enough, each closed question listed with "Answers look the same" or the alarm "Answers to Q3 differ between story and plain. Review its scene."; auto-refresh every 10 s with a "New responses · Refresh" pill.
- [ ] **Step 3:** Browser check; commit `feat: add publish, share and story vs plain results`.

### Task 17: Demo content, budget measurement, docs and final verification

**Files:**
- Create: `scripts/seed-prepared.ts` (publishes the three prepared examples through the handlers), `scripts/measure-story-size.mjs` (builds, then sums gzip sizes of the `/s/[slug]` route's JS/CSS chunks per template from `.next` build output and writes `sizeKb` into `src/lib/story/catalogue.ts`)
- Modify: `DESIGN.md` (§4 and §12 amendments from spec §4; Story Mode components), `UI_UX_LAYOUT.md` (S3d, Story style in S5, storyboard, integrity panel, Story vs plain card), `survey-platform-architecture.mmd` (World builder, World validator, Template library nodes), `README.md` (Story Mode, env vars, `supabase/migrations`, `npm test`, seeding)

- [ ] **Step 1:** Run the seed script locally; play each prepared survey in both arms.
- [ ] **Step 2:** `npm run build` passes; run the size script; every template × look ≤ 150 KB on top of the plain Player and total ≤ 300 KB; plain ≤ 150 KB. If over, report which template and by how much before trimming.
- [ ] **Step 3:** Update the four docs.
- [ ] **Step 4:** Final checks: `npm test`, `npx tsc --noEmit`, `npx eslint src`, `npm run build` all clean; full creator flow from the landing CTA to results at 360 px and 1280 px; reduced motion; keyboard only.
- [ ] **Step 5:** Commit `docs: document story mode; chore: seed and size scripts`.
- [ ] **Step 6:** Hand Nisarg the deploy checklist: run `supabase/migrations/0001_story_mode.sql` on the team's project; set `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` on Vercel; run the seed against Supabase; play one survey on an Android phone inside WhatsApp's browser.
