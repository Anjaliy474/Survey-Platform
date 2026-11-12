# PlaySurvey: UI / UX Layout Spec

> **For the AI coding agent (Antigravity) and anyone building PlaySurvey.**
> This file explains **what goes on every page**: routes, layouts, sections in order, states, interactions and acceptance checks.
> Visual details (colours, type, components) live in `PlaySurvey_DESIGN.md`. References like **[D 6.3]** point to that file's sections.

**Version:** 1.0 (11 Nov 2026)
**Sources:**
- PRD (Activities 1–4)
- `survey-platform-architecture.mmd`
- AI system prompt `combined.system.txt`
- Design System v0.3

---

## 0. How to use this file with Antigravity

**Build one page at a time.** Don't ask the agent to build the whole app in one go. Follow the build order in section 7. For each step:

1. Paste the step's prompt (section 7) into Antigravity.
2. Attach or point it to `PlaySurvey_DESIGN.md` and this file. Mention the reference websites below for the feel.
3. Check the page against its **Acceptance checks** before moving on.

**Ground rules for the agent (repeat them in every prompt):**

- Use tokens from `tokens.css`. No raw hex codes or pixel values in components.
- Never display a number produced by the LLM. Numbers come from the compute layer and wear the **Computed** badge.
- AI output starts in **draft** state until the user accepts it.
- No points, prizes, avatars, timers or sliders in the survey Player. No pie charts anywhere.
- Mobile-first: design at 360px, then scale up.

**MVP scope (from the PRD):**

| Priority | Pages |
|---|---|
| **P0 core** | Landing, Auth, Onboarding, Home, New survey (3 starts), Builder, Style, Publish, Player |
| **P0 secondary** | Results overview, Themes, basic Dashboard |
| **P1** | Responses table with CSV export, full Dashboard editor, Ask your data, Insight report, Google Forms import |
| **P2 (not now)** | Hindi/regional languages, integrations, team workspaces |
| **Out of scope** | Respondent panels, money incentives, enterprise SSO, auto-publishing |


### Reference websites

Look at these for the **feel** only. Never copy their text, images, logos or exact layouts. Full notes are in `PlaySurvey_DESIGN.md` section 1.1.

| Website | Use it for |
|---|---|
| https://www.responsly.com/ | Survey screen structure (one question per screen, sticky bottom nav, progress), survey theming, marketing navigation |
| https://geniestudio.app/ | Landing page mood: airy sky, floating playful objects, rotating headline word, scroll-built sections, live mini-demos |
| PlaySurvey landing prototype (private, share first): https://claude.ai/artifact/CMJ8eDfLDoGbh1JZaMtN1j | Our own starting point for M1 (the landing page) and the live poll card |

---

## 1. Sitemap and routes

```
PlaySurvey
├── Marketing (sky look)
│   ├── /                      Landing                         P0
│   ├── /pricing               Pricing                         P1
│   └── /privacy, /terms       Legal                           P0 (simple text)
├── Auth
│   ├── /signup  /login        Sign up / Log in                P0
│   └── /onboarding            3-step onboarding               P0
├── Studio (signed in)
│   ├── /app                   Home: my surveys                P0
│   ├── /app/new               Start chooser                   P0
│   │   ├── /app/new/questions Bring your questions            P0
│   │   ├── /app/new/research  Describe your research          P0
│   │   └── /app/new/prompt    Quick prompt                    P0
│   ├── /app/s/:id/build       Question builder + review       P0  ← heart of the product
│   ├── /app/s/:id/style       Style and gamify                P0
│   ├── /app/s/:id/publish     Publish and share               P0
│   ├── /app/s/:id/results     Results overview                P0
│   ├── /app/s/:id/themes      Themes from open answers        P0
│   ├── /app/s/:id/dashboard   Custom dashboard                P0 basic / P1 full
│   ├── /app/s/:id/responses   Responses table                 P1
│   ├── /app/s/:id/ask         Ask your data (chat)            P1
│   ├── /app/s/:id/report      Insight report                  P1
│   └── /app/settings          Profile, data and privacy       P0
├── Player (public, no login)
│   └── /s/:slug               Welcome → questions → thank-you → reveal   P0
├── Story Mode (demo build, no sign-in)
│   ├── /studio                Your surveys
│   ├── /studio/new            S3d Start from a concept (quick picks)
│   └── /studio/s/:id/{questions,story,publish,results}
└── System
    └── 404, error, offline
```

### AI stage → page map

| AI stage (root tag) | Called from |
|---|---|
| `<survey_request>` → question_shaper | `/app/new/*` (first draft), `/app/s/:id/build` (re-shape, "Update draft") |
| `<bias_check_request>` → bias_checker | `/app/s/:id/build` (automatically after each shape, and on "Check again") |
| `<gamify_request>` → gamifier | `/app/s/:id/style` |
| `<theme_request>` → theme_extractor | `/app/s/:id/themes` (and live batches as responses arrive) |
| `<dashboard_request>` → dashboard_spec | `/app/s/:id/dashboard` |
| `<analyst_question>` → chat_with_data | `/app/s/:id/ask`, and "Ask about this" from any chart |
| `<report_request>` → insight_report | `/app/s/:id/report` |

All numbers on Results, Themes, Dashboard, Ask and Report come from the **compute engine**, never from the AI response.

---

## 2. Main user flows

### 2.1 Creator: idea to published survey (target ≤ 10 minutes)

```
Landing → Sign up → Onboarding (role, goal)
   → Home → New survey → [Bring | Describe | Prompt]
   → AI working panel (shaper → bias → rules → privacy)
   → Builder: review suggestions → Accept/Edit → fix flags → fill placeholders
   → Style: pick style + playful level + theme → review AI microcopy
   → Publish: checklist ✓ → Publish → Share (link / WhatsApp / QR)
```

### 2.2 Respondent (target: finish in about 2 minutes, completion ≥ 85%)

```
WhatsApp link → Welcome (purpose + consent, "8 questions · about 2 min") → Start
   → questions (one mechanic each, progress + remaining pill)
   → Submit → Thank-you + enjoyment tap → Reveal (if 20+ responses) or teaser
```

### 2.3 Analyst / creator: responses to decision

