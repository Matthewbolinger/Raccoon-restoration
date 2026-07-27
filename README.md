# Raccoon Restoration — Website Redesign

A ground-up redesign of [raccoonrestoration.com](https://www.raccoonrestoration.com/)
for Raccoon Restoration’s roofing, storm-restoration, exterior, and interior services.
Planned market and service-area wording remains held until the owner verifies it.

## Current status

The repository is a **locally validated release candidate for the code-controllable
scope**. It is ready for stakeholder and staging review, not an unconditional
production launch.

The current build:

- preserves the established crowned-RR logo and wordmark;
- removes fictional testimonials and unsupported statistics;
- keeps claim-adjusting and legal representations out of public copy;
- holds local-business structured data until the legal entity and public facts are
  verified;
- uses an explicit email-client handoff until a durable lead endpoint is approved;
- makes reveal motion fail open if JavaScript enhancement cannot initialize;
- uses a compact responsive service register, a static mobile restoration comparison,
  and the desktop-only Storm Sequence;
- provides a deterministic four-route Groundline action brief without diagnosing,
  clearing, or making a coverage decision; and
- records every blocked fact and owner decision in
  [`docs/TRUTH-REGISTER.md`](docs/TRUTH-REGISTER.md) and
  [`docs/OWNER-INPUTS.md`](docs/OWNER-INPUTS.md).

## Design concept: “Storm & Structure”

The visual system is substantial and engineered: wet-slate graphite, concrete, a
single hi-vis amber accent, hard-edged rules, and technical line drawings rather than
a generic contractor template.

- **Typography** — self-hosted Archivo for display and Inter for body copy.
- **Hero illustration** — a labeled roof-assembly cross-section drawn to an 8:12 pitch.
- **Roof-pitch motif** — the contact section uses a pitched top edge.
- **Identity** — the production crowned-RR lockup is used as one unmodified image.
  See [`docs/BRAND-ASSET-STANDARD.md`](docs/BRAND-ASSET-STANDARD.md) for the provisional
  rules and the official source assets still required from the owner.

## The Storm Sequence

The signature interaction is a four-act Canvas 2D narrative:
**calm → storm → scope → restored**.

The storm scene builds into a contractor repair scope and then reconstructs the roof
assembly. It is progressive enhancement: the static comparison and real text remain
available without canvas, with reduced motion, with Save-Data, or without JavaScript.

## Structure

```text
index.html          single-page site with semantic landmarks; local schema held
404.html            designed not-found page
css/styles.css      design system, components, and responsive rules
css/fonts.css       self-hosted font declarations
js/main.js          nav, fail-open reveals, contact validation, and Groundline
js/storm.js         progressive Storm Sequence canvas narrative
assets/fonts/       self-hosted Archivo and Inter variable fonts
assets/             production logo reference, provisional icon set, and social card
docs/               truth register, owner-input checklist, and brand-asset standard
tests/              Playwright regression and accessibility suite
robots.txt · sitemap.xml · site.webmanifest
```

No application build step or frontend framework is required.

```bash
npm ci
npm start
```

Then open `http://localhost:8000`.

## Tests

The Playwright suite guards:

- console/page errors and horizontal overflow at multiple viewports;
- initial form-error visibility and accessible field validation;
- required phone-or-email contact information;
- the honest email-client delivery state;
- no fictional reviews, unsupported claims, or speculative schema;
- no-JavaScript content visibility and reveal fail-open behavior;
- reduced-motion and Storm Sequence enhancement gates;
- mobile navigation focus handling and non-overlapping tap-to-call behavior;
- the responsive seven-service rail and all four Groundline result routes;
- live breakpoint changes, deep links, no-JavaScript alternatives, and menu cleanup;
- trim-aware contact validation, sensible phone digits, and mailto size limits;
- scroll-height, first-load payload, social metadata, and verified-credential guards;
- launch assets, structured-data quarantine, and axe-core coverage across key states.

```bash
npm ci
npx playwright install chromium firefox webkit
npm test
```

The current local gate is **77/77 checks passing** across Chromium, Firefox, and
WebKit. CI uses the committed lockfile and runs the same browser coverage on every
push and pull request.

## Contact behavior

The current form does not claim to submit data to a server. After validation, it opens
a prefilled message in the visitor’s email application and states that nothing was
sent from the page. Replace this interim handoff only after the CRM owner approves a
durable, monitored endpoint with truthful success, failure, retry, privacy, and
retention behavior.

## Groundline brief

Groundline is a browser-only observation brief. It turns selected visible conditions
into one of four deterministic, non-diagnostic action plans that can be copied or moved
into the email request. It sends no data, invents no weather history, makes no insurance
or service-area determination, and keeps a direct phone path visible.

## Production gates

Do not deploy as the production site until:

1. the owner-input blockers are answered with evidence;
2. legal identity, licenses, locations, hours, service areas, and operating promises
   are approved;
3. the official vector logo, mark-only asset, colors, and derivative permissions are
   supplied or the provisional raster use is explicitly approved;
4. a real lead-delivery path passes success, failure, duplicate, retry, and routing
   tests;
5. privacy and contact-consent wording is approved;
6. real project media and reviews have source records and reuse permission; and
7. manual assistive-technology and representative-device QA is recorded; and
8. staging and production performance, routing, monitoring, rollback, SEO, and launch
   QA gates pass.

Anything still marked `pending` or `quarantined` in the Truth Register stays out of
public copy and structured data.

## Notes for maintainers

- The before/after slider shares one SVG symbol between both panes. Per-pane theming
  uses inherited `--art-*` custom properties and simple class selectors that remain
  valid in the generated `<use>` instance tree.
- `assets/og.png` is rendered from `assets/og-source.html` at 1200 × 630.
- `js/storm.js` draws in a fixed 760 × 560 virtual space and maps it to the live canvas
  in `resize()`.
- The logo remains the exact stacked production lockup. Do not re-typeset its wordmark
  or redraw the mark.
