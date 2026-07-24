/* ===========================================================================
   Regression guards for the Raccoon Restoration site.

   Every assertion here corresponds to a defect that was found and fixed —
   the point is that none of them can come back silently.

   Run:  node tests/run.mjs
   Requires: a static server on http://127.0.0.1:8899 (run.mjs starts one),
             playwright, and optionally axe-core for the a11y suite.
   =========================================================================== */

export const BASE = 'http://127.0.0.1:8899';

export const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 900 },
};

export function makeTests({ chromium, axePath }) {
  const tests = [];
  const test = (name, fn) => tests.push({ name, fn });

  /* ---- no console errors anywhere ---- */
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test(`no console or page errors at ${label}`, async (browser) => {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.close();
      if (errors.length) throw new Error(errors.join('\n'));
    });

    /* ---- no horizontal overflow (the marquee must stay clipped) ---- */
    test(`no horizontal overflow at ${label}`, async (browser) => {
      const page = await browser.newPage({ viewport });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const { sw, cw } = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      await page.close();
      if (sw > cw) throw new Error(`scrollWidth ${sw} > clientWidth ${cw}`);
    });
  }

  /* ---- contact form must stay inside its card (was overflowing 47px) ---- */
  test('contact form controls stay within the card padding', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.getElementById('contact').scrollIntoView());
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const card = document.querySelector('.contact-form');
      const c = card.getBoundingClientRect();
      const widest = [...card.querySelectorAll('input, select, textarea, button')]
        .reduce((max, el) => Math.max(max, el.getBoundingClientRect().right), 0);
      const firstLeft = card.querySelector('input').getBoundingClientRect().left;
      return { cardRight: c.right, cardLeft: c.left, widest, firstLeft };
    });
    await page.close();
    const padLeft = m.firstLeft - m.cardLeft;
    const padRight = m.cardRight - m.widest;
    if (m.widest > m.cardRight) throw new Error(`control overflows card by ${(m.widest - m.cardRight).toFixed(1)}px`);
    if (Math.abs(padLeft - padRight) > 6) {
      throw new Error(`asymmetric padding: left ${padLeft.toFixed(1)}px vs right ${padRight.toFixed(1)}px`);
    }
  });

  /* ---- hero roof must be drawn at the pitch its caption claims ---- */
  test('hero roof geometry matches its 8:12 caption', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const pts = await page.evaluate(() => {
      const p = document.querySelector('.lyr-shingle').getAttribute('points');
      return p.trim().split(/\s+/).slice(0, 2).map((pair) => pair.split(',').map(Number));
    });
    await page.close();
    const [[x1, y1], [x2, y2]] = pts;
    const ratio = (Math.abs(y1 - y2) / Math.abs(x2 - x1)) * 12;
    if (Math.abs(ratio - 8) > 0.15) {
      throw new Error(`roof drawn at ${ratio.toFixed(2)}:12 but captioned 8:12`);
    }
  });

  /* ---- the slider must not swallow vertical scrolling on touch ---- */
  test('before/after slider allows vertical panning', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.mobile, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const touchAction = await page.evaluate(() =>
      getComputedStyle(document.getElementById('ba-range')).touchAction);
    await page.close();
    if (touchAction === 'none') throw new Error('touch-action:none re-introduces the scroll trap');
  });

  /* ---- slider announcement must describe what is actually on screen ---- */
  test('slider announces restored/damaged in the right direction', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const text = await page.evaluate(() => {
      const r = document.getElementById('ba-range');
      r.value = 20; r.dispatchEvent(new Event('input'));
      return r.getAttribute('aria-valuetext');
    });
    await page.close();
    // --cut is the left inset on the damaged pane: value 20 => 80% damage visible
    if (!/20%\s*restored/i.test(text) || !/80%\s*storm-damaged/i.test(text)) {
      throw new Error(`aria-valuetext misreports the view: "${text}"`);
    }
  });

  /* ---- Storm Sequence enhancement gates ---- */
  test('storm sequence enhances in when supported', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const s = await page.evaluate(() => ({
      live: document.querySelector('.storm').classList.contains('is-live'),
      trackHidden: document.querySelector('.storm-track').hidden,
      canvasSized: document.getElementById('storm-canvas').width > 0,
    }));
    await page.close();
    if (!s.live || s.trackHidden || !s.canvasSized) throw new Error(JSON.stringify(s));
  });

  test('storm sequence yields to reduced motion', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const s = await page.evaluate(() => ({
      live: document.querySelector('.storm').classList.contains('is-live'),
      trackHidden: document.querySelector('.storm-track').hidden,
      staticShown: getComputedStyle(document.querySelector('.storm-static')).display !== 'none',
      sliderUsable: !!document.getElementById('ba-range'),
    }));
    await page.close();
    if (s.live || !s.trackHidden || !s.staticShown || !s.sliderUsable) throw new Error(JSON.stringify(s));
  });

  test('storm sequence holds 55fps or better', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    const top = await page.locator('.storm-track').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((v) => window.scrollTo(0, v + 1200), top);
    await page.waitForTimeout(400);
    const fps = await page.evaluate(() => new Promise((res) => {
      let n = 0; const t0 = performance.now();
      (function tick() {
        n++;
        if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
        else res(Math.round(n / ((performance.now() - t0) / 1000)));
      })();
    }));
    await page.close();
    if (fps < 55) throw new Error(`storm act ran at ${fps}fps`);
  });

  /* ---- mobile conversion affordances ---- */
  test('mobile keeps tap-to-call and the CTA reachable', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.mobile });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const bar = await page.evaluate(() => {
      const el = document.getElementById('call-bar');
      const phone = el.querySelector('a[href^="tel:"]');
      const cta = el.querySelector('a[href="#contact"]');
      const r = phone.getBoundingClientRect();
      return { display: getComputedStyle(el).display, hasPhone: !!phone, hasCta: !!cta, height: r.height };
    });
    await page.close();
    if (bar.display === 'none' || !bar.hasPhone || !bar.hasCta) throw new Error(JSON.stringify(bar));
    if (bar.height < 44) throw new Error(`call target only ${bar.height}px tall`);
  });

  /* ---- mobile menu focus management (WCAG 2.2 2.4.11) ---- */
  test('mobile menu traps focus and restores it on close', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.mobile });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.click('.nav-toggle');
    await page.waitForTimeout(350);
    const inert = await page.evaluate(() => document.getElementById('main').hasAttribute('inert'));
    for (let i = 0; i < 14; i++) await page.keyboard.press('Tab');
    const inside = await page.evaluate(() =>
      !!document.activeElement.closest('#mobile-menu, .nav-toggle'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    const restored = await page.evaluate(() => ({
      onToggle: document.activeElement === document.querySelector('.nav-toggle'),
      inertCleared: !document.getElementById('main').hasAttribute('inert'),
    }));
    await page.close();
    if (!inert) throw new Error('page not marked inert while the overlay is open');
    if (!inside) throw new Error('focus escaped the overlay');
    if (!restored.onToggle) throw new Error('focus not returned to the toggle on Escape');
    if (!restored.inertCleared) throw new Error('inert not cleared on close');
  });

  /* ---- form validation surfaces per-field, not colour-only ---- */
  test('form reports errors per field with aria wiring', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.getElementById('contact-form')
      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })));
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => {
      const name = document.getElementById('f-name');
      const err = document.getElementById('e-name');
      return {
        ariaInvalid: name.getAttribute('aria-invalid'),
        described: name.getAttribute('aria-describedby'),
        errVisible: err && !err.hidden,
        errText: err ? err.textContent.trim().length : 0,
      };
    });
    await page.close();
    if (state.ariaInvalid !== 'true') throw new Error('aria-invalid not set on the empty required field');
    if (!state.errVisible || !state.errText) throw new Error('no visible per-field error text');
    if (!state.described) throw new Error('field not wired to its error via aria-describedby');
  });

  /* ---- Storm Check honesty + behaviour ---- */
  test('storm check returns a verdict and never invents storm history', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.fill('#c-zip', '60010');
    await page.check('input[value="old"]');
    await page.check('input[value="interior"]');
    await page.click('#check-tool button[type=submit]');
    await page.waitForTimeout(400);
    const out = await page.evaluate(() => {
      const r = document.getElementById('check-result');
      return { text: r.textContent, live: r.getAttribute('aria-live'), hasCta: !!r.querySelector('a[href="#contact"]') };
    });
    await page.close();
    if (!/inspection/i.test(out.text)) throw new Error('no verdict rendered');
    if (out.live !== 'polite') throw new Error('result is not announced to assistive tech');
    if (!out.hasCta) throw new Error('result offers no next step');
    if (!/guide based on what you told us/i.test(out.text)) throw new Error('missing the honesty disclaimer');
    // must not fabricate dated hail events
    if (/\b(19|20)\d{2}\b/.test(out.text.replace(/\(224\)\s*500-6825/g, ''))) {
      throw new Error('output contains what looks like fabricated event dates');
    }
  });

  /* ---- content must not be hidden if JS fails ---- */
  test('content is visible with JavaScript disabled', async (browser) => {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    const vis = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.reveal')];
      const hidden = els.filter((e) => getComputedStyle(e).opacity === '0').length;
      return { total: els.length, hidden, formAction: document.getElementById('contact-form').getAttribute('action') };
    });
    await ctx.close();
    if (vis.hidden > 0) throw new Error(`${vis.hidden}/${vis.total} revealed blocks hidden without JS`);
    if (!vis.formAction) throw new Error('form has no non-JS action');
  });

  /* ---- launch pack ---- */
  test('launch pack files are served', async (browser) => {
    const page = await browser.newPage();
    const missing = [];
    for (const path of ['/robots.txt', '/sitemap.xml', '/site.webmanifest', '/404.html',
                        '/assets/favicon.svg', '/assets/apple-touch-icon.png', '/assets/og.png']) {
      const res = await page.goto(BASE + path);
      if (!res || res.status() >= 400) missing.push(`${path} -> ${res ? res.status() : 'no response'}`);
    }
    await page.close();
    if (missing.length) throw new Error(missing.join(', '));
  });

  /* ---- structured data must parse ---- */
  test('both JSON-LD blocks parse and declare the right types', async (browser) => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const types = await page.evaluate(() =>
      [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map((s) => { try { return JSON.parse(s.textContent)['@type']; } catch { return 'PARSE_ERROR'; } }));
    await page.close();
    if (types.includes('PARSE_ERROR')) throw new Error('a JSON-LD block does not parse');
    if (!types.includes('RoofingContractor') || !types.includes('FAQPage')) {
      throw new Error(`unexpected schema types: ${types.join(', ')}`);
    }
  });

  /* ---- axe-core across the states that matter ---- */
  if (axePath) {
    const states = [
      ['desktop', { viewport: VIEWPORTS.desktop }, null],
      ['mobile', { viewport: VIEWPORTS.mobile }, null],
      ['mobile menu open', { viewport: VIEWPORTS.mobile }, '.nav-toggle'],
      ['reduced motion', { viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' }, null],
    ];
    for (const [label, opts, click] of states) {
      test(`axe: zero violations (${label})`, async (browser) => {
        const page = await browser.newPage(opts);
        await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        if (click) { await page.click(click); await page.waitForTimeout(350); }
        await page.addScriptTag({ path: axePath });
        const violations = await page.evaluate(async () => {
          const r = await window.axe.run(document, {
            runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
          });
          return r.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`);
        });
        await page.close();
        if (violations.length) throw new Error(violations.join('; '));
      });
    }
    test('axe: zero violations (404 page)', async (browser) => {
      const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
      await page.goto(`${BASE}/404.html`, { waitUntil: 'networkidle' });
      await page.addScriptTag({ path: axePath });
      const violations = await page.evaluate(async () => {
        const r = await window.axe.run(document, {
          runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
        });
        return r.violations.map((v) => `${v.id} (${v.impact})`);
      });
      await page.close();
      if (violations.length) throw new Error(violations.join('; '));
    });
  }

  return tests;
}