```
Home (live counts) → Results overview (participation, completion, drop-off)
   → Themes (quoted themes) → Dashboard ("show X by Y") → Ask ("should we…?")
   → Report (creator / analyst / leadership) → share link
```

---

## 3. Global layouts (shells)

### 3.1 Marketing shell

- **Look:** "Professional play" [D 3.12]: white, airy, one dark pill call-to-action, glossy pastel survey pieces.
- **Top nav:**
  - logo (clay mark + "PlaySurvey" wordmark) on the left
  - links: What you get · How it works · Styles · Who it's for · FAQ
  - **Create a survey, free** (primary S) on the right
  - under 820px, links move to a menu sheet
- **Background:** sky bands alternate with cream bands. Footer on cream.
- **Footer:** logo, 3 link columns (Product · Company · Legal), "Made in Hyderabad" line, © year.

### 3.2 Auth shell

- **Desktop:** split screen. Left 45% is a sky panel with 3 floating clay objects and one line ("Surveys people actually finish"). Right 55% is the form, centred, max 400px.
- **Mobile:** form only, with a thin sky strip at the top.

### 3.3 Studio shell (signed-in app)

```
Desktop ≥1024
┌────────────┬───────────────────────────────────────────────────────────┐
│ ● PlaySurvey│  Home / Café Sunday survey        [Draft]  [Preview] [Publish]│ ← top bar 64px
│            ├───────────────────────────────────────────────────────────┤
│ ⌂ Home     │  ●───●───○───○   Questions · Style · Publish · Results     │ ← step rail (create flow)
│ ＋ New      │  ── or ──                                                 │
│            │  Overview · Themes · Dashboard · Responses · Ask · Report │ ← results tabs (after publish)
│            ├───────────────────────────────────────────────────────────┤
│            │                                                           │
│            │                 page content (max 1200px)                 │
│ ⚙ Settings │                                                           │
│ (avatar)   │                                                           │
└────────────┴───────────────────────────────────────────────────────────┘
 sidebar 248px (collapsible to 72px icons)
```

- **Sidebar:**
  - `sand-100` background, 248px wide
  - items: Home, New survey (primary pill button), Settings at the bottom with the user's initials avatar
  - collapse button at the bottom
- **Top bar:**
  - breadcrumb on the left, survey status badge (Draft / Live / Closed)
  - right-side actions depend on the page (Preview, Publish, Share, Export)
  - an autosave indicator ("Saved" / "Saving…") next to the breadcrumb
- **Inside a survey**, before publishing, show the **step rail** [D 5.11]: Questions → Style → Publish → Results (Results locked until published).
- **After publishing**, show **results tabs**: Overview · Themes · Dashboard · Responses · Ask · Report. A small "Edit survey" link goes back to Build (with a warning that editing a live survey splits results).
- **Tablet (768–1023):** sidebar collapsed to icons by default.
- **Mobile (<768):**
  - the sidebar becomes a **bottom tab bar** (Home · New · Settings)
  - the step rail collapses to "Step 2 of 4 · Style"
  - results tabs become a horizontally scrollable chip row
  - top-bar actions go into a ⋯ menu, except the primary action, which becomes a sticky bottom button

### 3.4 Player shell

- Public, no login, no Studio chrome.
- Max 560px centred on `--theme-bg`.
- Progress bar at the very top, then the remaining pill, then the content, then a sticky bottom bar.
- The creator's logo (optional) sits top left at 28px tall.
- "Made with PlaySurvey" appears **only** on the thank-you screen.

---

## 4. Page specs

Every page uses the same template:

- **Route**
- **Purpose**
- **Layout**
- **Sections**
- **Data / AI**
- **States**
- **Interactions**
- **Acceptance checks**

---

### M1. Landing page `/`  (P0)

**Purpose:** in 30 seconds a visitor should *feel* the gamified survey (by playing one) and *see* what the creator gets.

**Reference:** the mood of https://geniestudio.app/ (airy sky, floating objects, rotating word), built with our own content and clay survey pieces. Start from the PlaySurvey landing prototype. Don't copy Genie's assets or layout.

**Layout:** marketing shell in the "Professional play" look [D 3.12]. White page; the hero and final call to action sit on the soft sky gradient; other sections alternate white and `--ps-mist`. One dark pill button per section; persimmon only for highlights.

| # | Section | Background | Content | Key components |
|---|---|---|---|---|
| 1 | **Hero** | Sky + clouds + 6–8 clay objects | Centred `hero` headline "Surveys [✓★☺] people actually **finish / enjoy / share / remember**" (rotating word); `body-lg` sub; **Create a survey, free** + ghost **See what creators get ↓**; live poll card overlapping into the next band | [D 9] rotating word, inline chips, clay objects, live poll card |
| 2 | **Creator view** "How many joined, what they said, what to do next" | Cream | 3 KPI tiles (Participants, Completion, Median time) · grouped bar "Chai or coffee by time of visit" with a small-group flag · theme card with 2 quotes · AI next-step card · "Sample data" note | [D 8.2–8.4] |
| 3 | **Three ways to start** | Sky band | 3 start cards, each with a typing loop that ends in an AI suggestion (diff, new question with role chip, draft with a `[placeholder]` chip) | [D 6.1, 6.3] |
| 4 | **Pick the vibe** | Cream | Left: style buttons. Centre: phone preview. Right: playful dial + theme swatches. Every click re-renders the *same* question | [D 6.9] |
| 5 | **From answers to decisions** | `sand-100` | Left: 3 steps (How many? / What did they say? / So what?). Right: a sticky dashboard whose panel highlights as each step scrolls into view | [D 8.1–8.5] |
| 6 | **Trust strip** | Cream | 4 cards: Numbers from code (Computed) · Quotes you can trace (AI) · You decide (You approved) · Consent built in (DPDP) | provenance badges |
| 7 | **Who it's for** | Cream → persimmon-50 | Tabs: Startups · Researchers · Colleges & NGOs · Analysts → sample survey + sample insight | [D 5.5] |
| 8 | **Voices** | Cream | **Hidden until real pilot quotes exist, with permission** | — |
| 9 | **FAQ** | Cream | 6 accordion items (format and results, where numbers come from, no app needed, personal data, Google Forms, languages) | details/summary |
| 10 | **Final CTA** | Sky | `display` title "Ready to make your first one?" + 1-question mini poll (👍 / 🤔) + primary button | — |

