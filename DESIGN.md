# PlaySurvey: DESIGN.md

> **For the AI coding agent (Antigravity) and anyone building PlaySurvey.**
> This file explains **how PlaySurvey looks and behaves**: tokens, type, components, states, motion and rules.
> Its partner file, `PlaySurvey_UI_UX_LAYOUT.md`, explains **what goes on each page**.
> Read both before writing any UI code. When the two disagree, this file wins on visual details, and the layout file wins on page structure.

**Version:** 1.0 (11 Nov 2026)
**Sources:**
- PlaySurvey Design System v0.3
- PRD (Activities 1–4)
- `survey-platform-architecture.mmd`
- the AI engine system prompt `combined.system.txt`
- reference websites (see 1.1)

**Owner:** Team 3, PD3.401 AI for Product Managers, IIIT Hyderabad

---

## 0. Rules the agent must never break

Read these first. If a design idea conflicts with any line below, the line wins.

1. **Use tokens, never raw values.** Every colour, size, radius, shadow and duration comes from section 3. No hex codes or pixel values in components.
2. **Numbers come from code, words come from AI.** Never show a number the LLM produced. Every statistic on screen comes from the compute engine and wears a **Computed** badge. Every AI-written sentence wears an **AI** badge.
3. **AI suggests, the user decides.** AI output appears as a *suggestion* (draft state) until the user taps **Accept**. Nothing the user typed is changed or removed silently.
4. **The survey Player never shows:** points, scores, badges, streaks, leaderboards, prizes, avatars or characters, countdown timers, sliders, or anything locked behind answering.
5. **The Player uses only these 7 mechanics:**
   - `tap_chips_single`
   - `tap_chips_multi`
   - `this_or_that`
   - `segmented_scale`
   - `emoji_scale`
   - `number_row_11`
   - `text_box`

   The wording, options and scale points never change between the creator's question and what the respondent sees.
6. **Charts:** only bar, grouped bar, 100% stacked bar, diverging Likert, histogram, line (5+ periods), KPI tile and table. **No pie or donut charts.** Every grouped chart shows `n` per group, and groups under 10 get a "Small group" flag.
7. **The aggregate reveal** appears only after the respondent submits, only once there are **20+ responses**, and only for up to 3 closed, non-sensitive questions.
8. **Personal data** is minimal and optional, and it's always tied to a purpose line. The purpose and consent block can't be deleted.
9. **Empty AI fields hide their UI slot completely.** No "No notes" text and no empty cards.
10. **Accessibility:**
    - WCAG 2.1 AA contrast
    - visible focus
    - full keyboard use
    - touch targets of 48px in the Player and 44px in Studio
    - `prefers-reduced-motion` respected everywhere
11. **No mascot or character** anywhere in the product.

---

## 1. The feel in one paragraph

PlaySurvey should feel like **a warm morning, not a spreadsheet**. Creators work in a calm, cream-coloured Studio where colour only shows up when it means something: an AI suggestion, a computed number, a warning, an approval. Respondents get a playful, thumb-friendly Player with big tiles and soft "clay" depth that makes tapping feel satisfying. The marketing site and empty screens open up into a soft sky with floating survey pieces. Three surfaces, one family: same tokens, same type, different volume.

| Surface | Who | Volume | Signature |
|---|---|---|---|
| **Marketing** (landing, auth) | Visitors | Loud | Morning-sky gradient, drifting clouds, floating clay survey pieces, a live playable poll |
| **Studio** (create, analyse) | Creators, analysts | Quiet | Cream canvas, sand surfaces, provenance badges, before/after diffs, the step rail |
| **Player** (fill a survey) | Respondents | Playful | Big clay tiles, the answer pop, progress + remaining pill, themeable by the creator |


### 1.1 Reference websites (for feel only)

We studied two websites while shaping PlaySurvey. Use them to understand the **feel** we're after. **Never copy** their text, images, illustrations, logos, fonts, colours or exact layouts. Everything we build uses PlaySurvey's own tokens and content.

