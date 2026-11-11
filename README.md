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

## Build progress

Following `UI_UX_LAYOUT.md`, one page at a time:

- [x] M1 Landing page (`/`), with sample data
- [ ] Next: to be decided by the team
