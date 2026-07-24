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

## Structure

```
index.html          single-page site (semantic, landmarked, JSON-LD LocalBusiness schema)
css/styles.css      design system: fluid type/space scale, components, responsive rules
css/fonts.css       self-hosted @font-face declarations
js/main.js          progressive enhancement only (page fully works with JS disabled)
assets/fonts/       Archivo + Inter variable woff2 (latin subsets, ~138 KB total)
assets/logo.svg     lockup ·  assets/favicon.svg  ·  assets/og.png (+ og-source.html)
```

No build step, no frameworks, no third-party requests. Open `index.html` or serve the
folder with any static host:

```
python3 -m http.server 8000     # then http://localhost:8000
```

## How it meets award-winning criteria

| Criterion | How |
|---|---|
| **Design** | Committed art direction (graphite + hi-vis amber), signage-grade display type, hard-edged grid with 2px rules instead of soft cards — no stock photos, no template look. |
| **Creativity** | Dual-read raccoon/house logo; annotated roof-assembly cutaway as the hero; interactive before/after storm-damage slider built from one shared SVG symbol; pitch-angled section edge. |
| **Usability** | Sticky nav with persistent phone number and CTA, one-thumb mobile menu, FAQ accordions, inline-validating form, obvious conversion paths throughout. |
| **Content** | Real services, mission, credentials, service areas, and honest FAQ answers a homeowner actually has mid-claim. |
| **Accessibility** | Semantic landmarks, skip link, focus-visible styles, keyboard-operable slider (native range input) and accordions (native `details`), AA contrast throughout, `prefers-reduced-motion` respected, content never hidden if JS fails. |
| **Performance** | ~200 KB total page weight, zero third-party requests, self-hosted variable fonts (preloaded, `font-display: swap`), SVG-only graphics, vanilla JS (~4 KB). |
| **SEO / sharing** | Meta + Open Graph + Twitter cards, canonical URL, JSON-LD `RoofingContractor` schema with both locations, custom 1200×630 share image. |

## Before launch — replace the placeholders

1. **Testimonials** (`#reviews`) are plausible placeholders — swap in verified customer
   reviews (Google / BBB / GuildQuality) and real attributions.
2. **License number** — footer says “Illinois Licensed Roofing Contractor”; add the
   actual IL license number.
3. **Contact form** currently opens the visitor's mail client prefilled (no backend on a
   static host). Wire `js/main.js` to a form endpoint (Formspree, Netlify Forms, or the
   company's CRM) — the submit handler is clearly marked.
4. **Photography** — the illustration-first design stands on its own, but real project
   photos can drop into the reviews and standard sections if desired.
5. Verify the **Spring, TX** street address and add it to the JSON-LD when confirmed.

## Notes for future maintainers

- The before/after slider shares one SVG symbol between both panes. Its styles are
  written against `#art-defs` (where the artwork really lives) because class selectors
  cannot reach into a `<use>` shadow tree; per-pane theming rides on inherited
  `--art-*` custom properties, which can.
- `assets/og.png` is rendered from `assets/og-source.html` at exactly 1200×630
  (e.g. a headless Chromium screenshot).
