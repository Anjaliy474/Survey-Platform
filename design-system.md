    
**Sources measured:**
- Marketing site: `https://www.responsly.com/` (homepage), at a 1440px viewport and a narrow ~536px viewport
- Survey renderer: `https://form.responsly.com/f/XegEZvyk`, a public "Customer Effort Score" template linked from `/templates/t/customer-effort-score/`

**Important notes:**
- Responsly hasn't published an official design system. This is an audit of what ships in production.
- Responsly runs **two separate visual systems**: the **marketing website** (Part A) and the **survey/form UI that respondents see** (Part B). The survey UI is themeable, so its colors depend on the theme each survey's creator picks.
- Brand assets such as the logo, illustrations and copy belong to Responsly. Proxima Nova is a commercial font served through Adobe Fonts (Typekit). Use this document as a study reference only.
- Anything I couldn't verify is listed in **Part C**.

---

## 0. Tech stack (observed)

| Area | Marketing site | Survey renderer |
|---|---|---|
| Framework | Astro (assets served from `/_astro/`) | Separate app (assets served from `/form3000/assets/`) |
| CSS | Tailwind CSS v4 (oklch color variables, `--spacing: .25rem`, utility classes like `rounded-full`, `md:py-20`), plus custom BEM-style classes (`platform-intro__title`, `growth__tip`) | Custom BEM classes prefixed `fp-` (`fp-header`, `fp-nav__button--next`), themed by `--form-*` CSS variables |
| Fonts | Adobe Fonts kit `xfm4lsk` (Proxima Nova), self-hosted Poppins and Inconsolata | Google Fonts: Open Sans (regular, bold, extrabold) |
| Icons | Custom icon font `icon-app`, inline SVGs (74 on the homepage), SVG integration logos | Not inspected |
| Other | KaTeX math fonts are loaded site-wide | Dropdown variables prefixed `--vs-` (vue-select component) |

---

# PART A: Marketing website

## A1. Color

### Declared brand variables (`:root`)

```css
--font-color:            #000000;
--main-green-color:      #84ffb7;   /* also aliased as --color-primary */
--light-green-color:     #dcffeb;
--anchor-blue-color:     #1658ff;   /* also --color-anchor-blue */
--grey-background:       #eef1f6;
--light-grey-background: #f3f5f8;   /* also --color-light-grey */
```

### Colors in use (counted on rendered homepage elements)

**Text colors** (number of text elements):

| Hex | Count | Where it's used |
|---|---|---|
| `#000000` | 154 | Default body text, nav, footer links, H1 |
| `#1a2921` | 30 | Section headings (H2/H3), body copy in content sections |
| `#0f172a` | 24 | Text in product UI mockups and case-study links |
| `#555555` | 15 | Secondary text |
| `#7e8983` | 10 | Muted text |
| `#666666` | 10 | Muted text |
| `#ffffff` | 9 | Text on dark backgrounds and the primary button |
| `#333333` | 9 | Secondary text |
| `#5b6672` | 6 | Muted text |
| `#7f7f7f` | 5 | Eyebrow labels (see A2) |
| `#ff4444` | 4 | Negative / alert values |
| `#84ffb3` | 3 | Text links on dark sections |
| `#1658ff` | 2 | Anchor blue |
| `#05100c` | 1 | Very large display heading |
| `#146e39` | 1 | Dark green accent text |

**Background colors:**

| Hex | Count | Where it's used |
|---|---|---|
| `#ffffff` | 40 | Page, cards, secondary button |
| `#eef1f6` | 9 | Grey sections, testimonial section, tip cards |
| `#000000` | 6 | — |
| `#a2fbe4` | 5 | Active menu item |
| `#c6cfdf` | 5 | — |
| `#84ffb7` | 5 | Brand green |
| `#1a2921` | 4 | Primary button |
| `#92e4c4` | 4 | — |
| `#9fb0c4` | 4 | — |
| `#dee3f1` | 3 | — |
| `#121212` | 1 | Dark "enterprise" section |
| `#17cf6d` | 1 | Green accent |
| `#d2ffe5`, `#67ffa7` | 1 each | Green accents |

**Border colors:** `#dee3f1` (most common, 20), `#dde3ee`, `#c6cfdf`, `#000000` (secondary button), `#ffffff`, and `#67ffa7` (primary button ring).

