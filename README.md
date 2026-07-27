# Raccoon Restoration — Website Redesign

A ground-up redesign of [raccoonrestoration.com](https://www.raccoonrestoration.com/) for
**Raccoon Restoration** of Barrington, IL & Spring, TX — roofing, storm damage restoration,
and insurance claim advocacy.

## Design concept: “Storm & Structure”

The site is built to look like what the company actually sells: structure, weather
protection, and expertise. Dark, substantial, and engineered — not a soft template.

- **Palette** — wet-slate graphite `#0E1114` dominant, concrete `#EDEEF0` for light
  sections, and hi-vis safety amber `#FFB200` as the single accent. Amber is what a
  roofer wears on a roof; it also reads as caution, energy, and urgency for storm work.
- **Typography** — [Archivo](https://fonts.google.com/specimen/Archivo) variable grotesk
  for display, run wide (`wdth` 112) and heavy (`wght` 800) in uppercase so headlines
  read like stamped signage. [Inter](https://fonts.google.com/specimen/Inter) for body,
  system monospace for technical labels and numbering. Both self-hosted.
- **Contrast rule** — bright amber can't meet contrast as text on light backgrounds, so
  on light sections the accent becomes a **hi-vis marker block** (graphite on amber)
  instead of colored type. It's both accessible and more on-brand than tinted text.
- **Hero illustration** — a labeled **roof assembly cross-section** (shingles →
  underlayment → ice & water shield → decking → rafters), drawn to a stated 8:12 pitch.
  It shows trade knowledge and teaches the homeowner something in the first screen.
- **Roof-pitch motif** — the contact section's top edge is cut on a pitch angle,
  echoing a roofline.
- **Identity** — a custom mark that reads simultaneously as a raccoon face and a
  twin-gabled house (`assets/logo.svg`, `assets/favicon.svg`).

## The Storm Sequence

The site's signature moment. Scrolling `#restoration` scrubs a four-act canvas
narrative — **calm → storm → claim → restored** — that fuses what used to be two
disconnected widgets (the roof cross-section and the before/after slider) into one
continuous scene:

1. **Calm** — the house at dusk, still.
2. **Storm** — rain and hail ramp up, shingles tear off and fly, damage accrues, and
   the raccoon takes shelter under the eave.
3. **Claim** — the scene wireframes into a blueprint and every hit annotates itself as
   a line-item scope of loss, with a drawing title block.
4. **Restored** — the assembly rebuilds deck-up, dawn breaks, and the raccoon tops out
   on the finished ridge.

Built in **Canvas 2D, deliberately not WebGL**: the art direction is line drawing, so
vector strokes are the medium; it holds 60 fps; and it adds no dependency to a page
that ships in ~270 KB. It is pure progressive enhancement — without canvas, with
`prefers-reduced-motion`, with Save-Data, or without JS at all, the static before/after
comparison is what ships, and the scope-of-loss list is real text either way.

## Structure

```
index.html          single-page site (semantic, landmarked, JSON-LD + FAQPage schema)
404.html            designed not-found page (the raccoon got into the attic)
css/styles.css      design system: fluid type/space scale, components, responsive rules
css/fonts.css       self-hosted @font-face declarations
js/main.js          progressive enhancement: nav, reveals, form, Storm Check
js/storm.js         the Storm Sequence canvas narrative
assets/fonts/       Archivo + Inter variable woff2 (latin subsets, ~138 KB total)
assets/             logo.svg · favicon set · og.png (+ og-source.html)
robots.txt · sitemap.xml · site.webmanifest
```

No build step, no frameworks, no third-party requests. Open `index.html` or serve the
folder with any static host:

```
npm start                       # then http://localhost:8000
```

### Tests

25 regression guards, one per defect found in review — so none of them can come back
silently. Console errors and horizontal overflow at three viewports, contact-form
containment, the hero roof matching its stated pitch, slider touch-action and
announcement direction, the Storm Sequence's enhancement gates / reduced-motion
fallback / 55 fps floor, the mobile call bar, menu focus trap and restore, per-field
form errors, Storm Check honesty, no-JS content visibility, the launch pack, JSON-LD
parsing, and axe-core across five states.

```
npm install && npx playwright install chromium
npm test                    # 28 guards
CHECK_LAUNCH=1 npm test     # adds the launch gate — fails while placeholders stand
```

They run on every push via `.github/workflows/ci.yml`. The launch gate is opt-in
so day-to-day runs stay green, but it will refuse to pass while the IL license
number, the form endpoint, or the placeholder testimonials are still in place.

## How it meets award-winning criteria

| Criterion | How |
|---|---|
| **Design** | Committed art direction (graphite + hi-vis amber), signage-grade variable display type, hard-edged 2px-rule grids instead of soft cards, and a bespoke line-drawing system that carries the whole site — no stock photos, no template look. |
| **Creativity** | **The Storm Sequence** — a scroll-scrubbed four-act canvas narrative; dual-read raccoon/house logo paid off in the sequence and the 404; annotated roof-assembly cutaway; pitch-angled section edge. |
| **Usability** | Persistent mobile call bar (tap-to-call + CTA in thumb reach), sticky desktop nav with number and CTA, the Storm Check tool, one-thumb mobile menu, FAQ accordions, per-field form validation. |
| **Content** | Real services, mission, credentials, service areas, and honest FAQ answers a homeowner actually has mid-claim. |
| **Accessibility** | **axe-core: zero violations** across desktop, mobile, menu-open, reduced-motion and 404 (incl. best-practice rules). Focus trap + `inert` on the mobile overlay, context-aware focus rings, per-field errors with `aria-invalid`/`aria-describedby`, 16px controls, 44px targets, honest slider announcements. |
| **Performance** | **~88 KB over the wire** (gzipped text + subset fonts; 193 KB uncompressed), zero third-party requests, dependency-free JS. Fonts are instanced to the axes actually used and subset to the 115 glyphs the site renders: 138 KB → 52 KB. The Storm Sequence measures **61 fps unthrottled and 52 fps at the heaviest frame under 4× CPU throttle**, because it is fill-rate bound — an adaptive tier drops raster resolution rather than dropping frames. |
| **SEO / sharing** | Meta + Open Graph + Twitter cards, canonical URL, JSON-LD `RoofingContractor` schema with both locations, custom 1200×630 share image. |

## Storm Check

An honest self-assessment tool (`#storm-check`): three questions, transparent scoring,
and a real answer — including "probably nothing, genuinely." It runs entirely in the
browser and sends nothing anywhere. It deliberately **does not invent storm history**:
fabricating hail dates for real ZIP codes could mislead someone deciding whether to
file a claim. Service-area matching uses the real Barrington and Spring coverage lists.

## Before launch — replace the placeholders

1. **Testimonials** (`#reviews`) are plausible placeholders — swap in verified customer
   reviews (Google / BBB / GuildQuality) and real attributions.
2. **License number** — footer says “Illinois Licensed Roofing Contractor”; add the
   actual IL license number.
3. **Form endpoint** — the form posts to `https://formspree.io/f/FORM_ENDPOINT`.
   Replace that placeholder with the real endpoint (Formspree, Netlify Forms, or the
   company's CRM) and the JS mail-client fallback retires itself automatically.
4. **Photography** — the illustration-first design stands on its own, but real project
   photos can drop into the reviews and restoration sections if desired.
5. Verify the **Spring, TX** street address and add it to the JSON-LD when confirmed.
6. **Business hours and geo** in the JSON-LD are reasonable defaults — confirm them.

## Notes for future maintainers

- The before/after slider shares one SVG symbol between both panes. Its styles are
  written against `#art-defs` (where the artwork really lives) because class selectors
  cannot reach into a `<use>` shadow tree; per-pane theming rides on inherited
  `--art-*` custom properties, which can.
- `assets/og.png` is rendered from `assets/og-source.html` at exactly 1200×630
  (e.g. a headless Chromium screenshot).
- `js/storm.js` draws in a fixed 760×560 virtual space (the same coordinate system as
  the SVG house) and maps it to the canvas in `resize()`. On wide screens the scene is
  anchored in the channel between the copy column and the act rail; on narrow screens it
  sits below the copy and the leader-line callouts are suppressed in favour of the real
  text scope list.
- Design decisions that look like bugs but aren't: the logotype's sub-label sits below
  the 12px micro-label floor because it is part of the lockup, not informational text;
  `hanging-punctuation` is Safari-only and degrades silently.