**Hero, mobile:** headline 40px, buttons stacked, poll card starts within the first 1.3 screens, only 4 clay objects (at the edges).

**Live poll card** (a real Player, Medium playful level):

1. `this_or_that`: Chai or coffee?
2. `emoji_scale`: How do you feel about long online forms?
3. `tap_chips_multi`: Pick up to 3 snacks for a long day (+ None of these)

Submit flips the card to the reveal (or to the teaser under 20 responses).

**Data:** the demo poll stores real anonymous responses. KPIs and reveal numbers come from the compute engine. Before launch, label everything "Sample data".

**States:**
- No JS: all text and static visuals still render.
- Reduced motion: clouds hidden, objects static, word fixed to "finish", flip becomes a fade.

**Acceptance checks:**
- [ ] The poll is playable without scrolling more than about one screen on a 360×740 phone.
- [ ] No horizontal scroll at 360px.
- [ ] LCP under 2.5s.
- [ ] Every number has a Computed badge (or a "Sample data" label before launch).
- [ ] No invented testimonials or logos.

---

### M2. Pricing `/pricing`  (P1)

**Layout:**
- Two plan cards side by side (stacked on mobile): **Free** and **Pro**.
- An INR/USD toggle above them.
- A "What counts as a response?" explainer below, then the FAQ.

**Rule:** prices show as "To be decided" until the team sets them. No fake discounts or countdowns.

**Acceptance checks:**
- [ ] Works at 360px.
- [ ] The toggle is a segmented control with `aria-pressed`.

---

### A1. Sign up / Log in `/signup`, `/login`  (P0)

**Layout:** auth shell [3.2].

**Sections:**

1. `h1` "Create your free account" (or "Welcome back").
2. **Continue with Google** (secondary L).
3. "or" divider.
4. Email field.
5. Password field with show/hide.
6. **Create account** (primary L).
7. Small print: "By continuing you agree to our Terms and Privacy Policy." Links to /terms and /privacy.
8. Switch link: "Already have an account? Log in".

**States:**
- Field errors are inline [D 5.2].
- Wrong password: "That email and password don't match. Try again or reset your password."
- The button shows a loading state while submitting.

**Acceptance checks:**
- [ ] Labels on all fields.
- [ ] Errors are announced to screen readers.
- [ ] Works with password managers (`autocomplete` attributes).

---

### A2. Onboarding `/onboarding`  (P0)

**Purpose:** personalise suggestions in under 30 seconds. Every step can be skipped.

**Layout:** centred card (max 560px) on a soft sky, 3 dots on top showing the step.

| Step | Question | UI |
|---|---|---|
| 1 | What best describes you? | 4 big choice tiles with icons: Startup or business · Student or academic researcher · College, club or NGO · Analyst |
| 2 | What's your first survey about? | Chips: Customer feedback · Product idea · Event feedback · Research study · Something else. Plus an optional text box |
| 3 | You're set | Short summary + **Start my first survey** (goes to /app/new with the role pre-filled) |

**Acceptance checks:**
- [ ] Skip is always visible.
- [ ] Choices persist if the user goes back.
- [ ] No personal data is asked beyond the account.

---

### S1. Home: my surveys `/app`  (P0)

**Purpose:** see every survey's status and live numbers at a glance, and start a new one.

**Layout:**

