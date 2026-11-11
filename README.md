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
- [ ] Next: to be decided by the team
