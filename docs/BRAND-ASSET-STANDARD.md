# Raccoon Restoration Brand Asset Standard

**Status:** Provisional production standard pending official source assets

**Scope:** Website, favicon/app icons, Open Graph images, and related digital derivatives

**Immutable visual reference:** [`assets/logo.png`](../assets/logo.png)

## 1. Locked identity decision

The crowned **RR** symbol and the **RACCOON RESTORATION™** wordmark shown in
`assets/logo.png` are the established production identity. The complete lockup is
immutable.

Do not redraw, reconstruct, typeset, trace, “clean up,” modernize, or otherwise
reinterpret any part of it. In particular, the earlier roadmap idea to create a custom
Raccoon Restoration wordmark is rejected. Supporting typography may evolve, but it must
never replace or imitate the wordmark contained in the approved logo.

Until the brand owner supplies authoritative source files, `assets/logo.png` is the
visual reference against which every digital use is reviewed.

## 2. Source-of-truth hierarchy

Use the first available item in this order:

1. Brand-owner-approved vector master and written brand standard.
2. Brand-owner-approved high-resolution raster master.
3. Current production reference: `assets/logo.png`.

The following are still requested from the brand owner:

- official vector full lockup (`.svg`, `.ai`, or `.eps`);
- official mark-only artwork;
- approved dark- and light-background variants;
- official color specification, including crown gold;
- clear-space rule;
- minimum digital and print sizes;
- trademark-placement guidance.

Current supporting assets are provisional:

- `assets/logo-mark.png` is a raster crop, not yet an independently approved mark-only
  logo.
- Any color sampled from `assets/logo.png` is provisional and must not be described as
  an official brand color until the brand owner approves it.

Do not manufacture a new mark-only, horizontal, monochrome, reversed, or
light-background lockup from the raster reference.

## 3. Approved current uses

Pending final brand approval, the following uses are approved for the website:

| Context | Approved asset | Conditions |
|---|---|---|
| Site header | `assets/logo.png` | Show the complete lockup on a dark background at a size where the symbol, wordmark, and trademark remain legible. |
| Footer or closing brand panel | `assets/logo.png` | Complete lockup only; preserve aspect ratio and clear visual separation from nearby text. |
| Structured data logo | `assets/logo.png` | Use the canonical production URL after deployment. |
| Open Graph composition | `assets/logo.png` | May be placed within a larger share image without altering the lockup. |
| Favicon/app-icon source | `assets/logo-mark.png`, provisionally | Use only as an interim derivative source while an official mark-only master is requested. |
| Internal review mockups | `assets/logo.png` | Label any derived mark or sampled color as provisional. |

Approval applies to placement, not alteration. All uses must preserve the source
artwork's aspect ratio, internal spacing, colors, and trademark.

## 4. Forbidden treatments

Never:

- redraw, trace, auto-vectorize, or recreate the logo with fonts or CSS;
- replace the wordmark with Archivo, Inter, or any other typeface;
- create a new “custom wordmark” or alternate crowned-RR symbol;
- crop the full lockup unless the brand owner has approved a separate mark-only asset;
- stretch, condense, skew, rotate, warp, outline, bevel, emboss, or add perspective;
- change the relative scale or position of the crown, RR symbol, roof-tool details,
  wordmark, or trademark;
- recolor individual logo parts or substitute an estimated gold;
- add gradients, shadows, glows, strokes, filters, texture, animation, or masks to the
  artwork;
- place copy, controls, patterns, or imagery inside its clear space;
- place it on a background that obscures its white, dark, or gold details;
- use a low-resolution derivative when the reference or an approved vector is
  available;
- present the provisional raster crop as an official standalone mark;
- use AI generation or image reconstruction to produce a “cleaner” version.

## 5. Clear space and minimum size

The brand owner has not yet supplied authoritative measurements. Do not invent them.

### Approval placeholders

| Rule | Approved value | Approved by | Date |
|---|---|---|---|
| Full-lockup clear space | **Pending** |  |  |
| Mark-only clear space | **Pending official mark-only asset** |  |  |
| Minimum digital width, full lockup | **Pending** |  |  |
| Minimum digital size, mark only | **Pending official mark-only asset** |  |  |
| Minimum print width | **Pending** |  |  |

Until values are approved:

- provide generous isolation around the full lockup;
- enlarge the header or brand area instead of squeezing the logo;
- reject any size where the wordmark or trademark becomes visually ambiguous at
  100% zoom on a standard-density display;
- do not infer a formal minimum-size rule from the current website implementation.

## 6. Background guidance

### Dark backgrounds

The current production reference is approved on the site's dark graphite background.
Use a flat, quiet surface with enough contrast for all white, dark, and gold details.
Avoid busy photography directly behind the lockup; use a solid panel or restrained
scrim when imagery is unavoidable.

### Light backgrounds

No official light-background version is currently available. Do not recolor or reverse
the reference to create one.

Until the brand owner supplies or approves a light-background asset:

- place the unchanged full lockup on an approved dark container;
- give the container sufficient padding and clear space;
- do not put the current artwork directly on white, concrete, or photography if any
  element loses definition.

### Functional accent colors

The website's bright hi-vis amber is a functional interface color, not automatically
the official logo gold. Keep interface tokens and brand colors separately named and
documented. A sampled crown color may be used only as a provisional design study until
the official specification is approved.