**Tailwind default palette:** these variables are also present (oklch): red-50/200/600/800, emerald-600, blue-400 to 800, gray-50 to 800, and neutral-50 to 900. `blue-600` (`oklch(54.6% .245 262.881)`) is the color of the "see more customer stories" link.

### Gradients (exact values)

```css
/* Hero announcement pill */
linear-gradient(to right, rgba(221,255,235,.8) 0%, rgba(223,255,203,.8) 50%,
                rgba(122,255,198,.8) 75%, rgba(31,244,251,.8) 100%);

/* Green fills */
linear-gradient(168.17deg, rgb(150,255,194) 8.75%, rgb(22,255,193) 89.25%);
linear-gradient(144deg, rgb(162,251,228), rgb(74,216,180) 95.64%);
linear-gradient(90deg, rgb(219,255,234), rgb(109,255,170));

/* Glow orb */
radial-gradient(circle, rgb(103,255,167), rgb(51,233,188) 45%,
                rgb(92,236,196) 70%, rgba(0,0,0,0) 82%);

/* Athena section background starts with: */
linear-gradient(rgb(238,241,246) 0%, rgba(255,255,255,0) 20%,
                rgba(255,255,255,0) 74%, rgb(255,255,255) 100%),
radial-gradient(58% 30% at 71% 24%, rgba(21,243,255,.41), …);

/* Dashed connector lines */
repeating-linear-gradient(rgb(207,207,207) 0 4px, transparent 4px 8px);
```

**Palette character:** black and a near-black green (`#1a2921`) carry the text. A mint/neon green family (`#84ffb7`, `#67ffa7`, `#a2fbe4`, `#dcffeb`) handles accents and highlights. Cool greys (`#eef1f6`, `#f3f5f8`, `#dee3f1`) provide section backgrounds and borders.

---

## A2. Typography

### Font families

```css
--font-family:             "proxima-nova", "proxima-nova fallback", "Proxima Nova", Helvetica, Arial, sans-serif;
--font-family-alternative: "Poppins", "Poppins override", -apple-system, system-ui, BlinkMacSystemFont, Helvetica, Arial, Segoe UI, Roboto, sans-serif;
--font-family-inconsolata: "Inconsolata", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
```

| Family | Role | Weights loaded | Text elements on homepage |
|---|---|---|---|
| **Proxima Nova** | Primary: body, nav, most headings, buttons | 400, 400 italic, 600, 700, 800, 900 | 283 |
| **Poppins** | Display: hero H1, card titles, the testimonials heading | 400, 500, 700 (self-hosted) | 11 |
| **Inconsolata** | Mono: eyebrow labels, small "case study" links | 400, 700 (self-hosted) | 6 |

Poppins and Inconsolata use metric-matched Arial fallbacks (`size-adjust`, `ascent-override`, etc.) to avoid layout shift while the fonts load.

### Type scale at a 1440px viewport

| Element | Font | Size / line-height | Weight | Letter-spacing | Color |
|---|---|---|---|---|---|
| Hero H1 | Poppins | 89.28px / 91.07px (~1.02) | 900 | -2.68px (-0.03em) | `#000000` |
| Mega display H2 | Proxima Nova | 158.4px / 150.48px, uppercase | 800 | -5.54px (-0.035em) | `#05100c` |
| H2 large | Proxima Nova | 68px / 69.36px | 700 | -2.04px (-0.03em) | `#1a2921` |
| H2 intro | Proxima Nova | 52px / 59.8px | 700 | -1.56px (-0.03em) | `#1a2921` |
| **H2 section (standard)** | Proxima Nova | **44px / 48.4px (1.1)** | 800 | -1.32px (-0.03em) | `#1a2921` |
| H2 testimonials | Poppins | 48px / 48px | 700 | normal | `#000000` |
| H3 on dark section | Proxima Nova | 28px / 35px | 700 | normal | `#ffffff` |
| H3 card title | Poppins | 29px / 30.16px | 600 | normal | `#000000` |
| H3 use-case title | Poppins | 24px / 33px | 600 | normal | `#1a2921` |
| H3 small | Proxima Nova | 18px / 24.3–24.75px | 700 | normal | `#1a2921` |
| Hero subtitle | Proxima Nova | 26px / 33.8px (1.3) | 400 | normal | `#000000` |
| Body (content) | Proxima Nova | 16px / 24.8px (1.55) | 400 | normal | `#1a2921` |
| Body (base) | Proxima Nova | 14px / 21px (1.5) | 400 | normal | `#000000` |
| Top nav item | Proxima Nova | 17px / 23.8px | 600 | normal | `#000000` |
| Footer column title | Proxima Nova | 19px / 28.5px | 700 | normal | `#000000` |
| Footer sub-title | Proxima Nova | 15px / 22.5px | 700 | normal | `#000000` |
| Footer link | Proxima Nova | 16px / 22px | 400 | normal | `#000000` |
| **Eyebrow label** | **Inconsolata** | **14px, uppercase** | **700** | **1.12px (0.08em)** | `#7f7f7f` |