```
┌ h1 "Your surveys"                                   [＋ New survey] ┐
│ [All] [Drafts] [Live] [Closed]                 🔍 Search surveys     │
├──────────────────────────────────────────────────────────────────────┤
│ ┌─ card ─────────────┐ ┌─ card ─────────────┐ ┌─ card ─────────────┐ │
│ │ [Live] Café Sunday  │ │ [Draft] Fest food   │ │ [Closed] Workload   │ │
│ │ 371 responses ⓒ     │ │ 8 questions · 2 min │ │ 142 responses ⓒ     │ │
│ │ 90% completion ⓒ    │ │ Step: Style         │ │ Report ready        │ │
│ │ ▁▂▅▇▆ last 7 days   │ │ [Continue]          │ │ [Open results]      │ │
│ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**Sections:**

1. Title + **New survey** (primary M).
2. Filter chips + search.
3. Survey card grid: 3 columns on desktop, 2 on tablet, 1 on mobile.

**Survey card** [D 5.4 interactive]:
- status badge
- title (`h3`)
- **Live / Closed:** responses + completion (Computed), and a 7-day sparkline (bar, Computed)
- **Draft:** questions · time (Computed), current step, and **Continue**
- overflow menu: Duplicate, Close survey, Delete (with confirm)

**States:**

| State | Shows |
|---|---|
| Empty | Empty state [D 5.9] with a small clay star chip: "Your first survey is a minute away." + **Start a survey** + 3 template idea chips (Customer feedback, Event feedback, Research study), which go to Quick prompt pre-filled |
| Loading | 3 skeleton cards |
| Error | Inline banner with Retry |

**Acceptance checks:**
- [ ] Every number is Computed.
- [ ] Cards are keyboard-reachable.
- [ ] Delete needs a confirm modal that names the survey and says it can't be undone.

---

### S2. Start chooser `/app/new`  (P0)

**Purpose:** pick one of the three ways to start.

**Layout:** centred, max 1000px. `h1` "How do you want to start?" + one line: "Any way works. AI suggests, you decide."

**Sections:**

1. Three start cards [D 6.1] in a row (stacked on mobile):
   - **Bring your questions:** "Paste them, or import from Google Forms (soon)"
   - **Describe your research:** "Tell us the decision. We'll suggest what to ask."
   - **Quick prompt:** "One line is enough."
2. Below the cards: "Not sure? Try a quick prompt", with 3 example chips.

**Acceptance checks:**
- [ ] Each card is a single link or button with a clear accessible name.
- [ ] Arrow keys move between cards.

---

### S3a. Bring your questions `/app/new/questions`  (P0)

**Layout:**
- Desktop: two columns. Left 60% is input, right 40% is a "What we'll check" helper card. Mobile: single column.
- Step rail at the top (Questions is the current step).

**Sections:**

1. `h1` "Paste your questions".
2. Large textarea (min 240px tall). Placeholder: "One question per line. Add options under a question with a dash (- Option)."
3. Live parse preview: as they type, a list of detected questions appears with a count.
4. **Optional context** (collapsed by default): Who will answer? · What decision is this for? · Time limit (chips: 1 min, 2 min, 3 min, No limit).
5. Helper card listing what we check:
   - wording that pushes an answer
   - two questions in one
   - unbalanced scales
   - missing options
   - length and order
   - personal data
6. **Improve my questions** (ai button, L). Secondary: **Import from Google Forms** (P1, disabled with a "Soon" badge).

**Data:** `<survey_request>` with mode `bring_questions`.

**States:**
- On submit, the AI working panel [D 5.10] replaces the form. Its steps follow real backend events.
- AI error: "We couldn't reach the AI just now. Your questions are saved. Try again." + **Retry**.
- Suspicious input: continue, and show the flag chip in the Builder.

**Acceptance checks:**
- [ ] Pasted text is preserved exactly if the user goes back.
- [ ] Nothing is lost on refresh (autosave).

---

### S3b. Describe your research `/app/new/research`  (P0)

**Layout:** a single-column form, max 680px, that reads like a friendly brief.

**Fields:**

| Field | Input |
|---|---|
| What decision should this survey help you make? | Required, textarea |
| Who will answer? | Chips: Customers · Students · Employees · Event attendees · Other + text |
| Anything you already know or suspect? | Optional textarea |
| Is it anonymous? | Segmented: Anonymous · Need some contact details |
| Time limit | Chips |
| Sensitive topic? | Toggle: health, money, workplace or identity. When on, it shows a note that answers will be anonymous and optional |

**Button:** **Suggest questions** (ai, L).

**Data:** `<survey_request>` mode `describe_research`.

**States:** if the AI returns `needs_clarification`, the Builder opens with the info banner [D 6.4] and the starter draft.

**Acceptance checks:**
- [ ] Only the decision field is required.
- [ ] The time limit is passed to the AI and the rules engine.

---

### S3c. Quick prompt `/app/new/prompt`  (P0)

**Layout:** centred hero-style input on a soft sky band (an empty-state feel).

**Sections:**

1. `display` "What's your survey about?"
2. One large input (56px, `r-pill`) with an inline **Draft it** button (ai).
3. Example chips below:
   - "Feedback for our college fest"
   - "Would students pay for a laundry pickup app?"
   - "Customer satisfaction for our café"

**Data:** `<survey_request>` mode `quick_prompt`. The Builder opens with the **Assumptions** list expanded and every `[placeholder]` chip highlighted.

**Acceptance checks:**
- [ ] Enter submits.
- [ ] An empty input shows a helper hint, not an error.

---

### S4. Question builder + review `/app/s/:id/build`  (P0, the most important page)

**Purpose:** turn the AI's proposal into a final, unbiased, short question set. The creator approves every change.

**Layout (desktop ≥1024):**

```
┌ top bar: Home / Café Sunday   [Draft]  Saved ✓          [Preview] [Next: Style →] ┐
├ step rail: ●Questions ─ ○Style ─ ○Publish ─ ○Results                            ┤
├ RULES METER (sticky): Questions 8/10 · About 2 min ⓒ · Open 1/2 ✓ · Consent ✓ · Bias: 1 to fix ┤
├──────────────────────────────────────────────┬───────────────────────────────────┤
│ AI SUMMARY CARD  ✦AI                          │  REVIEW PANEL (sticky, 360px)     │
│ "We kept 5, reworded 2, split 1…"             │  ┌ Suggestions (4) ──────────────┐│
│ ▸ This survey helps you decide: (2)           │  │ [Accept all] [One by one]      ││
│ ▸ Assumptions (3)                             │  ├ Bias check ──────────────────┤│
│ [status banner if any]                        │  │ 1 critical · 1 minor           ││
│ PURPOSE + CONSENT BLOCK 🔒                    │  │ "Two questions push…"          ││
│ ┌ Q1 card ───────────────────────────────┐   │  ├ Left out (2) → drawer ────────┤│
│ │ … with change chip + diff + bias chip   │   │  ├ Notes for you ────────────────┤│
│ └─────────────────────────────────────────┘   │  └ Flags (if any) ───────────────┘│
│ ┌ Q2 card …                                   │                                   │
│ [＋ Add question]   [✦ Suggest one more]       │                                   │
└──────────────────────────────────────────────┴───────────────────────────────────┘
```

**Main column, in order:**

1. **AI summary card** (`summary_for_creator`, AI badge) with two collapsibles:
   - "This survey helps you decide" (`decisions_informed`)
   - "Assumptions" (`assumptions`, each with an Edit link)
2. **Status banner** [D 6.4], if the status isn't `ready`.
3. **Purpose and consent block** [D 6.7].
4. **Question cards** [D 6.2], each with a change chip and diff [D 6.3] and bias chips [D 6.5]. Drag to reorder. Opening a card shows its options and lets you edit inline.
5. **Add question** (secondary) and **Suggest one more** (ai ghost; the AI proposes one question for an uncovered decision).

**Review panel (right, sticky):**

| Panel section | What it does |
|---|---|
| Suggestions | Count, **Accept all**, **Review one by one** (moves focus card by card, with "3 of 6" and Accept / Edit / Keep mine) |
| Bias check | `overall_note`, list of findings grouped by severity. Click scrolls to the question and opens the popover. **Check again** button |
| Left out | `cut_questions` count, opens the drawer [D 6.8] |
| Notes for you | `notes_for_creator` |
| Flags | Shows only when present |

**Top bar:** **Preview** opens the Player in a phone frame modal. **Next: Style →** (primary) is enabled when there are no unresolved critical flags, no unfilled placeholders, and the count is ≤15.

**Mobile (<768):**
- The review panel becomes a bottom sheet with a peek bar: "4 suggestions · 1 to fix ▲".
- The rules meter collapses to one line.
- Question cards are full width, with reorder via a "Move" menu instead of dragging.

**Data:**
- `<survey_request>` for re-shaping ("Update draft" after a clarification, or after the creator edits a lot).
- `<bias_check_request>` runs automatically after each shape and on **Check again**.
- The rules engine runs on every change, client-side for instant feedback and server-side on save.

**States:**

| State | Shows |
|---|---|
| Loading | Skeleton cards + AI working panel in the summary slot |
| `needs_clarification` | Info banner with up to 3 answer fields → **Update draft** |
| `conflict` | Warning banner + Left out drawer auto-opens once + **Confirm core set** |
| `declined_with_alternative` | Danger-outline banner, neutral set shown |
| Over the limit | Rules meter turns warning (11–15) or blocked (16+), and **Next** is disabled with the reason in a tooltip and under the button on mobile |
| Autosave | "Saving…" → "Saved ✓", and on failure "Couldn't save. Retrying…" |

**Interactions:**
- Accept fades the diff into the final text (200ms) and adds **You approved** to the card for 2s.
- Undo is offered by toast for Accept all, Delete and Move back in.
- Keyboard shortcuts: `A` accept, `E` edit, `K` keep mine (in one-by-one mode). Arrow up/down moves between cards.

**Acceptance checks:**
- [ ] No AI change applies without Accept.
- [ ] Kept questions show no diff.
- [ ] Duplicates are never auto-deleted.
- [ ] A critical bias blocks Next until it's fixed or dismissed with a reason.
- [ ] The time estimate is computed in code and badged.
- [ ] The consent block can't be deleted.
- [ ] Works fully by keyboard.
- [ ] Usable at 360px.

---

### S5. Style and gamify `/app/s/:id/style`  (P0)

**Purpose:** choose how the survey feels without changing what it asks.

**Layout (desktop):**

```
┌ step rail: ✓Questions ─ ●Style ─ ○Publish ─ ○Results ┐
├──────────────────────────────────────┬────────────────┤
│ 1 STYLE  [One per screen✓][Pages][Chat][Classic]     │  PHONE PREVIEW  │
│   ✦AI recommends One per screen: "8 short questions…"│  (sticky, 300px)│
│ 2 PLAYFUL LEVEL  [Off][Light✓][Medium]  + description│  ‹ Q3 of 8 ›    │
│ 3 THEME  ◐Marigold ◐Lagoon ◐Night ◐Custom · Soft/Round/Pill │ [Welcome][Q][Thanks]│
│ 4 WORDS ON SCREEN (microcopy editor) ✦AI             │                 │
│   Welcome title · Start button · Lead-ins · Milestones│                 │
│   Feedback (Medium) · Thank-you · Enjoyment prompt   │                 │
│ 5 RESULTS REVEAL  ☑ Q1 ☑ Q4 ☐ Q6 (≤3, closed only)  │                 │
│   Teaser copy for <20 responses                      │                 │
└──────────────────────────────────────┴────────────────┘
```

**Sections:**

1. **Style picker** [D 6.9].
2. **Playful dial.**
3. **Theme picker**, with a contrast check.
4. **Microcopy editor** [D 6.10]: every gamifier field, grouped (Welcome · During · End). Each line has an AI badge, a word counter and a **Rewrite** (ai ghost) button.
5. **Mechanic per question** (collapsed): a list of Q1…Qn showing the chosen mechanic, with a dropdown of *only the allowed mechanics for that question type*.
6. **Results reveal:** checkboxes for eligible questions only (closed, not sensitive, no personal data). Ineligible ones show disabled with the reason. At most 3. The teaser copy field sits below.

**Preview panel:**
- Phone frame.
- Tabs: Welcome · Question · Thank-you.
- ‹ › arrows step through questions.
- **Desktop preview** toggle.
- Under 1024px, the preview becomes a floating **Preview** button that opens a full-screen sheet.

**Data:** `<gamify_request>` runs on first entry (with style and level). The "Regenerate words" button runs it again. Changing the style or level asks first: "Regenerate on-screen words for this style?" (Yes / Keep my edits).

**States:** while generating, microcopy fields show skeletons, and the preview uses neutral default copy.

**Acceptance checks:**
- [ ] Question wording, options and scales can't be edited here (they show read-only, with a link back to Build).
- [ ] Only allowed mechanics appear in the dropdowns.
- [ ] `emoji_scale` is only offered for satisfaction or feelings questions.
- [ ] No banned elements are available.
- [ ] Feedback copy is identical for every answer.
- [ ] Custom theme contrast is enforced.
- [ ] The preview updates within 300ms.

---

### S6. Publish and share `/app/s/:id/publish`  (P0)

**Layout:** centred, max 720px.

**Before publishing:**

1. `h1` "Ready to publish?"
2. Publish checklist [D 6.11]. Each row has a ✓ or ✕ and a "Fix" link.
3. Settings card:
   - Close survey: Never · On a date · After N responses
   - One response per person (on by default)
   - Response language: English (Hindi later, disabled)
4. **Publish** (primary L), sticky at the bottom on mobile.

**After publishing** (the same page swaps with a short celebration):

1. Success header: "It's live!" + Live badge, with one marigold sparkle burst (once).
2. Share sheet [D 6.11]:
   - link field + **Copy**
   - **Share on WhatsApp** (big, first on mobile)
   - QR card + **Download QR**
   - embed code (collapsed)
3. "What happens next" card: "Results appear as answers come in. Themes update automatically." + **Go to results**.

**Acceptance checks:**
- [ ] Publish is disabled until every check passes.
- [ ] Copy shows a "Copied" toast (falls back to selecting the text).
- [ ] The QR code downloads as a PNG.
- [ ] The WhatsApp share prefills the link and the welcome title.

---

### R1. Results overview `/app/s/:id/results`  (P0)

**Purpose:** answer "How many joined, and where did they drop off?" at a glance.

**Layout:**

```
┌ results tabs: [Overview] Themes  Dashboard  Responses  Ask  Report ┐
│ SAMPLE CAVEAT BANNER (n = 371 ⓒ)                                    │
│ [KPI Responses ⓒ] [KPI Completion ⓒ] [KPI Median time ⓒ] [KPI Enjoyment ⓒ] │
│ ┌ Responses over time (bar by day) ┐ ┌ Drop-off by question (bar, Q7 highlighted) ┐ │
│ ┌ Question cards: one per question, a chart by type (bar / diverging Likert / NPS) ┐ │
│ ┌ Data quality strip: speeders · straight-liners · duplicates · flagged (link) ┐    │
└───────────────────────────────────────────────────────────────────┘
```

**Sections:**

1. Sample caveat banner [D 8.1].
2. KPI row (4 tiles; 2×2 on mobile).
3. Responses over time (bar; line only with 5+ periods).
4. Drop-off by question (bar). The highest bar is highlighted, with a plain sentence produced by code: "Most people who left did so at Q7."
5. Per-question result cards, in survey order:

   | Question type | Chart |
   |---|---|
   | Single choice | Bar |
   | Multi choice | Bar with mentions + multi-select caveat |
   | Scale | Diverging Likert |
   | NPS | NPS KPI + distribution bar |
   | Open text | "See themes →" card |

6. Data quality strip, with links to Responses filtered by each issue.

**Live updates:** new responses animate the counts in (no layout jump). A "12 new responses · Refresh charts" pill appears instead of re-rendering mid-read.

**States:**

| State | Shows |
|---|---|
| 0 responses | Empty state: "No responses yet." + share sheet (compact) |
| 1–9 responses | Charts show with a "Very few responses" warning banner. Group charts are hidden |
| 10–19 responses | Normal. The respondents' reveal is still off, and Studio shows "Reveal unlocks for respondents at 20" |

**Acceptance checks:**
- [ ] No pie charts.
- [ ] `n` shown on every chart.
- [ ] Every number is Computed.
- [ ] Each chart has "View as table".

---

### R2. Responses `/app/s/:id/responses`  (P1)

**Layout:**
1. Toolbar:
   - search
   - filters (date, status chips: Complete · Partial · Flagged)
   - **Include flagged** toggle
   - **Export CSV** (secondary)
2. Table [D 5.8]: Response ID (mono) · Submitted (date) · Status · Time taken · then one column per question (truncated, horizontally scrollable).
3. Row click opens the **response drawer**: every answer in order, flags with reasons, and **Keep** / **Exclude**.
4. Flagged responses section [D 8.7] pinned at the top when there are any.

**Privacy:** personal-data fields are masked by default. "Show personal data" needs a confirm, is logged, and is only available to the owner. The AI never sees unmasked data.

**Mobile:** the table becomes cards (ID, status, date, first 2 answers).

**Acceptance checks:**
- [ ] Excluding a response updates every number site-wide (Computed) and is reversible.
- [ ] The export includes an "excluded" column rather than silently dropping rows.

---

### R3. Themes `/app/s/:id/themes`  (P0)

**Purpose:** answer "What did they say?" for each open question.

**Layout:**
- Left (280px): list of open questions with their response counts.
- Right: themes for the selected question.
- Mobile: a question dropdown at the top.

**Right column, in order:**

1. Header: question text + "371 answers · 312 with content" (Computed) + "Updated 2 min ago".
2. Theme cards [D 8.4], sorted by count (code). Ties are labelled.
3. "Said by one person" (minority mentions).
4. "Possible new themes" (draft cards, apply-codebook mode).
5. Other responses, collapsed: No content · Off topic · Flagged, with counts and links to Responses.
6. "Coding notes" (AI, collapsed): ambiguities for a human to check.

**Data:**
- `<theme_request>` mode `discover` the first time (needs at least 10 text answers, or it shows "Themes appear after 10 written answers").
- Then `apply_codebook` for new batches.
- Counts and shares come from code using the AI's assignments.

**Interactions:**
- Click a theme for the "All quotes" drawer, with every assigned response and sentiment chips.
- **Rename theme** (keeps its ID) and **Merge themes** (with a confirm). Both are logged as "You approved".

**Acceptance checks:**
- [ ] Every quote is an exact substring of its response (verified server-side; failed quotes are dropped and logged).
- [ ] No theme without quotes.
- [ ] Personal-data masks are shown as pills.
- [ ] Never says "top" unless code marks a single highest.

---

### R4. Dashboard `/app/s/:id/dashboard`  (P0 basic, P1 full editor)

**Layout:**

```
┌ PROMPT BAR: "Describe the dashboard you want…" [✦ Build]  (examples as chips) ┐
├ "What we did with your request" panel (collapsible): Done / Adapted / Not possible ┤
├ Filters row: City ▾  Year ▾  Date range ▾                                       ┤
├ 12-col grid of chart cards (draft = dashed, [Accept] [Remove])                  ┤
│  KPI KPI KPI KPI                                                               │
│  [bar 6 col]          [diverging likert 6 col]                                 │
│  [grouped bar 12 col]                                                          │
└ [Share dashboard] [Ask about this ▸]                                           ┘
```

**Sections:**

1. **Prompt bar**: 56px input, **Build** (ai), example chips ("Satisfaction by city", "Top complaints", "Compare first years and final years").
2. **Request mapping panel**: one row per requested part, as Done / Adapted (with reason) / Not possible (with reason). Questions for you show as chips that reply into the prompt bar.
3. **Filters row.**
4. **Chart grid:** at most 8 charts, sizes 4/6/12 columns (stacked on mobile). Draft cards show **Accept** / **Remove**. Once accepted, a card is solid with **You approved**.
5. **Footer actions:** Share (read-only link) and **Ask about this** (opens Ask with context).

**Editing:** typing a follow-up ("make the city chart a table") runs `<dashboard_request>` mode `edit`. Changed cards pulse once, and unchanged cards keep their place.

**Acceptance checks:**
- [ ] Only library chart types.
- [ ] No pies; requests for one show "Adapted".
- [ ] Line charts only with 5+ periods.
- [ ] `n` per group.
- [ ] Small groups hatched and flagged.
- [ ] Personal fields never appear in filters or charts.
- [ ] The convenience-sample caveat is always present.

---

### R5. Ask your data `/app/s/:id/ask`  (P1)

**Layout:**
- Chat column, max 760px, centred.
- Right rail (≥1280px only): "Pinned answers" and "Suggested questions".

**Sections:**

1. Empty state: an `h2` line + 3 starter chips built from the survey's decisions ("Should we open on Sundays?").
2. Conversation [D 8.5].
3. Sticky composer.

**Data:** `<analyst_question>` with tools (`run_query`, `get_theme_summary`, `search_responses`). While working, the bubble shows "Looking at your data…" with the tool names in plain words ("Counting answers", "Reading themes").

**Rules shown in the UI:**
- An answer with any ungrounded number is removed by code. The UI then shows "I couldn't answer that reliably. Try rephrasing." and logs it.
- Declined requests (identify a person, inflate results) get a one-line reply with the honest figure.

**Acceptance checks:**
- [ ] Every number shows as a Computed chip linked to its query in "Show how this was calculated".
- [ ] The base (n) is always present.
- [ ] Caveat chips appear where returned.
- [ ] **Pin to dashboard** adds a draft card to R4.

---

### R6. Insight report `/app/s/:id/report`  (P1)

**Layout:**
- Long-read page, text column 720px.
- Sticky mini table of contents on the left (≥1280px).
- Top actions: Reader switch · **Regenerate** · **Share link** · **Download PDF**.

**Sections, in schema order (empty ones hidden):**

1. Reader switch [D 8.6] (Creator · Analyst · Leadership).
2. Headline (`display`).
3. Data quality card.
4. Executive summary: 3–5 lines, each linking to its finding.
5. Decision answers: one card per decision, with a confidence meter.
6. Findings: finding cards with evidence tags, Computed chips, the "Possible reason (not proven)" callout and an optional chart.
7. Priorities table.
8. Recommendations board (Now / Next / Later).
9. Also worth knowing: say-vs-do gaps · surprises · minority views · segments (or "not run" + reason).
10. Limitations · Questions this survey couldn't answer (with a suggested question → **Add to a new survey**).

**Data:** `<report_request>` with the code-built analysis pack. While generating, the AI working panel shows the pack steps, then the writing step.

**Acceptance checks:**
- [ ] Data quality always comes first.
- [ ] Every number traces to an evidence ID (hover shows the source).
- [ ] Hypotheses are always labelled "not proven".
- [ ] Switching the reader changes depth only, never facts.

---

### X1. Settings `/app/settings`  (P0)

**Tabs:** Profile · Data and privacy · (Billing, P1)

- **Profile:** name, email, role, organisation (optional).
- **Data and privacy:**
  - what we store
  - **Download my data**
  - **Delete a survey's responses** (survey picker + typed confirm)
  - "Handle a deletion request from a respondent" (search by response ID)
  - a DPDP explainer in plain words
  - every destructive action needs a confirm modal that names the item and says it can't be undone

**Acceptance checks:**
- [ ] Deletions are logged.
- [ ] A deletion request can be completed within the product.

---

### P1. Survey Player `/s/:slug`  (P0)

**Purpose:** a short, joyful, honest survey that people finish.

**Reference:** the survey screen structure of https://www.responsly.com/ survey templates (one question per screen, sticky bottom nav, thin progress bar, theme via a few variables). Our version adds the remaining pill, the clay tiles and the playful dial, and uses our tokens.

**Screens and flow:**

```
Welcome ─► Q1 ─► Q2 ─► … (milestone lines between) ─► Submit ─► Thank-you ─► Reveal or teaser
```

**Quality bar:** every survey should feel as polished and enjoyable as our earlier gamified survey video. That video sets the quality level only; it isn't a style or layout to copy. See [D 7.5].

| Screen | Layout | Notes |
|---|---|---|
| **Welcome** | Optional creator logo · `p-welcome` title · purpose line · consent line · pill "8 questions · about 2 min" · **Start** (L, sticky bottom) | Nothing else. No illustrations |
| **Question (one per screen)** | Progress bar · remaining pill · lead-in (Light/Medium) · `p-question` · helper · mechanic · feedback (Medium) · bottom bar [← Back] [Next / Skip] | Auto-advance 400ms for single-select. Text questions show **Skip** |
| **Pages style** | Page header ("Page 1 of 3 · About your visits") · 2–4 questions stacked with 32px gaps · **Next page** | Sensitive and open questions on their own page |
| **Chat style** | Bubbles: lead-in → question (left), reply chips (right), typing dots ≤300ms | Previous answers stay visible above (read-only, tap to change) |
| **Classic style** | All questions on one scrolling page, numbered, plain controls, no lead-ins or feedback · **Submit** at the end | Still themed |
| **Milestone** | Inline line before the next question, ≤12 words, one emoji max | Light/Medium only |
| **Thank-you** | `thank_you` text · enjoyment prompt (5 labelled faces, optional) · creator link · "Made with PlaySurvey" | — |
| **Reveal** | Reveal card [D 7.3] with up to 3 questions, Computed bars, "You" tags, one burst | Only with 20+ responses. Otherwise the teaser |

**Responsive:**
- Designed at 360×640.
- On desktop, the same 560px column centred, with the theme background filling the page.
- Keyboard hints on desktop ("Press 1–5").

**Data:**
- The survey definition and gamifier output are loaded once.
- Answers are saved per question (so a partial completion counts, and drop-off is logged as events).
- Submit sends the final answers.
- Reveal numbers come from the compute engine.

**States** [D 7.4]: closed · not found · already answered · offline (answers kept locally) · bot-check fallback · rate-limited ("Too many tries. Please wait a minute.").

**Acceptance checks:**
- [ ] Only the 7 mechanics.
- [ ] Meets the quality bar in [D 7.5]: polished enough to sit next to our reference survey video.
- [ ] Wording, options and scales match the approved set exactly.
- [ ] No banned elements.
- [ ] The remaining pill updates once per question.
- [ ] Feedback text is the same for every answer.
- [ ] The reveal only shows after submitting, with 20+ responses, for ≤3 eligible questions.
- [ ] Works inside WhatsApp's in-app browser at 360px.
- [ ] Under 150 KB before fonts.
- [ ] Every screen announces "Question X of Y".
- [ ] Full keyboard support.

---

### S3d. Start from a concept `/studio/new`  (Story Mode)

**Purpose:** one line in, a survey and a story world out, in under a minute of creator effort.

**Sections:** concept (required) with three example chips · **Make it for me** · who will play it + age band · how it should feel (Journey Map / Stations Room / Chat Story, with a suggested one and its reason) · world mood · look (Clay / Paper-cut) · playful level (Light / Medium / Full story) · brand colour (contrast-adjusted) and logo · time limit.

**States:** a sensitive-sounding brief shows a one-line reminder; submit shows the AI working panel; errors keep the input and show the message.

### S4s. Story step `/studio/s/:id/story`

**Sections:** world card (title, premise, format, mood, look, narrator; Regenerate, Preview) · storyboard (one card per chapter: scene thumbnail and swap, title, intro line, the chapter's questions read-only, acknowledgement per question, interlude line, Regenerate lines, Merge with next, Split here) · integrity panel (13 checks with Fix) · **Accept world · Next: Publish** (disabled until every check passes).

**Preview:** phone frame playing the whole story, with a Story / Plain view switch.

### R1s. Story vs plain `/studio/s/:id/results`

Sample caveat with total n (Computed) · per-version table (started, finished, completion, median time, enjoyment, switches to plain) · "Too few responses to compare" until 30 finished per version · then one row per closed question: "answers look the same" or "Answers to Q3 differ between story and plain. Review its scene." · "N new responses · Refresh" pill.

### E1. System pages  (P0)

| Page | Content |
|---|---|
| **404** | Sky band, one floating clay object (question-mark chip), `h1` "We couldn't find that page", **Go home** |
| **Error** | "Something went wrong on our side. Your work is saved." + **Try again** + **Go home** |
| **Offline (Studio)** | Top banner "You're offline. Changes will save when you're back." Editing still allowed, publishing disabled |

---

## 5. Cross-page patterns

| Pattern | Rule |
|---|---|
| **Autosave** | Every Studio edit saves within 1s. Top-bar indicator: Saving… / Saved ✓ / Couldn't save · Retry |
| **Undo** | Destructive or bulk actions show a toast with Undo (6s). Deletes of whole surveys need a confirm modal instead |
| **AI calls** | Always: AI working panel with real stage events → result in draft state → Accept. On failure: keep the user's input, plain error, Retry. Never block the whole page; other areas stay usable |
| **Provenance** | AI badge on every AI sentence block; Computed badge on every number; You approved after acceptance |
| **Empty states** | Every list, chart and panel has one [D 5.9]. Never a blank area |
| **Loading** | Skeletons shaped like the content. Never a full-page spinner after first load |
| **Confirmations** | In-page modals only, never browser `alert` or `confirm` |
| **Live data** | New responses update counts in place. Charts wait for a "Refresh" pill so nothing jumps while the user reads |
| **Editing a live survey** | Warning modal: "Changing questions after people have answered will split your results. Continue?" Changes are versioned |
| **Language** | `en-IN` formats: DD/MM/YYYY, ₹, Indian digit grouping (1,24,800) shown only when the creator turns it on. Otherwise 124,800 |

---

## 6. Responsive summary

| Element | ≥1024 | 768–1023 | <768 |
|---|---|---|---|
| Studio sidebar | 248px (collapsible) | 72px icons | Bottom tab bar |
| Step rail | Full | Full | "Step 2 of 4 · Style" |
| Results tabs | Tabs | Tabs | Scrollable chips |
| Builder review panel | Right, sticky 360px | Right, 320px | Bottom sheet with peek bar |
| Style preview | Right, sticky phone | Below controls | Floating Preview button → sheet |
| Tables | Table | Table (horizontal scroll) | Cards |
| Charts | Grid 4/6/12 cols | 6/12 | Single column |
| Player | 560px centred | Same | Full width, 20px padding |
| Landing hero objects | 8 | 6 | 4 (at the edges) |

---

## 7. Build order for Antigravity (one feature at a time)

Each step lists what to build and a ready-to-paste prompt. Finish a step's acceptance checks before starting the next.

| # | Build | Depends on |
|---|---|---|
| 1 | `tokens.css` + Tailwind config + fonts + base components (Button, Input, Badge, Card, Tabs, Modal, Toast, Skeleton, Empty state) | — |
| 2 | Player shell + 7 mechanics + welcome / thank-you / reveal, using a hard-coded sample survey JSON | 1 |
| 3 | Studio shell (sidebar, top bar, step rail, results tabs) + Home | 1 |
| 4 | Start chooser + 3 start pages + AI working panel (mock AI responses that follow the system prompt schemas) | 3 |
| 5 | Question builder (S4) with diffs, bias flags, rules meter, consent block, drawer | 4 |
| 6 | Style and gamify (S5) with live preview reusing the Player from step 2 | 2, 5 |
| 7 | Publish and share (S6) | 6 |
| 8 | Results overview (R1) + compute endpoints | 2, 7 |
| 9 | Themes (R3) | 8 |
| 10 | Dashboard (R4) | 8 |
| 11 | Landing page (M1) reusing the Player for the live poll | 2, 8 |
| 12 | Auth + Onboarding + Settings | 3 |
| 13 | P1: Responses, Ask, Report, Pricing | 8–10 |

**Prompt template** (fill in the step):

```
You are building PlaySurvey. Read PlaySurvey_DESIGN.md (visual rules) and
PlaySurvey_UI_UX_LAYOUT.md (page structure) in full before writing code.

Build ONLY step [#]: [page or feature name], spec section [e.g. S4].
- Use tokens from tokens.css only. No raw hex or px in components.
- Follow the section's layout, sections-in-order, states and interactions exactly.
- Mobile-first: it must work at 360px with no horizontal scroll.
- AI output must render in draft state until the user accepts it.
- Never render a number that came from the LLM; numbers come from the
  compute layer and show the Computed badge.
- Survey Player: only the 7 mechanics; no points, prizes, avatars, timers,
  sliders. No pie charts anywhere.
- Use mock data that matches the JSON schemas in combined.system.txt.

When done, list each Acceptance check for this section and say how you met it.
Do not start the next step.
```

**Definition of done (every step):**
- [ ] Matches the layout and section order in this file.
- [ ] Uses only tokens.
- [ ] Passes the page's acceptance checks.
- [ ] Works at 360, 768 and 1280px.
- [ ] Keyboard and screen-reader basics pass [D 11].
- [ ] Reduced motion is respected.
- [ ] Empty, loading and error states are all built (not just the happy path).
