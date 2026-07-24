# Roadmap: 6.97 → 9.5+

> **Status — execution round 1 complete.** Phase 1 (zero defects + accessibility gate)
> and Phase 2 (the Storm Sequence) are built and pushed, along with the Storm Check tool
> from Phase 4, the launch pack, and part of Phase 3's type work. Verified: axe-core
> reports **zero violations** across five states, the Storm Sequence holds **60 fps**,
> and there is no console error or horizontal overflow at 390/834/1440.
> Phase 0 (client assets — real testimonials, license number, project photography) is
> still open and remains the hard ceiling on Content and Design.

A plan to take the Raccoon Restoration site from Honorable Mention (jury baseline
**6.97** weighted) to **9.5 or higher on every judged axis**.

Baseline scores from the 13-agent jury review (Design 40% / Usability 30% /
Creativity 20% / Content 10%, plus accessibility and technical gates):

| Axis | Baseline | Target | The move that gets there |
|---|---|---|---|
| Design | 6.8 | 9.5 | Rendered visual system + custom type + zero defects |
| Usability | 7.2 | 9.5 | Mobile conversion rebuild + a real utility |
| Creativity | 6.8 | 9.5 | One unforgettable signature: **The Storm Sequence** |
| Content | 7.3 | 9.5 | Real proof: attributed reviews + case studies with numbers |
| Accessibility | 5.2 | 9.8 | Full WCAG 2.2 AA remediation, AAA where feasible |
| Technical | 6.9 | 9.8 | 60 fps motion budget, Lighthouse 100s, real backend, CI |

---

## 1. The honest reframe

The jury's punch list — all eight items — gets this site to roughly **7.5**. It does
not get to 9.5. Fixing defects removes reasons to score *down*; it does not create
reasons to score *up*. Three separate ceilings are in play, and they need different
kinds of work:

**Ceiling 1 — Execution defects.** Six confirmed findings plus ~34 minor ones. Pure
craft debt. Fixable with disciplined work and no new ideas. Worth ~0.5 points.

**Ceiling 2 — Expression and motion depth.** This is the real gap. The jury:
*"146 lines of JS yielding only one-shot fade-ups and a single fire-and-forget hero
animation, in a judging culture where scroll-coupled, scrubbed, cursor-aware
interaction depth is a first-class criterion."* And: *"the ideas are the site's own,
the clothes are borrowed."* Current award benchmarks (By-Kin, Lando Norris SOTY 2025)
win on scroll-as-timeline sequencing real-time 3D, with motion that has *a director*,
holding 60 fps. Closing this requires rebuilding the expression layer, not patching it.
Worth ~1.5–2.0 points and it is the difference between 7.5 and 9+.

**Ceiling 3 — Authentic proof.** Content cannot reach 9.5 with initials-only
placeholder testimonials; the jury read them as *"manufactured social proof."* Design
cannot reach the top band without either extraordinary photography or an extraordinary
rendered visual system. This ceiling is broken by **client assets**, not by code — see
Phase 0, which blocks the top of two axes.

---

## 2. Phase 0 — Client dependencies (blocking, start immediately)

These gate the Content and Design ceilings. Nothing else in this plan can substitute
for them. Request now, in parallel with Phase 1.

| Asset | Why it's blocking | Minimum viable |
|---|---|---|
| **Real testimonials** | Placeholders actively cost points as a trust failure | 5–8 reviews, full name, town, job type, sourced from Google/BBB/GuildQuality with permission |
| **IL roofing license number** | Footer claims licensure without proving it | The number + expiry |
| **3–5 completed projects** | Case studies with numbers are the single biggest content lever | Per job: before/after photos, storm date, scope, **first settlement offer vs. final settlement**, days to complete |
| **Photography** | The only alternative to a rendered visual system for top-band Design | 20–30 art-directed shots: crews working, roof detail, materials, trucks, owner portrait |
| **Form endpoint** | `mailto:` handoff is a documented placeholder that fails silently | Formspree/Netlify Forms endpoint or CRM webhook |
| **Spring, TX street address** | JSON-LD location is incomplete | Full street address |

> If photography never arrives, the fallback is to push the rendered/illustrated system
> (Phase 2 + 3) hard enough that it *is* the art direction. That is a viable path to 9.5
> Design — it is simply a harder one, and it makes Phase 2 non-optional.

---

## 3. Phase 1 — Zero defects and a clean accessibility gate

Target after this phase: **~7.5 weighted, accessibility ≥ 9.5, technical ≥ 8.5.**
Everything here is verified against the code; no discovery work needed.

### 3.1 The six confirmed defects