| Website | What we learned from it | Where it shows up in PlaySurvey | Don't copy |
|---|---|---|---|
| **Responsly**: https://www.responsly.com/ | - Survey screens themed through a few variables, with the rest derived<br>- One question per screen, sticky bottom nav, thin progress bar<br>- Marketing site and survey UI kept separate<br>- Clear nav: Platform · Solutions · Pricing · Resources | Player theming [3.6], Player shell [7.1], marketing nav | Neon-green palette, Proxima Nova font, enterprise tone, their copy and screenshots |
| **Genie Studio**: https://geniestudio.app/ | - Airy, light sky background<br>- Playful objects floating around a centred hero<br>- One headline word that keeps changing, with small icons inline in the headline<br>- Sections that build up as you scroll<br>- Small working demos instead of static screenshots<br>- A short ending: quotes, FAQ, one big call to action | Landing page [9], morning-sky tokens [3.7], clay objects [4] | Their mascot (we have none), their 3D objects and illustrations, copy, exact layout. Also avoid their pinned scroll sections that show blank while animating: our content is always visible first |
| **Our earlier gamified survey video** (team's own work) | The level of polish and enjoyment a finished survey should have: tactile answers, short human copy, clear effort and trust | **Quality bar only** [7.5]. Not a style, theme or page | Its story format, scenes, characters and campus content |

**Our own references** (private prototypes; share them with your team before giving the links to the agent):

- PlaySurvey landing page prototype: https://claude.ai/artifact/CMJ8eDfLDoGbh1JZaMtN1j
- Responsly design study: `responsly-design-system.md` (measured from their live site, for research only)

---

## 2. Design principles → visual rules

| Principle (PRD) | What it looks like |
|---|---|
| Every question earns its place | One idea per screen. The question counter and time estimate are always visible (Studio rules meter, Player remaining pill). |
| Joy in the format, never in the incentives | Joy comes from motion, shape and colour: answer pop, clay tiles, milestone lines. Never from rewards. |
| AI suggests, the user decides | Dashed borders = draft (AI proposal). Solid borders = accepted. The **You approved** purple badge marks human decisions. |
| Numbers from code, words from AI | Teal **Computed** badge on every number. Blue **AI** badge on every AI sentence. Never on the same element. |
| Ask only what you need | Personal-data fields carry a **Personal data** chip and a purpose line. The consent block is locked. |

---

## 3. Design tokens

All tokens are CSS custom properties with the `--ps-` prefix. A Tailwind mapping is in 3.10.

### 3.1 Colour: brand

| Token | Hex | Use | Notes |
|---|---|---|---|
| `--ps-persimmon-50` | `#FFF1EC` | Selected answer fill, user chat bubble | |
| `--ps-persimmon-100` | `#FFDFD3` | Hover fill, focus ring halo | |
| `--ps-persimmon-400` | `#F0643C` | Progress fill, illustrations, chart series 1 | **Not for text** (3.2:1) |
| `--ps-persimmon-600` | `#C4461B` | **Primary button**, selected border | White text 4.95:1 |
| `--ps-persimmon-700` | `#A93A14` | Primary hover, links, focus outline | 6.4:1 on white |
| `--ps-marigold-100` | `#FFF3D1` | Reveal card, remaining pill, celebration | |
| `--ps-marigold-400` | `#FFC233` | Highlights, Night-theme button | Ink text 10.4:1 |

### 3.2 Colour: neutrals (warm)

| Token | Hex | Use |
|---|---|---|
| `--ps-cream-50` | `#FFFBF5` | App and page background |
| `--ps-white` | `#FFFFFF` | Cards, inputs, modals |
| `--ps-sand-100` | `#F6EFE4` | Sidebar, table header, quote blocks, section bands |
| `--ps-sand-200` | `#ECE2D3` | Card borders, dividers |
| `--ps-sand-300` | `#D9CBB6` | Input borders, draft (dashed) borders |
| `--ps-ink-500` | `#6E6479` | Muted text, captions (5.4:1 on cream) |
| `--ps-ink-700` | `#4A4057` | Body text in long passages |
| `--ps-ink-900` | `#22192E` | Headings, primary text (16.3:1) |

### 3.3 Colour: semantic

| Meaning | Text token | Background token | Use |
|---|---|---|---|
| Success | `--ps-success` `#17744A` | `--ps-success-bg` `#E6F6EE` | Published, saved, check passed, "Clear" tick |
| Warning | `--ps-warning` `#8A5300` | `--ps-warning-bg` `#FFF4DB` | Rule hits, small groups, major bias flags, placeholders |
| Danger | `--ps-danger` `#B0243F` | `--ps-danger-bg` `#FDECEF` | Errors, critical bias, flagged responses, blocked publish |
| Info | `--ps-info` `#3046B8` | `--ps-info-bg` `#EAF0FF` | Neutral tips, clarification banner |

### 3.4 Colour: provenance (PlaySurvey's signature)

| Badge | Text | Background | Icon (Phosphor) | Means |
|---|---|---|---|---|
| **AI** | `--ps-ai` `#3046B8` | `--ps-ai-bg` `#EAF0FF` | `Sparkle` | Words written by the model |
| **Computed** | `--ps-computed` `#0B6B66` | `--ps-computed-bg` `#E0F5F3` | `Calculator` | Any number from the compute engine |
| **You approved** | `--ps-human` `#6A3FC4` | `--ps-human-bg` `#F1EBFF` | `CheckCircle` | A human accepted it |
| **Rule** | warning | warning-bg | `Ruler` | A rules-engine limit or check |

### 3.5 Colour: data visualisation

| Use | Tokens |
|---|---|
| Categorical (in order) | `--ps-viz-1` `#F0643C` · `--ps-viz-2` `#14A39A` · `--ps-viz-3` `#4C6EF5` · `--ps-viz-4` `#F2A900` · `--ps-viz-5` `#A855C7` · `--ps-viz-6` `#6B7A90` |
| Single measure | `--ps-viz-2` teal, with a 30% tint for context bars |
| Sequential scale | persimmon ramp: `#FFDFD3` → `#F7A486` → `#F0643C` → `#C4461B` → `#8E2F10` |
| Diverging Likert | `#7E3A99` · `#C59AD8` · `#E3D8C8` (neutral) · `#7FCFC7` · `#0F7F7A` |
| Sentiment | positive `#0B6B66` · negative `#7E3A99` · neutral `--ps-ink-500` · mixed `#8A5300`. Always with a text label |
| Small-group bar | the series colour + a 45° hatch overlay (`rgba(255,255,255,.55)` 4px stripes) |
| Confidence interval | 1.5px `--ps-ink-500` whisker with 4px caps |

**Never red-to-green.** Never colour alone; always direct labels or a legend with values.

### 3.6 Colour: Player themes (creator picks one)

| Theme | `--theme-bg` | `--theme-text` | `--theme-button` | `--theme-button-text` | `--theme-accent` |
|---|---|---|---|---|---|
| **Marigold** (default) | `#FFFBF5` | `#22192E` | `#C4461B` | `#FFFFFF` | `#F0643C` |
| **Lagoon** | `#EFFAF8` | `#22192E` | `#0B7A73` | `#FFFFFF` | `#14A39A` |
| **Night** | `#1C1726` | `#F4EEFF` | `#FFC233` | `#22192E` | `#FFC233` |
| **Custom** | creator | auto (contrast-checked) | creator | auto | creator |

A custom theme is contrast-checked in code. Below 4.5:1, Studio suggests the nearest passing shade of the creator's colour.

### 3.7 Colour: morning sky (marketing and empty states only)

| Token | Value |
|---|---|
| `--ps-sky-top` | `#E7F1FF` |
| `--ps-sky-glow` | `#FFE9DF` |
| `--ps-sky-accent` | `#7FB2F0` (objects and clouds only, never buttons) |
| Sky gradient | `linear-gradient(180deg, #E7F1FF 0%, #F2F6FF 30%, #FFFBF5 68%, #FFE9DF 100%)` |
| Cloud | white at 90%, `filter: blur(3px)`, drifts 70–110s per loop |

### 3.8 Typography

| Role | Family | Weights | Token |
|---|---|---|---|
| Display / headings | **Plus Jakarta Sans** (Google Fonts) | 600, 700, 800 | `--ps-font-display` |
| Body / UI | **Figtree** (Google Fonts) | 400, 500, 600, 700 | `--ps-font-body` |
| IDs, code, queries | **JetBrains Mono** (Google Fonts) | 400, 500 | `--ps-font-mono` |
| Indian languages (later) | Noto Sans Devanagari / Telugu / Tamil | 400, 600 | in the body fallback stack |

```css
--ps-font-display: "Plus Jakarta Sans", "Figtree", system-ui, sans-serif;
--ps-font-body:    "Figtree", system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Devanagari", sans-serif;
--ps-font-mono:    "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
```

**Type scale**

| Token | Size / line-height | Weight | Font | Letter-spacing | Use |
|---|---|---|---|---|---|
| `hero` | clamp(40px, 6.6vw, 80px) / 1.04 | 700 | Display | -0.04em | Landing hero only |
| `display` | 48 / 52 | 700 | Display | -0.03em | Section titles (marketing), big empty states |
| `h1` | 32 / 38 | 700 | Display | -0.015em | Page titles in Studio |
| `h2` | 24 / 30 | 700 | Display | -0.01em | Section titles in Studio |
| `h3` | 18 / 24 | 600 | Body | 0 | Card titles, question text in the builder |
| `body-lg` | 18 / 28 | 400 | Body | 0 | Marketing paragraphs, report text |
| `body` | 16 / 24 | 400 | Body | 0 | Default |
| `body-sm` | 14 / 20 | 400 | Body | 0 | Helper text, reasons, table cells |
| `caption` | 12 / 16 | 600, UPPERCASE | Body | +0.06em | Labels, badges, table headers |
| `kpi` | 40 / 44 | 700, tabular | Body | -0.01em | Big numbers |
| `mono` | 12 / 18 | 400 | Mono | 0 | Response IDs (`R-0412`), queries |

**Player scale** (bigger, for thumbs)

| Token | Mobile | ≥768px | Weight |
|---|---|---|---|
| `p-welcome` | 30/36 | 40/46 | 800 Display |
| `p-question` | 22/30 | 28/36 | 700 Display |
| `p-option` | 18/24 | 18/24 | 500 Body |
| `p-helper` | 16/24 | 18/26 | 400 Body |
| `p-microcopy` | 15/22 | 16/24 | 500 Body |

Rules:

- Headings get `text-wrap: balance`.
- Numbers in tables, KPIs and charts use `font-variant-numeric: tabular-nums`.
- Question text never goes below 20px on phones.
- Running text stays at most about 68 characters wide.

### 3.9 Space, radius, elevation, motion

**Spacing (4px base):** `--ps-space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `12` 48 · `16` 64 · `20` 80 · `24` 96 · `32` 128

**Radius**

| Token | Value | Use |
|---|---|---|
| `--ps-r-sm` | 8px | Badges, chips (square), small inputs |
| `--ps-r-md` | 12px | Inputs, Studio buttons, table container |
| `--ps-r-lg` | 16px | Cards, answer tiles |
| `--ps-r-xl` | 24px | Modals, drawers, reveal card, poll card |
| `--ps-r-2xl` | 32px | Phone frames, hero cards |
| `--ps-r-pill` | 999px | Player buttons, progress bars, pills |

**Elevation** (warm-tinted shadows)

| Token | Value | Use |
|---|---|---|
| `--ps-shadow-1` | `0 1px 2px rgba(34,25,46,.06)` | Inputs, chips |
| `--ps-shadow-2` | `0 4px 12px rgba(34,25,46,.08)` | Hovered cards, dropdowns |
| `--ps-shadow-3` | `0 16px 40px rgba(34,25,46,.14)` | Modals, drawers, floating cards |
| `--ps-clay-inner` | `inset 0 -7px 14px rgba(34,25,46,.12)` | Clay objects, Player tiles (Light/Medium) |
| `--ps-clay-drop` | `0 18px 30px -12px rgba(34,25,46,.28)` | Floating clay objects |
| `--ps-clay-highlight` | `radial-gradient(circle at 30% 22%, rgba(255,255,255,.75), rgba(255,255,255,0) 55%)` | Layered as a background image on clay |

In Studio, prefer borders (`sand-200`) to shadows. Shadows are for things that float.

**Motion**

| Token | Value | Use |
|---|---|---|
| `--ps-dur-fast` | 120ms | Hover, press |
| `--ps-dur-base` | 200ms | Toggles, selection fill |
| `--ps-dur-slide` | 280ms | Question-to-question, tab change |
| `--ps-dur-reveal` | 400ms | Scroll reveals, card flip |
| `--ps-dur-count` | 800ms | Count-ups of Computed numbers |
| `--ps-ease-out` | `cubic-bezier(.2,.8,.2,1)` | Default |
| `--ps-ease-bounce` | `cubic-bezier(.34,1.56,.64,1)` | Answer pop (Player only) |

**Reduced motion:** all transitions become fades of 120ms or less. Floating objects stop, count-ups show the final value, and card flips become fades.

### 3.10 Token file (`tokens.css`) and Tailwind mapping

```css
:root {
  --ps-persimmon-50:#FFF1EC; --ps-persimmon-100:#FFDFD3; --ps-persimmon-400:#F0643C;
  --ps-persimmon-600:#C4461B; --ps-persimmon-700:#A93A14;
  --ps-marigold-100:#FFF3D1; --ps-marigold-400:#FFC233;
  --ps-cream-50:#FFFBF5; --ps-white:#FFFFFF; --ps-sand-100:#F6EFE4; --ps-sand-200:#ECE2D3; --ps-sand-300:#D9CBB6;
  --ps-ink-500:#6E6479; --ps-ink-700:#4A4057; --ps-ink-900:#22192E;
  --ps-success:#17744A; --ps-success-bg:#E6F6EE; --ps-warning:#8A5300; --ps-warning-bg:#FFF4DB;
  --ps-danger:#B0243F; --ps-danger-bg:#FDECEF; --ps-info:#3046B8; --ps-info-bg:#EAF0FF;
  --ps-ai:#3046B8; --ps-ai-bg:#EAF0FF; --ps-computed:#0B6B66; --ps-computed-bg:#E0F5F3;
  --ps-human:#6A3FC4; --ps-human-bg:#F1EBFF;
  --ps-viz-1:#F0643C; --ps-viz-2:#14A39A; --ps-viz-3:#4C6EF5; --ps-viz-4:#F2A900; --ps-viz-5:#A855C7; --ps-viz-6:#6B7A90;
  --ps-sky-top:#E7F1FF; --ps-sky-glow:#FFE9DF; --ps-sky-accent:#7FB2F0;
  --ps-font-display:"Plus Jakarta Sans","Figtree",system-ui,sans-serif;
  --ps-font-body:"Figtree",system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Sans Devanagari",sans-serif;
  --ps-font-mono:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;
  --ps-r-sm:8px; --ps-r-md:12px; --ps-r-lg:16px; --ps-r-xl:24px; --ps-r-2xl:32px; --ps-r-pill:999px;
  --ps-shadow-1:0 1px 2px rgba(34,25,46,.06); --ps-shadow-2:0 4px 12px rgba(34,25,46,.08); --ps-shadow-3:0 16px 40px rgba(34,25,46,.14);
  --ps-clay-inner:inset 0 -7px 14px rgba(34,25,46,.12); --ps-clay-drop:0 18px 30px -12px rgba(34,25,46,.28);
  --ps-dur-fast:120ms; --ps-dur-base:200ms; --ps-dur-slide:280ms; --ps-dur-reveal:400ms; --ps-dur-count:800ms;
  --ps-ease-out:cubic-bezier(.2,.8,.2,1); --ps-ease-bounce:cubic-bezier(.34,1.56,.64,1);
}
```

```js
// tailwind.config.js (theme.extend). Components use these names, never raw hex.
colors: {
  persimmon: { 50:'var(--ps-persimmon-50)',100:'var(--ps-persimmon-100)',400:'var(--ps-persimmon-400)',600:'var(--ps-persimmon-600)',700:'var(--ps-persimmon-700)' },
  marigold:  { 100:'var(--ps-marigold-100)',400:'var(--ps-marigold-400)' },
  cream: 'var(--ps-cream-50)', sand: { 100:'var(--ps-sand-100)',200:'var(--ps-sand-200)',300:'var(--ps-sand-300)' },
  ink: { 500:'var(--ps-ink-500)',700:'var(--ps-ink-700)',900:'var(--ps-ink-900)' },
  success:{DEFAULT:'var(--ps-success)',bg:'var(--ps-success-bg)'}, warning:{DEFAULT:'var(--ps-warning)',bg:'var(--ps-warning-bg)'},
  danger:{DEFAULT:'var(--ps-danger)',bg:'var(--ps-danger-bg)'}, info:{DEFAULT:'var(--ps-info)',bg:'var(--ps-info-bg)'},
  ai:{DEFAULT:'var(--ps-ai)',bg:'var(--ps-ai-bg)'}, computed:{DEFAULT:'var(--ps-computed)',bg:'var(--ps-computed-bg)'},
  human:{DEFAULT:'var(--ps-human)',bg:'var(--ps-human-bg)'},
},
fontFamily: { display:'var(--ps-font-display)', body:'var(--ps-font-body)', mono:'var(--ps-font-mono)' },
borderRadius: { sm:'var(--ps-r-sm)', md:'var(--ps-r-md)', lg:'var(--ps-r-lg)', xl:'var(--ps-r-xl)', '2xl':'var(--ps-r-2xl)', pill:'var(--ps-r-pill)' },
boxShadow: { 1:'var(--ps-shadow-1)', 2:'var(--ps-shadow-2)', 3:'var(--ps-shadow-3)', clay:'var(--ps-clay-inner), var(--ps-clay-drop)' },
```

### 3.11 Breakpoints and grid

| Name | Min width | Grid | Gutter | Side padding |
|---|---|---|---|---|
| `xs` | 0 (design at 360) | 4 col | 16px | 16px |
| `sm` | 480 | 4 col | 16px | 20px |
| `md` | 768 | 8 col | 20px | 24px |
| `lg` | 1024 | 12 col | 24px | 32px |
| `xl` | 1280 | 12 col | 24px | 40px |

- **Max content widths:**
  - marketing: 1160px
  - Studio pages: 1200px
  - text-heavy pages (report): 720px
  - Player: 560px, always centred
- **Side padding** always includes safe-area insets: `padding-left: max(16px, env(safe-area-inset-left))`.


### 3.12 Website look: "Professional play"

The website (landing, pricing, auth) should feel **professional first, playful second**: clean white space, calm type and one dark call-to-action, with the playfulness coming from the floating glossy survey pieces and the live poll. Studio and the Player keep their own looks (sections 6–7).

| Token | Value | Use |
|---|---|---|
| `--ps-web-bg` | `#FFFFFF` | Page background (instead of cream on the website) |
| `--ps-mist` | `#F6F8FC` | Alternate section bands (instead of sand) |
| `--ps-line` | `#E9EDF3` | Card borders, dividers, pill outlines |
| `--ps-web-sky` | `linear-gradient(180deg, #E8F1FF 0%, #F3F7FF 38%, #FFFFFF 78%, #FFF4EE 100%)` | Hero and final call-to-action band |
| `--ps-web-card-shadow` | `0 1px 2px rgba(34,25,46,.04), 0 12px 32px -20px rgba(34,25,46,.18)` | Website cards |
| `--ps-web-float-shadow` | `0 40px 80px -40px rgba(60,80,130,.45)` | The live poll card |
| Pastel object colours | sky `#9CC3F5` · peach `#FFD9C8` · mint `#C9F1E8` · lilac `#E6DEFF` · butter `#FFEDB8` | Floating survey pieces only |
| Glossy clay | top highlight `radial-gradient(circle at 30% 18%, rgba(255,255,255,.95), transparent 50%)` + `inset 0 2px 0 rgba(255,255,255,.8)` + cool drop shadow `0 24px 40px -18px rgba(60,80,130,.35)` | Floating survey pieces |

**Rules:**

- **Buttons:**
  - **One dark pill** (`marketing` button) per section.
  - Persimmon is for highlights only on the website: the rotating headline word, selected answers in the live poll.
  - The poll keeps its Player buttons.
- **Headlines:** Plus Jakarta Sans 700 with tight tracking (-0.035 to -0.04em). Paragraphs in `ink-500`, 17–19px.
- **Eyebrow labels** are small outlined pills (white background, `--ps-line` border, `caption` text in `ink-700`).
- **Cards:** 24px radius, `--ps-line` border, `--ps-web-card-shadow`.
- **Spacing:** generous: section padding 96–128px on desktop, and headline-to-content gap 40px.
- **Floating survey pieces:** at most 8 in the hero, each in a pastel colour with glossy clay. **No mascot or character.**

---

## 4. Iconography and illustration

- **Icons:** [Phosphor Icons](https://phosphoricons.com) (MIT licence). Regular weight in Studio, Duotone in the Player at the Light and Medium playful levels. Sizes: 16, 20, 24. Icon colour follows the text colour unless it's a provenance icon.
- **Clay survey objects** (marketing and empty states only):
  - star-rating chip
  - smiley tile
  - this-or-that card pair
  - ticked checkbox
  - 0–10 number row
  - mini bar chart
  - quote bubble
  - progress pill

  Built from HTML/CSS plus SVG, using `--ps-clay-highlight`, `--ps-clay-inner` and `--ps-clay-drop`.
- **Never** put illustrations inside questions. They can bias answers.
- **Emoji:**
  - inside `emoji_scale` (satisfaction or feelings questions only), always with a text label
  - as decoration in AI copy: at most one per line, never meaningful on its own

---

## 5. Core components (shared)

Each component lists its variants, sizes, states and accessibility. "Studio" and "Player" note where behaviour differs.

### 5.1 Button

| Variant | Style | Use |
|---|---|---|
| `primary` | bg `persimmon-600`, text white, weight 600. Hover `persimmon-700` + translateY(-1px) | One per view: Publish, Accept all, Next |
| `secondary` | bg white, 1.5px `ink-900` border, ink text. Hover bg `sand-100` | Preview, Edit, Back |
| `ghost` | transparent, `persimmon-700` text. Hover underline | Inline: "See reason", "Show query" |
| `danger` | bg `danger`, white text | Delete survey, erase responses |
| `ai` | bg `ai-bg`, text `ai`, Sparkle icon | "Suggest questions", "Build with AI" |
| `marketing` | bg `ink-900`, white text, `r-pill`, soft dark shadow. Hover `#3A3046` + lift 2px | Main call to action on the website only ("Create a survey, free") |
| `marketing-secondary` | white bg, 1px `--ps-line` border, ink text, `r-pill`. Hover `--ps-mist` | Second action on the website |

| Size | Height | Padding-x | Font | Radius |
|---|---|---|---|---|
| S | 36px | 14px | 14/600 | `r-md` (Studio) |
| M | 44px | 18px | 15/600 | `r-md` |
| L | 52px | 24px | 16/700 | `r-pill` (Player and marketing) |

States:

| State | Look |
|---|---|
| Default | As above |
| Hover | As above, 120ms |
| Active | scale(.98) |
| Focus | 3px `persimmon-100` halo + 1px `persimmon-700` outline |
| Disabled | bg `sand-300`, text `ink-500`, no hover, `aria-disabled` |
| Loading | label kept, small spinner on the left, width locked, `aria-busy` |

The Player always uses size L, full width on mobile.

### 5.2 Input, textarea, select

- **Base:** white, 1px `sand-300` border, `r-md`, 44px tall (textarea 96px min), 16px text (prevents iOS zoom), 12px × 14px padding.
- **Label:** above, `body-sm` 600. Helper text below, `body-sm` in `ink-500`.

| State | Look |
|---|---|
| Hover | border `ink-500` |
| Focus | border `persimmon-600` + focus halo |
| Error | border `danger` + helper text in danger with a WarningCircle icon. Never colour alone |
| Disabled | bg `sand-100` |

- **Character count** (when limited): right-aligned in the helper row, turns warning at 90%.

### 5.3 Badge and chip

- **Badge:** `caption` style, `r-sm`, 3px × 8px padding, optional 12px icon.
  - Provenance: AI / Computed / You approved / Rule
  - Status: Draft / Live / Closed
  - Count
  - Sample data: dashed border, used in prototypes only
- **Chip (filter or tag):** 32px tall, `r-pill`, `sand-100` background. When selected, `ink-900` background with white text. Removable chips get a 16px × button.

### 5.4 Card

- **Base:** white, 1px `sand-200` border, `r-lg`, 20px padding (24px at ≥768).
- **Variants:**

  | Variant | Look | Means |
  |---|---|---|
  | `draft` | dashed `sand-300` border | AI proposal |
  | `approved` | solid border + **You approved** badge | Human accepted |
  | `flagged` | 3px left border in warning or danger | Needs attention |
  | `interactive` | hover lifts with `shadow-2` | Clickable |

### 5.5 Tabs and segmented control

- **Tabs** (page sections): 44px tall, `body` 600. Active: `ink-900` text with a 3px `persimmon-600` underline. Inactive: `ink-500`. Uses the `tablist` role, and arrow keys move between tabs.
- **Segmented control** (playful dial, style switcher): `sand-100` track, `r-pill`. The active segment is white with `shadow-1`. Each segment is a `button` with `aria-pressed`.

### 5.6 Modal, drawer, popover, tooltip

| Component | Size | Look | Behaviour |
|---|---|---|---|
| **Modal** | max 560px | `r-xl`, `shadow-3`, scrim `rgba(34,25,46,.4)` | Focus trapped, Esc closes, a close button is always visible, title in `h2` |
| **Drawer** | right side, 440px (full-screen sheet under 768px) | Same look as the modal | Used for "Left out" questions, response details, bias fixes |
| **Popover** | 320px | `r-lg`, `shadow-2` | Arrow points at the trigger. Used for bias flags and the "What belongs here" theme rule |
| **Tooltip** | — | `ink-900` background, white `body-sm` text | Delay 300ms. Never holds the only copy of important info |

### 5.7 Toast

- **Placement:** bottom-centre on mobile, bottom-left on desktop.
- **Look:** max 420px, `r-md`, `ink-900` background with white text.
- **Behaviour:** disappears after 4s, or 6s if it has an action. Destructive actions offer **Undo**. Announced with `role="status"`.

### 5.8 Table

- **Header:** `sand-100` background, `caption` text, sticky.
- **Rows:** 52px tall, 1px `sand-200` dividers, hover `cream-50`.
- **Numbers:** right-aligned, tabular.
- **Row actions:** appear on hover and focus, and are always visible on touch.
- **Under 768px:** turns into stacked cards (label/value pairs).

### 5.9 Empty state

- Centred, max 420px, with a small clay illustration (one object) on a soft sky disc.
- `h2` title, one line of `body`, one primary button.
- Example: "No responses yet." / "Share your link and the first answers will show up here." / **Copy link**

### 5.10 Loading

- **Skeleton:** `sand-100` blocks with a slow shimmer (1.6s). Shapes match the real content.
- **AI working panel** (signature): a card with the AI badge, a progress bar and a step list that ticks as each real pipeline stage finishes, for example:
  1. Reading your brief
  2. Shaping questions
  3. Checking for bias
  4. Applying length and privacy rules

  Steps show only when the backend reports them. **Never fake progress.** `aria-live="polite"`.

### 5.11 Step rail (Studio create flow)

- A horizontal rail of 4 steps: **Questions → Style → Publish → Results**.
- Each step is a 28px clay dot with a label:

  | Step state | Dot |
  |---|---|
  | Done | teal with a tick |
  | Current | persimmon with white ring |
  | Upcoming | sand |

- The connecting line fills with a persimmon gradient as you progress.
- Clicking a done step goes back to it.
- Under 768px it collapses to "Step 2 of 4 · Style".

---

## 6. Studio components (create, gamify, publish)

### 6.1 Start chooser card
- Three cards in a row (stacked on mobile):
  - **Bring your questions** (teal icon)
  - **Describe your research** (persimmon)
  - **Quick prompt** (marigold)
- Each card: 52px clay icon tile, `h2` title, one-line description, and a tiny animated example (typing loop), static when reduced motion is on.
- Hover lifts 4px with a persimmon border.

### 6.2 Question card (builder)

```
┌──────────────────────────────────────────────────────────────┐
│ ⠿  Q3   How often do you visit cafés near campus?      ⋯     │
│         [Single choice] [Behaviour] [Optional]               │
│         ✦ AI  Asked because behaviour comes before opinion.  │
│         Helps decide: Should we open on Sundays?             │
└──────────────────────────────────────────────────────────────┘
```

- **Row 1:** drag handle, number, question text (`h3`), overflow menu (Edit, Duplicate, Delete).
- **Row 2, chips:**
  - type
  - role:

    | Role | Colour |
    |---|---|
    | Behaviour | teal |
    | Attitude | indigo |
    | Intention | marigold |
    | Demographic | slate |
    | Outcome | persimmon |

  - Optional, Sensitive, Personal data
- **Row 3:** reason line (`body-sm`, `ink-500`, AI badge).
- **Row 4:** "Helps decide:" in `caption`. Clicking it filters the list by decision.
- **Placeholders** like `[city]` render as marigold dashed chips inside the text. Publishing is blocked until they're filled.
- **Expanding the card** shows the answer options (as chips or a scale preview) inline.

### 6.3 Change chip + suggestion diff

| `change.action` | Chip | Body |
|---|---|---|
| `new` | AI "New" | Question + reason |
| `kept` | success "Kept as is" | Collapsed. No diff |
| `rewritten` | AI "Reworded" | Before/after diff + why |
| `split` | AI "Split in two" | Original → two new questions |
| `converted` | AI "Format changed" | Old format → new format |
| `flagged_duplicate` | warning "Possible duplicate" | Both side by side, with **Merge** / **Keep both** |

**Diff:**

- Removed words: strikethrough, `ink-500`, `danger-bg` highlight.
- Added words: `ink-900`, `success-bg` highlight.
- Actions: **Accept** (primary S) · **Edit** (secondary S) · **Keep mine** (ghost).

### 6.4 Status banner (shaper `status`)

| Status | Variant | Content |
|---|---|---|
| `needs_clarification` | info | Up to 3 inline question fields + **Update draft**. The draft still shows below |
| `conflict` | warning | Plain explanation, core set, **"Left out" drawer** button, **Confirm** |
| `declined_with_alternative` | danger outline | One-sentence reason + the neutral set + the "report n and wording" note |

### 6.5 Bias flag

- **Chip on the question card.** Severity decides the style:

  | Severity | Chip |
  |---|---|
  | `critical` | danger filled (blocks publish) |
  | `major` | warning |
  | `minor` | info outline |

  The label is the category in plain words (e.g. "Pushes an answer", "Two questions in one"), plus "Not sure" when confidence is low.
- **The exact evidence** is underlined (2px wavy) in the severity colour, inside the text, options or scale.
- **Popover:**
  - explanation
  - fix as a diff (or the split pair)
  - **Apply fix** / **Dismiss** (critical needs a reason)
- **No issues:** clear questions get a small success "Clear" tick.
- **Whole-survey findings** (set-level) show as a banner above the list, with the related questions outlined.

### 6.6 Rules meter (sticky, top of builder)

```
Questions ▮▮▮▮▮▮▮▮▯▯ 8/10   ·   About 2 min  [Computed]   ·   Open questions 1/2 ✓   ·   Consent ✓
```

| Rule | Normal | Warning | Blocked |
|---|---|---|---|
| Question count | 10 segments | 11–15 (warning colour) | 16+ blocks publishing |
| Time | "About 2 min", worked out in code: 10s per closed question, 45s per open one | — | — |
| Open questions | at most 2, last, optional | — | Out of order shows a warning |

Under 768px the meter collapses to "8/10 · 2 min ▾".

### 6.7 Purpose and consent block
- **Look:** locked block at the top of the builder, `sand-100` background, Lock icon.
- **Contents:** the purpose line (always), and the consent line (when any question collects personal data or is sensitive).
- **Editing:** text can be edited, the block can't be deleted.

### 6.8 Assumptions, notes, flags, "Left out" drawer
- **Assumptions:** collapsible list under the AI summary, each line with an **Edit** link. Open by default for a quick prompt.
- **Notes for creator:** a sand tip card with a Lightbulb icon.
- **Flags** (suspicious input): danger chip, "We ignored an instruction inside your pasted text", with **Show me**.
- **"Left out" drawer:** cards for cut questions with their reason and where they could go (Optional section · Later pulse survey · Drop). **Move back in** updates the rules meter.

### 6.9 Style picker, playful dial, theme picker

- **Styles:** four 160×120 thumbnail cards:
  - One per screen (recommended)
  - Pages
  - Chat
  - Classic

  The selected card gets a persimmon border with a check. The AI recommendation gets an AI badge and its reason.
- **Playful dial:** segmented control Off · Light · Medium, with a one-line description under it.
- **Theme:** 3 preset swatches (Marigold, Lagoon, Night) + Custom (colour input + live contrast check). Roundness: Soft / Round / Pill.
- **Live preview:** a phone frame (300×600, `r-2xl`, ink bezel) on the right. It updates within 280ms with a crossfade.

### 6.10 Microcopy editor
- A list of every gamifier copy line, each with an AI badge, an inline edit field and a character/word counter:

  | Line | Word limit |
  |---|---|
  | Lead-in | 12 |
  | Feedback | 5 |
  | Milestone | 12 |

- **Neutrality warning:** if the creator edits feedback so it differs by answer or praises a choice, a warning appears: "Feedback must be the same for every answer."

### 6.11 Publish checklist and share sheet
- **Checklist rows** (tick or cross, with a link to fix):
  - questions within limits
  - placeholders filled
  - no unresolved critical bias
  - consent block present
  - theme contrast passes
- **Publish** (primary L) is disabled until all rows pass.
- **Share sheet after publishing:** big copyable link field, **WhatsApp** button (opens a share URL), QR code card (downloadable PNG) and an embed snippet (collapsed).

---

## 7. Player components (respondent)

### 7.1 Player shell

```
┌─────────────────────────────┐
│ ▬▬▬▬▬▬▬▬▬▭▭▭▭  (progress)    │
│ [5 left · about 1 min]      │
│                             │
│ Quick one about the food.   │  ← lead-in (Light/Medium)
│ How satisfied were you      │
│ with the food?              │  ← p-question
│ [😞][🙁][😐][🙂][😄]          │  ← mechanic
│ Very unhappy    Very happy  │
│ Got it.                     │  ← feedback (Medium only)
│                             │
│ [←]  [        Next        ] │  ← sticky bottom bar
└─────────────────────────────┘
```

- **Layout:**
  - max 560px, centred, 20px side padding, background `--theme-bg`
  - the bottom bar sticks to the bottom with safe-area padding and stays above the mobile keyboard
- **Progress bar:** 4px, `--theme-accent`.
- **Remaining pill:** `marigold-100` (or 20% accent on Night). It updates **once per question** and never ticks.
- **Tap targets:** at least 48 × 48px.
- **Reduced motion:** question transitions are a 280ms slide-left, or a fade with reduced motion.

### 7.2 Mechanics

| Mechanic | Layout | Selected state | Keyboard |
|---|---|---|---|
| `tap_chips_single` | Wrapped pills, or 56px full-width tiles when labels are long | `persimmon-50` fill, 2px `--theme-button` border, check icon | Arrows move, Space/Enter selects, number keys 1–9 |
| `tap_chips_multi` | Wrapped pills with a tick + "Pick up to N" helper | Same + tick | Space toggles. The limit is announced |
| `this_or_that` | Two 50/50 cards with a 54px clay icon tile and a label. Stacked under 400px | Same | Left/Right arrows |
| `segmented_scale` | 5 or 7 joined segments, every point labelled, end labels in words | Sequential tint up to the chosen point is **not** used. Only the chosen segment fills | Arrows |
| `emoji_scale` | Same as segmented, plus a face above each label. **Satisfaction or feelings only** | Same | Arrows |
| `number_row_11` | 0–10 circles (44px). Under 400px, two rows (0–5, 6–10). End labels in words | Same | Arrows, number keys |
| `text_box` | Large input or textarea, always optional, with a visible **Skip** | Focus ring | — |

- **Medium playful level:** a 1 → 1.04 → 1 "pop" (`ease-bounce`, 250ms) on select.
- **Auto-advance:** single-select mechanics may auto-advance after 400ms, but Back is always available.
- **Chat style:** lead-in and question appear as bubbles (left), and the mechanic renders as reply chips (right). There's a typing indicator before each bubble (300ms max).

### 7.3 Welcome, milestone, thank-you, reveal

- **Welcome:**
  - gamifier title (`p-welcome`)
  - purpose line + consent line (shown word for word)
  - "8 questions · about 2 min" pill
  - **Start** button (L)
- **Milestone:** a full-width line between screens, `p-microcopy`, at most one emoji.
- **Thank-you:**
  - `thank_you` text
  - the enjoyment prompt with 5 labelled faces (one tap, optional)
  - optional link to the creator's site
  - "Made with PlaySurvey" link (12px, `ink-500`)
- **Reveal card** (after submitting, 20+ responses):
  - `r-xl`, `marigold-100` gradient
  - intro copy with `{{respondent_count}}` filled in by code
  - up to 3 questions as horizontal bars with Computed percentages, the respondent's own choice marked with a **You** tag
  - one celebration burst (persimmon/marigold/teal/sky squares, 1s, once)
- **Teaser:** under 20 responses, the teaser copy shows instead of the reveal.

### 7.4 Player system states
- **Survey closed:** friendly full screen ("This survey has closed. Thanks for stopping by.") with a link to PlaySurvey.
- **Not found:** the same pattern.
- **Already answered:** "You've already answered this one. Thanks!" Shows the reveal if eligible.
- **Bot check:** an invisible check. If needed, a simple fallback screen with one button.
- **Offline:** answers are kept locally, with the banner "You're offline. We'll send your answers when you're back."

### 7.5 Quality bar for client surveys

**Reference:** our earlier gamified survey video. It's a benchmark for **how polished and enjoyable** a PlaySurvey survey should feel. It is **not** a style, a theme or a page to copy. Every survey PlaySurvey produces for a client should meet the same bar:

| Quality | What it means in our Player |
|---|---|
| **Feels made, not generated** | Consistent type, spacing and colour from the theme. No default browser controls, no clutter |
| **Tactile answers** | Big tap targets with a clear pressed and selected state (see 7.2). Tapping should feel satisfying |
| **One thing at a time** | One question per screen in the default style, and the answer is always one tap away |
| **Short, human copy** | Lead-ins and milestones sound like a person, are short, and never push an answer (see 10) |
| **Effort is honest and visible** | People always know how much is left (remaining pill), and the welcome screen states questions and time up front |
| **Trust is said out loud** | Purpose and consent on the welcome screen. Anonymous surveys can say so plainly on the thank-you screen |
| **A small reward at the end** | The thank-you, enjoyment tap and reveal (20+ responses) close the loop |

**Acceptance check for any survey we ship or demo to a client:** would it sit comfortably next to the reference video in polish? If not, fix spacing, copy and states before calling it done.

---

## 8. Analyse components

### 8.1 Sample caveat banner
- Info banner at the top of every results page: "Based on **371** responses from people who chose to answer. This isn't a representative sample."
- The number carries a Computed badge.
- It can be collapsed, but never removed.

### 8.2 KPI tile
- **Contents:** `caption` label, `kpi` number, small delta line, and a Computed badge (top right).
- **Tooltip:** "Calculated from 371 responses · How?", where **How?** opens the formula in a popover.
- **Count-up:** 800ms, the first time it's in view only.

### 8.3 Chart card
- **Layout, top to bottom:**
  1. title (descriptive, never a finding)
  2. "Answers:" line
  3. chart
  4. footer: n per group (Computed)
  5. caveat chips
- **Chart styling:**
  - bars use `r-sm` on the value end
  - horizontal bar labels sit on the left
  - values sit at the end of the bar
  - grid lines are 1px `sand-200`
  - axis text is `body-sm` in `ink-500`
- **Small group:** hatched bar + warning chip "Small group (n = 7). Read with care".
- **Caveat chips** (codes from AI, text from code):

  | Code | Chip text |
  |---|---|
  | `ordinal_mean` | Average of a rating scale |
  | `multi_select` | People could pick several |
  | `few_periods` | Only a few time points |
  | `flagged_responses_included` | Includes flagged responses |

- **Draft state:** dashed border, **Accept** / **Remove** in the header.
- **Data table toggle:** every chart has a "View as table" link, for screen readers and exact values.

### 8.4 Theme card
- **Header:** AI badge + theme label (`h3`).
- **"What belongs here" link:** opens a popover with the coding rule.
- **Count and share:** "94 responses · 36%" with a Computed badge. "Tied with …" when code reports a tie.
- **Sentiment split:** a 100% stacked thin bar with labels.
- **Quotes:** 1–3 in `sand-100` blocks with mono response IDs. Masked data like `[phone removed]` shows as a small `sand-200` pill.
- **Footer:** "See all 94" ghost button.
- **Minority mentions** (said by one person) list, with quotes.
- **Possible new themes:** dashed draft cards with **Add as theme** / **Ignore**.

### 8.5 Chat with your data
- **Layout:** chat column max 760px. User bubble right (`persimmon-50`), answer bubble left (white, `sand-200` border).
- **Answer anatomy:**
  1. direct answer with inline Computed number chips (teal background, tabular) and the base ("across 371 responses")
  2. "I read your question as…" (`caption`) + **Ask it differently**
  3. quotes (if any)
  4. caveat chips
  5. **Show how this was calculated** (mono query on `sand-100`)
  6. **Pin to dashboard** (when a chart is suggested)
  7. up to 3 follow-up chips
- **Flagged responses:** "With flagged / Without flagged" two-row comparison.
- **Composer:** sticky bottom, 52px input, send button, 3 starter-question chips when the chat is empty.

### 8.6 Insight report blocks
- **Reader switch:** segmented Creator · Analyst · Leadership.
- **Headline:** `display` text, max 720px.
- **Data quality card:** always first, with Computed numbers.
- **Finding card:**
  - evidence tag:

    | Evidence type | Tag style |
    |---|---|
    | Observed | solid |
    | Linked (association) | outline |
    | Model | dotted |

  - statement with Computed chips
  - "Who it affects"
  - counter-evidence (if any)
  - **Possible reason** callout: italic, `sand-100`, labelled "Not proven", with "How to test"
  - implication
  - confidence meter (3 dots + reason)
  - optional chart
- **Priority table:** frequency · severity · evidence · feasibility as dot ratings.
- **Recommendations board:** three columns, Now / Next / Later, with a metric-to-watch line on each card.
- **Other sections:** limitations and unanswered questions (with a suggested question), each in its own block.
- **Empty sections are hidden.**

### 8.7 Flagged response row
- **Danger chip** with the type:
  - Possible manipulation
  - Personal data
  - Abusive
  - Spam
  - Duplicate
- Plain reason, and **Keep** / **Exclude** buttons. There's never a silent drop. A flag count shows in the page header.

---

## 9. Marketing components

- **Sky band:** the sky gradient + 3–5 drifting clouds (pointer-events none, hidden with reduced motion).
- **Clay objects:**
  - 6–8 per hero, 48–140px, float 8–14s (±14px, ±3° rotation), cursor parallax 0.02–0.06 on fine pointers only
  - 4 are tappable: stars fill, the smiley cycles, the checkbox ticks, the bars regrow
  - under 760px they're 72% size, and only 4 show
- **Rotating headline word:** inline-grid stack (so there's no layout shift), 2.4s swap, marigold highlight bar under it. The `h1` has an `aria-label` with the static sentence.
- **Inline headline chips:** three 0.78em clay circles (tick, star, smile) inside the headline.
- **Live poll card:** a real Player at 380px, `r-2xl` (32px), `shadow-3`. It flips (rotateY 600ms) to the reveal after submitting.
- **Section head:** eyebrow (`caption`, `persimmon-700`), `display` title, `body-lg` intro, max 640px.

---

## 10. Voice and microcopy

| Do | Don't |
|---|---|
| "Let's make this shorter." | "Optimisation recommended." |
| "Suggested by AI" / "Calculated from your data" | "AI found that 42%…" |
| "Halfway there, about {{time_left}} to go." | "Hurry! 10 seconds left!" |
| "Got it." (same for every answer) | "Great choice!" |
| "This survey can't answer that. Try asking it next time." | Guessing an answer |
| "We ignored an instruction inside your pasted text." | Silently dropping it |

- **Buttons:** 1–3 words, verb first. **Helper text:** one line.
- **Indian English defaults:**
  - DD/MM/YYYY dates
  - ₹
  - lakh/crore only when the creator turns them on
  - no idioms, so copy translates cleanly later
- **AI copy limits:**

  | Copy | Max words |
  |---|---|
  | Lead-in | 12 |
  | Feedback | 5 |
  | Milestone | 12 |

  Numbers in copy only through `{{questions_left}}`, `{{time_left}}`, `{{respondent_count}}`.

---

## 11. Accessibility checklist (every page)

- [ ] Text contrast is at least 4.5:1 (3:1 for 24px+ or 18.66px bold). Tokens already pass. Custom themes are checked in code.
- [ ] Focus is visible on every interactive element (halo + outline), and nothing is reachable by mouse only.
- [ ] Touch targets: 48px in the Player, 44px in Studio.
- [ ] Every Player screen announces "Question 3 of 8". Scale tiles read their labels.
- [ ] Charts have a "View as table" alternative.
- [ ] Never colour alone: errors, flags, selection and provenance always have an icon or text.
- [ ] `prefers-reduced-motion` is respected, as described in 3.9.
- [ ] Form fields have labels (no placeholder-only fields). Errors are linked with `aria-describedby`.
- [ ] Modals and drawers trap focus and close with Esc.
- [ ] Live regions (`aria-live="polite"`) for AI progress, toasts and chat answers.
- [ ] `lang="en-IN"` on html. Text can grow to 200% without anything breaking.

---

## 12. Performance budgets

- **Player:** under 150 KB JS+CSS before fonts. Fonts use `font-display: swap`. No video, no WebGL. Works at 360px and inside WhatsApp's in-app browser.
- **Landing:** first screen under 200 KB before fonts. LCP under 2.5s on a mid-range Android over 4G. Clay objects are CSS/SVG, not images.
- **Studio:** skeletons appear within 100ms. AI calls stream their stage progress into the AI working panel.

---

## 13. What changed from Design System v0.3

| Area | Change |
|---|---|
| Tokens | Added `--ps-r-2xl`, `--ps-dur-reveal`, `--ps-dur-count`, the clay tokens, sky tokens and a Tailwind mapping |
| Components | Added: step rail, AI working panel, tabs, modal/drawer/popover/tooltip, table, empty state, skeleton, microcopy editor, publish checklist, share sheet, Player system states |
| Player | `segmented_scale` fills only the chosen point (no "ramp to here"), so a filled ramp can't suggest more is better. Auto-advance standardised at 400ms |
| Studio | Light theme only in v1. The Night theme exists for the Player only |
| Mascot | None. Clay survey objects carry the playful feel |
| Website look | New "Professional play" direction [3.12]: white space, dark pill CTA, glossy pastel survey pieces |
| Display font | Bricolage Grotesque → **Plus Jakarta Sans** (cleaner, more professional) across the product |
| Player | Added a **quality bar** for client surveys [7.5], benchmarked against our gamified survey video |
