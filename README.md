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
| `src/components/player/` | Survey Player mechanics, shared by the landing poll and (next) the Player |
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
- [ ] Next: Ask your data and the insight report (rest of build step 13)

**AI in demo mode.** `POST /api/ai/shape` runs the create pipeline (question shaper → bias checker → rules engine) and streams each stage; `POST /api/ai/gamify` runs the gamifier and then the Player's schema check. `POST /api/ai/themes` masks personal data, runs the theme extractor, then checks every quote is an exact substring of its response. The AI stages are built-in stand-ins in `src/lib/ai/demo-*.ts` that return the exact `combined.system.txt` JSON schemas; the rules engine (`src/lib/ai/rules-engine.ts`) and every check in code are real. Connecting Claude replaces the demo files, not their callers.

**Accounts are a prototype too:** sign-up stores a salted PBKDF2 hash (never the password) in this browser, and the Studio stays usable as a guest ("Demo creator"). The Studio keeps sample surveys in your browser until the backend exists. Surveys you publish, and the answers they collect, are stored in the same browser, so their `/s/:slug` link opens only there for now. Preview Home's states with `/app?preview=loading|empty|error`; "Demo only: restore the sample surveys" is in Settings.