The standard section H2 uses a fluid size: `clamp(1.875rem, 3.5vw, 2.75rem)`, so 30px to 44px, with `leading-[1.1]` and `tracking-[-0.03em]`.

The eyebrow label has a `::before` marker 7px wide in `#7f7f7f`.

### Type scale at a narrow ~536px viewport

H1 52.36px (Poppins 900, -1.57px), section H2 30px / 33px, intro H2 32px / 36.8px, hero subtitle 18px / 24.3px.

### Weights used (count of text elements)

400 (171), 700 (83), 600 (32), 800 (11), 900 (2), 500 (1).

### Tailwind text tokens present

`--text-xs` .75rem through `--text-8xl` 6rem (Tailwind defaults), plus `--tracking-tight: -.025em`, `--tracking-wide: .025em`, `--tracking-widest: .1em`, and `--leading-tight 1.25`, `snug 1.375`, `normal 1.5`, `relaxed 1.625`.

**Pattern:** big headings use heavy weights (700–900), tight negative tracking around -0.03em, and line-height of about 1.0–1.1. Body text stays at 400 weight with line-height 1.5–1.55.

---

## A3. Spacing and layout

- **Base spacing unit:** `--spacing: .25rem` (4px, Tailwind v4).
- **Container max-widths found:** `1200px`, `1260px`, `1280px`, `1290px`. Tailwind container variables run from `--container-sm` (24rem) to `--container-7xl` (80rem).
- **Section padding (desktop):**

| Section | Padding |
|---|---|
| Standard content section | `80px 32px` (`md:py-20 md:px-8`); mobile `py-16 px-5` |
| Platform intro | `0 32px 80px` |
| Athena section | `160px 20px 144px` |
| Growth section | `72px 0 0` |
| Dark enterprise section | `160px 0 176px` |
| Testimonials section | `120px 0` (`md:py-[120px]`, `py-24` on mobile), pulled up with `-mt-[100px]` |
| Footer | `40px 0 150px` |

- **Header:** padding `20px 80px 0` at 1440px. `--header-height` takes the values 85px, 95px and 110px, and `--header-navigation-compact-px` takes 20px, 30px, 50px and 80px, set per breakpoint. I didn't map which value goes with which breakpoint.

---

## A4. Radius

| Value | Count | Used on |
|---|---|---|
| `8px` (`rounded-lg`) | 30 | Mega-menu cards, menu items |
| `12px` (`rounded-xl`) | 22 | Testimonial cards |
| `50%` | 17 | Avatars, dots, circles |
| `999px` / `9999px` / `rounded-full` | 19 | Buttons (pill shape), progress bars |
| `18px` | 5 | Tip cards in the growth section |
| `16px` | 3 | — |
| `11px` | 2 | Hero announcement pill |
| `0 0 50px 50px` | 2 | Bottom corners of the dark and testimonial sections |
| Others (once each) | — | 7px, 10px, 13px, 32px, 40px, 44px, 50px |

Declared tokens: `--radius-md .375rem`, `--radius-lg .5rem`, `--radius-xl .75rem`, `--radius-2xl 1rem`, `--radius-3xl 1.5rem`.

---

## A5. Shadows and borders

```css
/* Testimonial card (most common) */
box-shadow: 0 4px 10px rgba(0,0,0,.04);
/* Small UI chip */
box-shadow: 0 1px 2px rgba(15,23,42,.06);
/* Floating tip card */
box-shadow: 0 16px 34px rgba(15,23,42,.14);
/* Hero pill: inner highlight */
box-shadow: inset 0 1px 0 rgba(255,255,255,.6);
/* Green glow / focus-style rings */
box-shadow: 0 0 6.4px 6px rgba(90,255,183,.25);
box-shadow: 0 0 0 4px rgba(23,207,109,.22);
/* Other */
box-shadow: 0 4px 7px rgba(0,0,0,.1);
```

