# PlaySurvey

An AI-first survey platform: short, game-like surveys people actually finish, and insight you can act on.
Team 3, PD3.401 AI for Product Managers, IIIT Hyderabad.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

`npm run build` makes a production build (it also type-checks), and `npm run lint` runs ESLint.

## Where things are

| Path | What |
|---|---|
| `DESIGN.md` | Visual rules: tokens, type, components, motion |
| `UI_UX_LAYOUT.md` | Page-by-page structure, states and acceptance checks |
| `combined.system.txt` | The AI engine's system prompt and JSON schemas |
| `survey-platform-architecture.mmd` | End-to-end architecture flow |
| `src/styles/tokens.css` | Design tokens (`--ps-*`), mapped to Tailwind in `src/app/globals.css` |
| `src/components/player/` | Survey Player: all 7 mechanics, the plain one-per-screen Player, title, thank-you, reveal |
| `src/components/story/` | Story Mode engine and templates (Journey Map, Stations Room, Chat Story) |
| `src/app/studio/` | Studio: start from a concept, review questions, story, publish, results |
| `src/lib/story/` | Template catalogue, world validator, postcard, ambient sound |
| `src/lib/ai/` | Gemini client, AI stages, prepared demo examples |
| `src/lib/store/` | Storage: Supabase when configured, else `.data/store.json` |
| `supabase/migrations/` | Database tables to run on the team's Supabase project |
| `docs/superpowers/` | Story Mode design and implementation plan |
| `src/components/marketing/` | Landing page sections |
| `src/lib/compute.ts` | The compute layer: every number shown comes from here, never from the AI |

## Try the survey Player

| Link | What it shows |
|---|---|
| `/s/cafe-feedback` | Golden example H4: chat style, Medium playful level, 371 sample responses so the results reveal shows |
| `/s/volunteer-feedback` | Golden example H3: one question per screen, Light level, optional email with a consent line, 14 sample responses so the "results soon" teaser shows |
| `/s/canteen-menu-poll` | A closed survey |

Preview any style, level or theme with `?style=one_per_screen|pages|chat|classic&level=off|light|medium&theme=marigold|lagoon|night`, for example `/s/cafe-feedback?style=pages&theme=night`. Progress is saved in the browser; the "Demo only: answer again" button on the thank-you screen clears it.

## Build progress

Following `UI_UX_LAYOUT.md`, one page at a time:

- [x] M1 Landing page (`/`), with sample data
- [x] P1 Survey Player (`/s/:slug`): all 7 mechanics, 4 styles, 3 playful levels, 3 themes, sample surveys
- [x] Studio shell + S1 Home (`/app`): sidebar, top bar, step rail, results tabs, survey cards with Duplicate / Close / Delete
- [x] Start chooser + three ways to start (`/app/new`, `/app/new/questions`, `/research`, `/prompt`) with the AI working panel
- [x] S4 Question builder + review (`/app/s/:id/build`): accept / edit / keep mine, bias flags, rules meter, preview
- [x] S5 Style and gamify (`/app/s/:id/style`): style, playful level, theme with contrast check, words on screen, mechanics, reveal, live phone preview
- [x] S6 Publish and share (`/app/s/:id/publish`): checklist, close / one-response settings, share sheet with copy, WhatsApp, QR (PNG) and embed
- [x] R1 Results overview (`/app/s/:id/results`): caveat banner, KPIs, responses over time, drop-off, a chart per question (bars, diverging Likert, NPS), data quality flags, View as table
- [x] R3 Themes (`/app/s/:id/themes`): themes with coding rules and verbatim quotes, counts and ties from code, sentiment split, minority mentions, suggested new themes, rename / merge, personal data masked
- [x] R4 Dashboard (`/app/s/:id/dashboard`): describe it in words, library charts only, a done / adapted / not-possible mapping, filters, draft cards to accept or remove, edits in words, n per group and hatched small groups
- [x] A1 Sign up / Log in, A2 Onboarding, X1 Settings (profile; data and privacy with download, delete responses, deletion requests by response ID, and a deletion log), /privacy, /terms, error page, Studio offline banner
- [x] R2 Responses (`/app/s/:id/responses`): flagged responses pinned with Keep / Exclude, filters, response drawer, personal data masked (showing it is confirmed and logged), CSV export with an "excluded" column; M2 Pricing (`/pricing`)
- [x] R5 Ask your data (`/app/s/:id/ask`): the assistant picks tools, code runs them, every number in the answer is checked against the tool results; base always given, with/without flagged, how it was calculated, pin to dashboard
- [x] R6 Insight report (`/app/s/:id/report`): code builds the analysis pack (data quality, shares, NPS, chi-square tests with Holm correction, effect sizes, themes), the report cites evidence IDs, and code drops any finding whose numbers can't be traced; Creator / Analyst / Leadership versions; Download PDF via print
- [x] Story Mode demo release (Nisarg): its own Studio at `/studio` and story Players at `/s/:slug`, with a Gemini client, a store (Supabase or `.data/store.json`) and story vs plain A/B results

Every page in `UI_UX_LAYOUT.md` §7 is built. Next would be connecting Claude in place of the `src/lib/ai/demo-*.ts` stand-ins, and a backend in place of browser storage.

**AI in demo mode.** `POST /api/ai/shape` runs the create pipeline (question shaper → bias checker → rules engine) and streams each stage; `POST /api/ai/gamify` runs the gamifier and then the Player's schema check. `POST /api/ai/themes` masks personal data, runs the theme extractor, then checks every quote is an exact substring of its response. `POST /api/ai/dashboard`, `/api/ai/ask` and `/api/ai/report` follow the same pattern: the AI stage writes words and specs, code computes every number and checks the AI's output against it. The AI stages are built-in stand-ins in `src/lib/ai/demo-*.ts` that return the exact `combined.system.txt` JSON schemas; the rules engine (`src/lib/ai/rules-engine.ts`) and every check in code are real. Connecting Claude replaces the demo files, not their callers.

**Accounts are a prototype too:** sign-up stores a salted PBKDF2 hash (never the password) in this browser, and the Studio stays usable as a guest ("Demo creator"). The Studio keeps sample surveys in your browser until the backend exists. Surveys you publish, and the answers they collect, are stored in the same browser, so their `/s/:slug` link opens only there for now. Preview Home's states with `/app?preview=loading|empty|error`; "Demo only: restore the sample surveys" is in Settings.

**Two Studios for now.** `/app` is the Studio described above (demo AI stand-ins, browser storage). `/studio` is Story Mode (below). They share the landing page, the design tokens, the 7 Player mechanics and the `/s/:slug` route: built-in samples and surveys published from `/app` in this browser open there first, and any other slug goes to the Story Mode Player.

## Story Mode setup

```bash
npm test
node scripts/seed-prepared.mjs http://localhost:3000
```

`npm test` runs the unit tests (Vitest). The seed script publishes the three demo surveys on a running app and prints their links.

Environment variables (set by the team, never committed):

| Variable | What |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio key. Without it, the three prepared examples still work |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | The team's Supabase project. Without them, data goes to `.data/store.json` |
| `NEXT_PUBLIC_SITE_URL` | Public site URL, used in links the API returns |

Run `supabase/migrations/0001_story_mode.sql` on the Supabase project once before the first deploy. On Vercel, the local file store does not persist, so Supabase is required there.