1. **Contact form overflows its card** (`css/styles.css:604-609`). `.contact-form` is
   `display:grid` with no `grid-template-columns`, so the implicit track is sized by
   `.field-row`'s min-content (~542px vs a ~495px content box) and every stretched
   child runs 47px past the padding edge and 4px past the card border.
   **Fix:** `grid-template-columns: minmax(0, 1fr)` on `.contact-form`, plus
   `min-width: 0` on `.field-row` children.
2. **Mobile header drops both phone and CTA** (`styles.css:682, 700`).
   **Fix:** a persistent bottom call bar at ≤640px — tap-to-call + "Free inspection",
   thumb-reachable, `env(safe-area-inset-bottom)` aware, hidden when the contact form is
   in view. This is a conversion fix, not just a jury fix.
3. **Slider is a touch-scroll trap** (`styles.css:469`). `touch-action: none` over the
   full graphic swallows vertical swipes across a third of the mobile viewport.
   **Fix:** `touch-action: pan-y`.
4. **Interaction vocabulary too shallow** — addressed by Phase 2.
5. **Borrowed visual dialect** — addressed by Phase 3.
6. **Hero pitch annotation is false.** The roofline is drawn at 6.72:12 but captioned
   "8:12 PITCH, TYP." (`index.html:159` vs `:199`).
   **Fix:** redraw the top edge to a true 8:12 (33.69°) and recompute the dependent
   layer polygons, shingle ticks, and rafters — *do not* just relabel. The whole point
   of the spec-sheet conceit is that the numbers survive an expert's check. Update
   `README.md:23`.

### 3.2 Accessibility — drive the 5.2 gate to 9.5+

- **Reversed slider announcement** (`js/main.js:80-83`) — with
  `clip-path: inset(0 0 0 var(--cut))`, a *low* value reveals *more damage*, but the
  code announces "mostly restored view." It tells screen-reader users the opposite of
  what is on screen. Invert the condition and word it as
  `"<n>% restored — <n>% storm-damaged"`.
- **Mobile menu focus escape** (WCAG 2.2 §2.4.11) — focus tabs behind the scroll-locked
  overlay. Add a real focus trap, `inert` on `<main>`/`<footer>` while open, and return
  focus to the toggle on close.
- **Focus ring fails contrast on light sections** — amber `#FFB200` is 1.56:1 on
  concrete. Use a context-aware ring: graphite on light, amber on dark, with a 2px
  offset companion so it reads on both.
- **iOS input zoom** — form controls below 16px trigger auto-zoom. Set `font-size: 16px`
  minimum on all inputs/selects/textareas.
- **Color-only error states** — pair `.field.invalid` with an icon, inline text, and
  `aria-invalid` + `aria-describedby` per field, replacing the single aggregate message.
- **Placeholder contrast 2.77:1** — move the textarea's instructional copy out of
  `placeholder` into persistent hint text under the label.
- **Menu link activation drops focus to `<body>`** — move focus to the target section
  heading (`tabindex="-1"` + `.focus()`).
- **Micro-labels at 8.8–10.6px** — raise the mono label floor to 12px.
- **AAA push where feasible:** 7:1 body contrast on both surfaces, and a genuinely
  equivalent `prefers-reduced-motion` experience (Phase 2 must ship a static
  art-directed fallback, not a degraded one).

### 3.3 Technical and launch pack

- `robots.txt`, `sitemap.xml`, designed `404.html` (raccoon in the attic — see 4.3).
- Favicon fallbacks: `.ico`, `apple-touch-icon.png`, `site.webmanifest`.
- `color-mix()` fallback for the sticky header background.
- Kill the 17px horizontal overflow at 390px; unclip the process-section marker.
- Move the `html.js` class ahead of any code that can throw, so a single error can never
  hide all revealed content.
- Wire the dead `.scrolled` hook (`main.js:14` toggles a class with **zero** matching CSS)
  into a real compacting header state.
- Enrich JSON-LD: `image`, `geo`, `priceRange`, `openingHours`; add `FAQPage` schema for
  the existing Q&A; add `AggregateRating` **only** once real reviews land.
- Meta description 190 → ≤155 chars.
- Replace the `mailto:` handoff with a real endpoint, honest success/failure states, and
  a `<noscript>`-safe `method="POST"` fallback.

---

## 4. Phase 2 — The signature: "The Storm Sequence"

**This is the phase that decides whether the site reaches 9+.** Creativity is judged
against the global field, not the roofing category, and the current inventory (fade-ups
+ one 0.9s load animation) cannot compete. The site needs one thing people screenshot.

### 4.1 The idea

Today the site's two best assets — the annotated roof cross-section and the before/after
slider — sit as disconnected widgets. Fuse them into a **single continuous scroll-driven
scene**: one house, four acts, scroll as the editor's timeline.