## 7. Favicon and app-icon derivatives

Favicons and small app icons cannot legibly carry the complete stacked lockup. The
current mark crop may serve as an interim source only.

Derivative rules:

- preserve the visible proportions and colors of the provisional mark crop;
- use a simple dark background with adequate edge padding;
- do not redraw small details for sharpness;
- do not add letters, borders, badges, or decorative effects;
- generate raster sizes from one reviewed high-resolution source;
- inspect, rather than merely generate, every required size;
- replace provisional derivatives when an official mark-only master arrives;
- keep PNG/ICO fallbacks because SVG favicon support and referenced external assets can
  vary.

Review at minimum:

- 16 × 16;
- 32 × 32;
- 180 × 180 Apple touch icon;
- 192 × 192 app icon, if shipped;
- 512 × 512 app icon.

At 16 and 32 pixels, recognizable silhouette and crown separation matter more than
preserving an unreadable wordmark. This exception permits use of the provisional crop;
it does not authorize a redesigned mark.

## 8. Open Graph and social derivatives

The Open Graph image is a composition containing the brand, not a replacement logo.

- Use the unchanged full lockup from `assets/logo.png`.
- Preserve its aspect ratio, colors, trademark, and clear visual isolation.
- Do not enlarge beyond the source resolution or apply sharpening that changes the
  artwork.
- Keep essential artwork and copy inside the platform-safe center area.
- Ensure the logo remains legible in both full-size and feed-thumbnail previews.
- Do not use AI-generated homes, crews, damage, or customers as brand proof.
- If a mark-only social avatar is needed, use the current crop only as a clearly
  provisional asset pending owner approval.
- Re-export every derivative from the official vector once it is supplied.

Required review sizes:

- 1200 × 630 Open Graph;
- 1:1 social/avatar crop, if used;
- platform-specific previews before publication.

## 9. Responsive visual QA

Review the real rendered site at the following authored viewports. Capture screenshots
with the same browser scale and compare them with the immutable reference.

### 390 px

- Full lockup or approved derivative is not clipped, distorted, or hidden.
- Wordmark and trademark remain legible at normal zoom; otherwise increase the
  allocation rather than altering the logo.
- Header controls do not enter the logo's provisional clear area.
- Sticky/scrolled header state does not cause a visible size jump or blur.
- High-DPI rendering is crisp.

### 834 px

- Full lockup retains its source aspect ratio.
- Navigation/menu controls remain visually separate.
- Dark background preserves white, dark, and gold details.
- The transition between default and compact header states remains stable.
- No unintended crop appears at landscape or portrait orientation.

### 1440 px

- Full lockup is neither undersized nor disproportionately dominant.
- Logo aligns intentionally with the container and navigation.
- There is no raster softness caused by CSS upscaling.
- Clear visual isolation remains consistent in the header, footer, and share-image
  composition.
- Structured-data and visible logo assets resolve to the canonical production files.

### Cross-viewport checks

- Compare default, sticky/scrolled, menu-open, reduced-motion, and 200% zoom states.
- Inspect Chrome, Safari, and Firefox.
- Check standard- and high-density displays.
- Confirm intrinsic `width`/`height` or `aspect-ratio` prevents layout shift.
- Verify that screenshot differences are limited to approved responsive scaling and
  placement, never changes to the artwork.

## 10. Asset acceptance checklist

Before a logo-related change ships:

- [ ] Asset came from the source-of-truth hierarchy.
- [ ] Full lockup matches `assets/logo.png` or a newer approved master.
- [ ] No unapproved redraw, crop, recolor, effect, or composition change exists.
- [ ] Aspect ratio is preserved.
- [ ] Background treatment is approved.
- [ ] Clear space and minimum-size requirements are met or explicitly awaiting approval.
- [ ] 390, 834, and 1440 screenshots pass.
- [ ] Default and sticky/scrolled states pass.
- [ ] Favicon/app derivatives pass native-size inspection.
- [ ] Open Graph image passes full-size and thumbnail review.
- [ ] Temporary raster crops and color samples remain labeled provisional.
- [ ] Approval is recorded below.

## 11. Ownership and approvals

| Responsibility | Name/role | Contact or record | Approval/date |
|---|---|---|---|
| Brand owner | **Pending** |  |  |
| Master-asset custodian | **Pending** |  |  |
| Website creative owner | **Pending** |  |  |
| Implementation owner | **Pending** |  |  |
| QA approver | **Pending** |  |  |
| Trademark/legal reviewer | **Pending, if required** |  |  |

### Asset approval record

| Asset/version | Intended use | Source | Approved by | Approval date | Recheck date |
|---|---|---|---|---|---|
| `assets/logo.png` | Current visual reference and full digital lockup | Production website | **Pending formal confirmation** |  |  |
| `assets/logo-mark.png` | Interim favicon/app derivative source | Raster crop of current reference | **Provisional only** |  |  |
| Official vector full lockup | Replace raster reference where appropriate | **Requested** |  |  |  |
| Official mark-only asset | Favicons, app icons, avatars | **Requested** |  |  |  |
| Official color specification | Brand tokens and production exports | **Requested** |  |  |  |

Any newer approved master supersedes the current provisional reference. Record the
change, regenerate affected derivatives, and repeat the responsive visual QA before
release.
