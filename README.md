# Raccoon Restoration — Website Redesign

A ground-up redesign of [raccoonrestoration.com](https://www.raccoonrestoration.com/) for
**Raccoon Restoration** of Barrington, IL & Spring, TX — storm damage restoration, roofing,
and insurance claim advocacy.

## Design concept: “The Craftsman's Ledger”

Instead of the generic blue-and-red contractor template, the site is designed like a
beautifully set field ledger — the document a master craftsman would actually keep:

- **Palette** — warm paper `#F7F2E9`, ink `#1B1610`, copper flashing `#A24E1B`
  (the metal on a well-built roof), and deep pine `#1F3830` for the contact section.
- **Typography** — [Fraunces](https://fonts.google.com/specimen/Fraunces) variable serif for
  display (self-hosted), [Inter](https://fonts.google.com/specimen/Inter) for text, system
  monospace for eyebrow labels, plate captions, and numbering.
- **Identity** — a custom mark that is simultaneously a raccoon face and a twin-gabled
  house (`assets/logo.svg`, `assets/favicon.svg`), plus hand-drawn SVG architectural
  line art used in the hero “plate” and the interactive before/after slider.
- **Voice** — confident, plain-spoken copy built around the company's real mission
  statement (“gold standard in craftsmanship, integrity, innovative technology, and
  customer care”) and their differentiator: pairing public adjusting with trade work.

## Structure

```
index.html          single-page site (semantic, landmarked, JSON-LD LocalBusiness schema)
css/styles.css      design system: fluid type/space scale, components, responsive rules
css/fonts.css       self-hosted @font-face declarations
js/main.js          progressive enhancement only (page fully works with JS disabled)
assets/fonts/       Fraunces + Inter variable woff2 (latin subsets, ~197 KB total)
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
| **Design** | Distinct art direction (paper/ink/copper), editorial numbered sections, letterpress-style offset shadows, custom illustration — no stock photos, no template look. |
| **Creativity** | Dual-read raccoon/house logo; “Plate 01” framed hero drawing; interactive before/after storm-damage slider built from one shared SVG symbol. |
| **Usability** | Sticky condensed nav, one-thumb mobile menu, obvious CTAs (call / free inspection), FAQ accordions, form that validates inline. |
| **Content** | Real services, mission, credentials, service areas, and honest FAQ answers a homeowner actually has mid-claim. |
| **Accessibility** | Semantic landmarks, skip link, focus-visible styles, keyboard-operable slider (native range input) and accordions (native `details`), AA contrast, `prefers-reduced-motion` respected everywhere, content never hidden if JS fails. |
| **Performance** | ~250 KB total page weight, zero third-party requests, self-hosted variable fonts (preloaded, `font-display: swap`), SVG-only graphics, vanilla JS (~4 KB). |
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
   photos can drop into the reviews/standard sections if desired.
5. Verify the **Spring, TX** street address and add it to the JSON-LD when confirmed.

## Regenerating the share image

`assets/og.png` is rendered from `assets/og-source.html` at exactly 1200×630
(e.g. headless Chromium screenshot).