| Act | What the visitor sees | What it says |
|---|---|---|
| **I — Calm** | The house at dusk, still, confident. Hero headline over it. | This is what you have |
| **II — The storm** | Scroll brings weather: wind, rain, hail. Shingles lift and tear, a limb strikes, water finds a way in. Damage accrues *as you scroll* | This is what happened |
| **III — The claim** | The scene freezes and wireframes into the FIG. 01 blueprint. Each damage point becomes an annotated callout — a live scope of loss | This is what we document and fight for |
| **IV — Restoration** | The roof rebuilds layer by layer (deck → ice & water → underlayment → shingles), annotations retract, dawn light | This is what you get back |

Why this scores: it is **scroll as a storytelling engine sequencing a 3D scene** — the
exact pattern current SOTY-tier winners are built on. The spec-sheet aesthetic stops
being decoration and becomes a *state* the scene transitions through, which retroactively
justifies the entire existing art direction. And it dramatizes the actual service:
damage documented, claim argued, home restored. Motion with a director.

### 4.2 Technical approach

- **Three.js**, stylized low-poly house — deliberately *not* photoreal, so it reads as a
  continuation of the line-drawing system rather than a mismatched render.
- **GPU-instanced particles** for rain/hail; shader-driven wind on the shingle instances.
- **Shader transition** from shaded → wireframe/blueprint for Act III, so the existing
  amber-on-graphite palette is the material system, not a filter.
- **Scroll scrubbing** via CSS `scroll-timeline` where supported, with a rAF-throttled
  IntersectionObserver fallback. Never bind raw scroll handlers.
- **Performance budget is a hard gate:** 60 fps on a mid-tier Android, ≤2.5s LCP, WebGL
  bundle lazy-loaded *after* first paint so the 220ms FCP survives. Cap DPR at 2, use
  LOD, pause the loop when off-screen or on `visibilitychange`.
- **Fallbacks are first-class, not afterthoughts:** `prefers-reduced-motion`,
  `save-data`, no-WebGL, and low-power devices each get a set of art-directed static
  keyframes from the same scene plus the current slider. The reduced-motion path must be
  *beautiful*, not merely functional — that is what earns a 9.5 accessibility score
  alongside a 3D hero.

### 4.3 The wit payoff

The creativity juror flagged it: *"the raccoon is never paid off beyond the mark."* The
company is named Raccoon Restoration. Use it, sparingly and well:

- Act II: a raccoon scurries under the eaves to shelter from the storm.
- Act IV: it reappears sitting on the finished ridge cap, surveying the new roof.
- `404.html`: the raccoon has gotten into the attic. "This page got in somewhere it
  shouldn't have. So did something else, probably."

Small, charming, unmistakably theirs — and the kind of detail juries screenshot.

---

## 5. Phase 3 — Design elevation (6.8 → 9.5)

The jury's charge: graphite + one accent + expanded uppercase grotesk + mono indexes +
outline mega-wordmark is *"the current industrial-brutalist house style."* Keep the
concept; replace the borrowed clothes.

- **Custom lettering.** Draw the "RACCOON RESTORATION" wordmark rather than setting it in
  Archivo. A bespoke mark is the fastest, most durable way to stop looking templated.
- **A second, unexpected type voice.** Archivo alone is the tell. Pair it with something
  with real character for editorial moments — a condensed grotesk with genuine quirk, or
  a stencil/industrial face used sparingly for section numerals.