**Borders:** the source classes are `border` (1px) and `border-2` (2px). They showed up as 0.8px and 1.6px because of display scaling. The most common border is 1px `#DEE3F1`.

---

## A6. Breakpoints

- **Tailwind v4 defaults:** `40rem` (640), `48rem` (768), `64rem` (1024), `80rem` (1280), `96rem` (1536).
- **Custom breakpoints in the CSS:** 400, 420, 560, 586, 600, 658, 720, 750, 760, 768, 800, 900, 990, 1020, 1024, 1085, 1124, 1280, 1320, 1324, 1400, 1440px, and `min-height: 741px`.
- **`1085px`** appears in many nav rules (`max-[1085px]:…`, `not all and (min-width:1085px)`). It's the switch point between the desktop menu and the mobile menu.
- **Other media queries:** `(hover:hover)`, `prefers-reduced-motion: reduce / no-preference`.
- **No `prefers-color-scheme` queries** were found, so there's no dark mode.

---

## A7. Motion

- Default transition: `150ms cubic-bezier(.4, 0, .2, 1)`.
- `--ease-out: cubic-bezier(0, 0, .2, 1)` and `--ease-in-out: cubic-bezier(.4, 0, .2, 1)`.
- Tab/accordion items fade with `opacity .3s cubic-bezier(.4,0,.2,1)`.
- Arrow links: the icon's left margin animates from 8px to 12px on hover (`[&_svg]:ml-2 hover:[&_svg]:ml-3`).
- Reduced-motion media queries are present.

---

## A8. Components

### Primary button ("Get started")

```css
background: #1a2921;
color: #ffffff;
border: 4px solid #67ffa7;      /* neon-green ring */
border-radius: 9999px;          /* pill */
font: 700 18px/28px proxima-nova;
padding: 16px 40px;             /* height 68px */
/* hover: underline (class hover:underline); no color change found */
```

Header size: 16px / 24px text, padding `8px 24px`, height 48px.

### Secondary button ("Book a demo")

```css
background: #ffffff;
color: #000000;
border: 2px solid #000000;
border-radius: 9999px;
font: 700 18px/28px proxima-nova;
padding: 16px 40px;             /* height 65px */
/* hover: underline */
```

Header size: 16px text, padding `8px 20px`, height 43px.

### Text links

- **On dark sections:** `#84ffb3`, 16px, weight 400, underline on hover, with a trailing arrow icon.
- **"See more" link:** Tailwind `blue-600`, 18px, weight 600.
- **Mono link:** Inconsolata 13px, `#0f172a`, ends with "→".
- **Header "Login":** 16px, black, padding `7px 10px`, no background.

### Top navigation

- Items: Proxima Nova 17px / 600, black, padding `7px 15px`, transparent background. Platform, Solutions and Resources open dropdowns; Pricing is a plain link.
- Logo: SVG image, 130×25px.

### Mega-menu

- **Left column items:** 17px, padding `12px 16px`, radius 8px. The active item has background `#a2fbe4` and weight 600; the others are weight 400.
- **Module cards:** white background, 1px `#DEE3F1` border, radius 8px, padding 20px, 14px text. On hover the background becomes `#F5F6FA` and the border turns transparent. Transition is color/background at 150ms.
- **"Talk to sales" block:** `bg-light-grey` (`#f3f5f8`), radius 8px, padding `12px 16px`.

### Announcement pill (hero)

Green-to-cyan gradient (see A1), radius 11px, padding `10px 16px 10px 10px`, inset highlight shadow. It contains a small tag and a 15px link in `#0a1714` with an animated arrow.

### Eyebrow label

Inconsolata 14px / 700, uppercase, letter-spacing 0.08em, `#7f7f7f`, padding `6px 0`, with a 7px `::before` marker.

### Testimonial card

```css
background: #ffffff;
border-radius: 12px;
padding: 32px;                  /* 28px on mobile */
box-shadow: 0 4px 10px rgba(0,0,0,.04);
display: flex; flex-direction: column;
/* masonry layout: break-inside: avoid; margin-bottom: 32px */
```

### Tip card (growth section)

```css
background: #eef1f6;
border: 1px solid #dde3ee;
border-radius: 18px;
padding: 7px;
box-shadow: 0 16px 34px rgba(15,23,42,.14);
width: 304px;
```

### Use-case grid

A two-column grid divided by 1px `#DEE3F1` lines (top, right and bottom borders). Each cell has padding `40px 48px 40px 0`, a minimum height of 260px (220px on mobile), and a Poppins 24px / 600 title.

