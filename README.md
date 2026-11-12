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

## Build progress

Following `UI_UX_LAYOUT.md`, one page at a time:

- [x] M1 Landing page (`/`), with sample data
- [x] Story Mode demo release: Studio (`/studio`) and Player (`/s/:slug`)

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