- **Typographic finishing:** tabular figures in the stats band, optical sizing, hanging
  punctuation, true fractions in the pitch annotations, and kill the **orphaned floating
  period** that trails every amber marker-block title (a defect the design juror flagged
  on the site's signature device).
- **Retire the marker-block tic.** The juror: it *"decays into a tic."* Use it two or
  three times, not on every heading; let other headings carry emphasis differently.
- **Expand the drawing library** so illustration reads as a *system*, not two set pieces:
  a damage taxonomy (hail bruising, wind creasing, granule loss, flashing failure), roof
  type profiles, material cross-sections. This doubles as content (see 6.2).
- **Fix the illustration mismatch.** The damage marks read naive against the drafting
  precision of the hero figure; redraw them to the same standard.
- **Materiality:** subtle print-registration offsets, paper tooth on light sections,
  dimension lines that actually measure the layout. Make the "living construction
  document" idea literal.
- **Integrate photography** the moment it arrives — duotone-graded to the palette, in a
  strict grid, as counterweight to the drawings.

---

## 6. Phase 4 — Usability and content to 9.5

### 6.1 A real utility: "Storm Check"

The strongest single addition available. Visitor enters a ZIP or address; the site
returns hail and wind events recorded in that area over the last 24 months (NOAA storm
event data is public), with dates and estimated hail size, then asks: *was your roof
installed before this date?* → free inspection CTA.

This converts the site from a brochure into a **tool** — a large simultaneous lift to
Usability (genuine task completion), Content (real data), and Creativity (nobody in the
category has this), and it is a legitimate lead magnet the client will value commercially.

### 6.2 Content depth

- **Case studies** from Phase 0 assets: storm date, scope, **first offer vs. final
  settlement**, days to complete, before/after. Numbers are proof; this is the single
  biggest content lever available.
- **Rewrite the manifesto.** Both the content and creativity jurors flagged it as the one
  place the site lapses into interchangeable mission boilerplate — precisely the register
  the rest of the copy avoids.
- **An insurance glossary / claim guide** — ACV vs. RCV, depreciation recovery,
  supplements, code upgrade coverage. Deep expertise content that ranks and earns trust.
- Fix the FAQ line that doesn't parse (*"Insurance work is where we're rare;
  craftsmanship is where we live"*), the section-numbering inconsistencies in the site's
  own wayfinding system, and the stats band that recycles hero credentials instead of
  adding new proof.

### 6.3 Conversion craft

- Persistent mobile call bar (3.1.2).
- Multi-step form with progress, per-field inline validation, an honest success state,
  and optional photo upload ("send us a picture of the damage").
- Nav fixes: "Standard" is a weak label; Areas and Contact are missing from desktop nav.
- Live "recent projects near you" strip keyed to the visitor's area once case studies exist.

---

## 7. Phase 5 — Engineering credibility

- **Lighthouse 100 / 100 / 100 / 100** on mobile, enforced in CI (Lighthouse CI budget
  assertions) so a regression fails the build.
- **Automated axe-core** accessibility tests plus a manual screen-reader matrix
  (VoiceOver/Safari, NVDA/Firefox, TalkBack/Chrome) with results published in the repo.
- **Playwright visual regression** across 390 / 834 / 1440 / 2560, plus a WebGL frame-rate
  smoke test that fails under 55 fps.
- Security headers (CSP, HSTS, `X-Content-Type-Options`, Referrer-Policy).
- Critical-CSS inlining and a real asset pipeline — the only justification for
  introducing a build step is measurable delivery gain; keep the no-dependency runtime.

---

## 8. Sequencing

| Phase | Effort | Depends on | Expected weighted score |
|---|---|---|---|
| 0 — Client assets | client-side, ongoing | — | (unblocks Content/Design ceilings) |
| 1 — Zero defects + a11y | 3–5 days | — | ~7.5 (a11y 9.5, tech 8.5) |
| 2 — Storm Sequence | 10–15 days | — | ~8.6 |
| 3 — Design elevation | 5–8 days | Phase 0 photography (optional) | ~9.0 |
| 4 — Utility + content | 5–8 days | **Phase 0 hard dependency** | ~9.3 |
| 5 — Engineering | 3–5 days | Phases 1–4 | ~9.4 |
| 6 — Re-jury and iterate | 1–2 days per round | all | target 9.5+ |

Phases 1 and 2 can run in parallel; Phase 1 is low-risk craft work and Phase 2 is the
long pole. **Start Phase 2 immediately** — it has the longest lead time and the highest
score leverage.

---

## 9. Honest risk assessment

Three axes can be driven to 9.5+ with near-certainty through disciplined execution:
**Usability, Accessibility, Technical.** These are engineering problems with known
solutions, and this plan specifies them.

**Content** reaches 9.5 if and only if Phase 0 assets arrive. Real attributed reviews
and case studies with settlement numbers are not substitutable by better writing.

**Design** reaches 9.5 through Phase 3 plus either photography or a Storm Sequence
polished enough to carry the art direction alone.

**Creativity is the one axis that cannot be guaranteed.** It is judged against every site
in the field, not the roofing category, and it depends entirely on whether the Storm
Sequence lands as genuinely novel *and* runs flawlessly. A 3D hero that stutters scores
worse than no 3D hero at all — the jury explicitly noted that *"beauty that drops frames
doesn't place."* The 60 fps budget in 4.2 is therefore not a nice-to-have; it is the
condition under which this phase is worth attempting.

Realistic outcome with everything above executed well: **8.8–9.4 weighted**, with
Usability/Accessibility/Technical at or above 9.5. Reaching 9.5 on *all six* additionally
requires the client assets to arrive and the Storm Sequence to be exceptional rather than
merely good.

## 10. Verification protocol

Re-run the same 13-agent jury (6 independent jurors → 6 adversarial verifiers →
foreperson) after each phase, against freshly captured evidence at 390/834/1440. Same
prompts, same Awwwards calibration, so scores are comparable across rounds. Track the
delta per axis and let the confirmed-findings count — not the score — drive the next
round's work.