### Section shells

- **Grey section:** `#eef1f6` background.
- **Dark enterprise section:** `#121212` background, white text, bottom corners rounded 50px.
- **Testimonial section:** `#eef1f6`, bottom corners rounded 50px, overlaps the previous section by 100px.

Stacking rounded-bottom sections is a signature layout pattern on the site.

---

# PART B: Survey / form UI (what respondents see)

## B1. How theming works

The survey renderer reads **`--form-*` CSS variables** that come from each survey's theme settings. The defaults below are the fallback values written in the renderer's CSS. Several variables have different fallbacks in different rules, and all of them are listed.

| Variable | Fallback values found in CSS |
|---|---|
| `--form-bg` | `#fff`, `#ffffff` |
| `--form-font-family` | `"Open Sans", sans-serif`, `inherit` |
| `--form-base-font-size` | `100%` |
| `--form-font-color` | `#000`, `#37404a`, `#374151` |
| `--form-font-color-faded` | `rgba(0,0,0,.5)` |
| `--form-headlines-color` | `var(--form-font-color, #000)`, `inherit` |
| `--form-headlines-color-faded` | `rgba(0,0,0,.8)` |
| `--form-headings-weight` | `normal` |
| `--form-button-bg` | `#0445af`, `#67d32e` |
| `--form-button-bg-hover` | `#0445af`, `#6de23b`, `#48c233` |
| `--form-button-bg-faded` | `#6de23b`, `#48c233` |
| `--form-button-color` | `#fff` |
| `--form-button-radius` | `5px`, `15px`, `30px` |
| `--form-answer-background` | `#f3f4f6`, `rgba(255,255,255,.2)` |
| `--form-answer-background-hover` | `rgba(255,255,255,.3)` |
| `--form-answer-border-color` | `#d1d5db` |
| `--form-answer-border-color-hover` | `#9ca3af` |
| `--form-item-bg` | `#f4f4f4` |
| `--form-item-hover-bg` | `#d5d5d5` |
| `--form-scale-bg` | `rgba(0,0,0,.08)`, `rgba(4,69,175,.08)` |
| `--form-scale-border` | `rgba(0,0,0,.25)`, `rgba(0,0,0,.2)`, `rgba(4,69,175,.25)` |
| `--form-nav-radius` | `50%` |
| `--form-nav-arrow-bg-muted` | `rgba(55,205,36,.5)` |

### Derived tokens (`--fp-*`)

```css
--fp-answer-bg:     color-mix(in srgb, var(--form-scale-bg, rgba(0,0,0,.08)) 75%, transparent);
--fp-answer-border: color-mix(in srgb, var(--form-scale-border, rgba(0,0,0,.25)) 50%, transparent);
--fp-field-radius:  calc(var(--form-button-radius, 30px) * .4);
--fp-tile-radius:   calc(var(--form-button-radius, 30px) * .5);
--fp-nav-size:      clamp(44px, 8vw, 52px);
--fp-nav-gap:       clamp(8px, 2.4vw, 15px);
--fp-nav-label:     clamp(1rem, 3.2vw, 1.25rem);
--fp-footer-pad:    clamp(6px, 1.6vw, 8px);
--fp-footer-gap:    clamp(6px, 2vw, 12px);
--fp-badge-font: 12px;  --fp-badge-icon: 16px;  --fp-badge-gap: 5px;
--fp-step-top-gap: 2.5rem;
--fp-welcome-bar-pad: 16px;
```

The renderer also tracks the on-screen keyboard and visible viewport (`--fp-vv-height`, `--fp-keyboard-height`) so the bottom navigation stays above the mobile keyboard.

**Key idea:** a survey creator changes a handful of theme values (background, font, font color, button color, button radius). The renderer then derives the rest: answer tiles are a translucent tint of the scale color, and field and tile radii are fractions of the button radius.

## B2. Observed values on the sample survey

The "Customer Effort Score" template uses its own theme. These colors belong to that template's theme, not to the Responsly brand.

| Element | Measured |
|---|---|
| Page background | `#f2d1d1` |
| Font | Open Sans, 16px base, black text |
| Question heading (H2) | 20px / 28px, weight 400 |
| Scale numbers (0–7) | 20px |
| Text input | bg `rgba(0,0,0,.08)`, 1px border `rgba(0,0,0,.25)`, radius 12px, padding `12px 20px`, height 44px, 16px text |
| "Next" button | bg `#185498`, white text, radius 12px, height 44px, full width |
| "Back" button | bg `#1d67bb`, white chevron, radius 12px, 44×44px square |
| Progress bar | 3px tall, pill-shaped; filled part `#000`, remaining part black at 20% opacity |
| Branding badge | "Powered by Responsly", 12px, black at 50% opacity, centered under the nav |

## B3. Layout and component inventory

The CSS class names show these parts:

- **`fp-header`**: top progress bar.
- **`fp-body` / `fp-content` / `fp-question`**: one question per screen, vertically centered.
- **`fp-nav`**: fixed bottom bar with a square Back button and a full-width Next button.
- **`fp-welcome-start`, `fp-welcome-actions`**: welcome screen with a centered title, short info lines, and a full-width Start button pinned to the bottom.
- **`fp-key-hint`, `fp-key-badge`**: keyboard-shortcut hints.
- **`fp-side-panel`**, **`fp-inline-action`**, **`fp-submit-overlay`**, **`fp-submit-error`**.
- **`fp-user-logo`**: the creator's logo. **`fp-brand-badge`**: the Responsly badge. **`fp-free-pill`**.
- **`fp-cookie-consent`**, **`fp-turnstile`** (Cloudflare bot check), **`fp-print`**.
- **`fp-scroll-lock`**, **`fp-keyboard-keeper`**: mobile keyboard handling.

**Accessibility details observed:**
- A visually hidden "Question X of Y" and H1 for screen readers.
- Visually hidden text on scale endpoints, for example ", Definitely dissatisfied" next to "0".
- `prefers-reduced-motion` support.
- Separate styles for `(hover: hover)` and `(pointer: coarse)` devices.

**Breakpoints in the survey CSS:** 360, 420, 500, 520, 560, 600, 720, 768, 1024, and 1025px+ (desktop with hover/fine pointer), plus `print`.

---

# PART C: Not verified / out of scope

- **The logged-in app** (`app.responsly.com`, the survey builder and dashboards) is behind sign-in and wasn't inspected.
- **Hover/active colors of the primary and secondary buttons:** only `hover:underline` was found. No hover color change was confirmed.
- **Other marketing pages:** only the homepage was measured. Pricing, features and other pages may use more components.
- **The default survey theme:** only one template's theme was measured. Other templates use other colors.
- **Icon set:** the contents of the `icon-app` icon font weren't catalogued.
- **Unmapped colors:** I couldn't tie every color in the frequency tables to a specific component. Those rows are marked "—".

---

## Quick token sheet (observed values only)

```css
:root {
  /* Brand */
  --rs-ink:            #000000;
  --rs-ink-green:      #1a2921;   /* headings, primary button */
  --rs-green:          #84ffb7;   /* brand green */
  --rs-green-ring:     #67ffa7;   /* primary button border */
  --rs-green-soft:     #dcffeb;
  --rs-mint-active:    #a2fbe4;   /* active menu item */
  --rs-blue-link:      #1658ff;
  --rs-grey-bg:        #eef1f6;
  --rs-grey-bg-light:  #f3f5f8;
  --rs-border:         #dee3f1;
  --rs-muted:          #7f7f7f;   /* eyebrow labels */
  --rs-dark-section:   #121212;
  --rs-alert:          #ff4444;

  /* Type */
  --rs-font-body:    "proxima-nova", Helvetica, Arial, sans-serif;
  --rs-font-display: "Poppins", system-ui, sans-serif;
  --rs-font-mono:    "Inconsolata", ui-monospace, monospace;
  --rs-h2-size:      clamp(1.875rem, 3.5vw, 2.75rem);
  --rs-heading-tracking: -0.03em;
  --rs-label-tracking:   0.08em;

  /* Shape */
  --rs-radius-sm:  8px;
  --rs-radius-md:  12px;
  --rs-radius-lg:  18px;
  --rs-radius-section: 50px;
  --rs-radius-pill: 9999px;

  /* Elevation */
  --rs-shadow-card: 0 4px 10px rgba(0,0,0,.04);
  --rs-shadow-float: 0 16px 34px rgba(15,23,42,.14);

  /* Motion */
  --rs-ease: cubic-bezier(.4,0,.2,1);
  --rs-duration: 150ms;
}
```

The `--rs-*` names are my own labels for the observed values. Responsly's actual variable names are shown in A1–A3 and B1.
