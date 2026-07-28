/* ===========================================================================
   Regression guards for the Raccoon Restoration site.

   Every assertion here corresponds to a defect that was found and fixed —
   the point is that none of them can come back silently.

   Run:  node tests/run.mjs
   Requires: Playwright and axe-core. run.mjs reserves a fresh local port and
             starts this repository's static server for the suite.
   =========================================================================== */

export const BASE = process.env.TEST_BASE || 'http://127.0.0.1:8899';

export const VIEWPORTS = {
  reflow: { width: 320, height: 800 },
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

    /* ---- no clipped reflow content (overflow-x:clip can mask scrollWidth) ---- */
    test(`no horizontal overflow at ${label}`, async (browser) => {
      const page = await browser.newPage({ viewport });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const state = await page.evaluate(() => {
        const width = window.innerWidth;
        const offenders = [...document.body.querySelectorAll('*')]
          .filter((el) => {
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            if (el.closest('.marquee, #art-defs, .mobile-menu[hidden]')) return false;
            // The service cards deliberately extend inside their own horizontal
            // scroller at mobile/tablet widths; the rail itself must still fit.
            if (width <= 940 && el.closest('#services-list') && el.id !== 'services-list') return false;
            const rect = el.getBoundingClientRect();
            if (!rect.width || !rect.height) return false;
            return rect.left < -1 || rect.right > width + 1;
          })
          .slice(0, 12)
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return `${el.tagName.toLowerCase()}.${el.className || ''} [${rect.left.toFixed(1)}, ${rect.right.toFixed(1)}]`;
          });
        return {
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          offenders,
        };
      });
      await page.close();
      if (state.documentWidth > state.clientWidth + 1 ||
          state.bodyWidth > state.clientWidth + 1 ||
          state.offenders.length) {
        throw new Error(JSON.stringify(state));
      }
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

  test('200% text zoom preserves reflow and operable controls', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.mobile, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => {
      const clipped = [...document.querySelectorAll('button, .btn, input, select, textarea, summary')]
        .filter((el) => getComputedStyle(el).display !== 'none')
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.id || el.className || el.textContent.trim().slice(0, 30));
      return {
        documentWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        clipped,
        nameVisible: document.getElementById('f-name').getBoundingClientRect().width > 0,
        groundlineVisible: document.querySelector('#check-tool button[type="submit"]')
          .getBoundingClientRect().height >= 44,
      };
    });
    await page.close();
    if (state.documentWidth > state.clientWidth || state.clipped.length ||
        !state.nameVisible || !state.groundlineVisible) {
      throw new Error(JSON.stringify(state));
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
    if (!/20%\s*illustrated restored/i.test(text) ||
        !/80%\s*illustrated storm condition/i.test(text)) {
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
      staticHidden: getComputedStyle(document.querySelector('.storm-static')).display === 'none',
    }));
    await page.close();
    if (!s.live || s.trackHidden || !s.canvasSized || !s.staticHidden) {
      throw new Error(JSON.stringify(s));
    }
  });

  test('storm canvas never allocates below the desktop breakpoint', async (browser) => {
    for (const [label, viewport] of Object.entries({
      reflow: VIEWPORTS.reflow,
      mobile: VIEWPORTS.mobile,
      tablet: VIEWPORTS.tablet,
    })) {
      const page = await browser.newPage({ viewport });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const state = await page.evaluate(() => {
        const canvas = document.getElementById('storm-canvas');
        return {
          live: document.querySelector('.storm').classList.contains('is-live'),
          trackHidden: document.querySelector('.storm-track').hidden,
          width: canvas.width,
          height: canvas.height,
          staticShown: getComputedStyle(document.querySelector('.storm-static')).display !== 'none',
        };
      });
      await page.close();
      if (state.live || !state.trackHidden || state.width || state.height || !state.staticShown) {
        throw new Error(`${label}: ${JSON.stringify(state)}`);
      }
    }
  });

  test('desktop-only Storm renderer is not downloaded by mobile or reduced-motion visitors', async (browser) => {
    for (const [label, options, expected] of [
      ['mobile', { viewport: VIEWPORTS.mobile }, false],
      ['reduced motion', { viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' }, false],
      ['desktop', { viewport: VIEWPORTS.desktop }, true],
    ]) {
      const page = await browser.newPage(options);
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(250);
      const state = await page.evaluate(() => ({
        rendererRequests: performance.getEntriesByType('resource')
          .filter((entry) => /\/js\/storm\.js(?:$|\?)/.test(entry.name)).length,
        rendererNode: document.querySelectorAll('script[data-storm-renderer]').length,
        live: document.querySelector('.storm').classList.contains('is-live'),
      }));
      await page.close();
      const loaded = state.rendererRequests > 0 && state.rendererNode === 1 && state.live;
      if (loaded !== expected ||
          (!expected && (state.rendererRequests || state.rendererNode || state.live))) {
        throw new Error(`${label}: ${JSON.stringify(state)}`);
      }
    }
  });

  test('storm enhancement follows live breakpoint changes in both directions', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    const readState = () => page.evaluate(() => {
      const canvas = document.getElementById('storm-canvas');
      return {
        live: document.querySelector('.storm').classList.contains('is-live'),
        trackHidden: document.querySelector('.storm-track').hidden,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        staticShown: getComputedStyle(document.querySelector('.storm-static')).display !== 'none',
      };
    });
    const desktopInitial = await readState();
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(350);
    const tablet = await readState();
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(350);
    const desktopAgain = await readState();
    await page.close();

    if (!desktopInitial.live || desktopInitial.trackHidden || !desktopInitial.canvasWidth ||
        tablet.live || !tablet.trackHidden || tablet.canvasWidth || tablet.canvasHeight ||
        !tablet.staticShown || !desktopAgain.live || desktopAgain.trackHidden ||
        !desktopAgain.canvasWidth || desktopAgain.staticShown) {
      throw new Error(JSON.stringify({ desktopInitial, tablet, desktopAgain }));
    }
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

  // Sampled at the STORM PEAK (p~0.46: ~164 raindrops, 34 hailstones, tabs in
  // flight) under 4x CPU throttling — a mid-scroll frame on an unthrottled
  // desktop proves nothing about the frame the sequence actually has to hold.
  test('storm sequence holds 45fps at peak load under 4x CPU throttle', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    const t = await page.locator('.storm-track').evaluate((el) => ({
      top: el.getBoundingClientRect().top + window.scrollY, h: el.offsetHeight,
    }));
    const vh = VIEWPORTS.desktop.height;
    await page.evaluate((v) => window.scrollTo(0, v), t.top + (t.h - vh) * 0.46);
    await page.waitForTimeout(500);
    let cdp = null;
    try {
      cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    } catch { /* non-Chromium: measure unthrottled rather than skipping */ }
    const fps = await page.evaluate(() => new Promise((res) => {
      let n = 0; const t0 = performance.now();
      (function tick() {
        n++;
        if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
        else res(Math.round(n / ((performance.now() - t0) / 1000)));
      })();
    }));
    if (cdp) { try { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); } catch {} }
    await page.close();
    /* 45 under 4x CPU throttle at the heaviest frame, not 60: the sequence is
       fill-rate bound, so the adaptive tier drops raster resolution to hold a
       usable rate rather than pretending weak hardware runs at 60. Unthrottled
       desktop measures ~61. */
    if (fps < 45) throw new Error(`storm peak ran at ${fps}fps under 4x throttle`);
  });

  test('adaptive quality engages under load', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    const t = await page.locator('.storm-track').evaluate((el) => ({
      top: el.getBoundingClientRect().top + window.scrollY, h: el.offsetHeight,
    }));
    const before = await page.evaluate(() => document.getElementById('storm-canvas').width);
    let cdp = null;
    try {
      cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 8 });
    } catch { /* skip on non-Chromium */ }
    await page.evaluate((v) => window.scrollTo(0, v), t.top + (t.h - VIEWPORTS.desktop.height) * 0.46);
    await page.waitForTimeout(3000);
    const after = await page.evaluate(() => document.getElementById('storm-canvas').width);
    if (cdp) { try { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); } catch {} }
    await page.close();
    if (!cdp) return;                       // cannot throttle: nothing to assert
    if (after >= before) {
      throw new Error(`backing store stayed at ${after}px under 8x throttle — adaptive tier never engaged`);
    }
  });

  test('local lab LCP and CLS stay inside release budgets', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.addInitScript(() => {
      window.__testCls = 0;
      window.__testLcp = 0;
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) window.__testCls += entry.value;
        });
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const latest = entries[entries.length - 1];
        if (latest) window.__testLcp = latest.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const metrics = await page.evaluate(() => ({
      lcp: window.__testLcp,
      cls: window.__testCls,
    }));
    await page.close();
    if (!metrics.lcp || metrics.lcp > 2000 || metrics.cls > 0.05) {
      throw new Error(`local lab metrics: ${JSON.stringify(metrics)}`);
    }
  });

  /* ---- mobile conversion affordances ---- */
  test('mobile keeps a 44px tap-to-call target in the sticky header', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.mobile });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => {
      const phone = document.querySelector('.header-call-icon');
      const rect = phone.getBoundingClientRect();
      const heroCall = document.querySelector('.hero-ctas a[href^="tel:"]');
      return {
        href: phone.getAttribute('href'),
        display: getComputedStyle(phone).display,
        width: rect.width,
        height: rect.height,
        heroCall: heroCall && heroCall.getAttribute('href'),
        obsoleteBar: !!document.getElementById('call-bar'),
      };
    });
    await page.close();
    if (state.display === 'none' || state.href !== 'tel:+12245006825' ||
        state.heroCall !== 'tel:+12245006825' || state.obsoleteBar) {
      throw new Error(JSON.stringify(state));
    }
    if (state.width < 44 || state.height < 44) {
      throw new Error(`header call target is only ${state.width}×${state.height}`);
    }
  });

  test('no non-modal fixed control can cover page content', async (browser) => {
    for (const [label, viewport] of Object.entries({
      reflow: VIEWPORTS.reflow,
      mobile: VIEWPORTS.mobile,
      tablet: VIEWPORTS.tablet,
    })) {
      const page = await browser.newPage({ viewport });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      const fixed = await page.evaluate(() =>
        [...document.body.querySelectorAll('*')]
          .filter((el) => {
            const style = getComputedStyle(el);
            if (style.position !== 'fixed' || style.display === 'none' ||
                style.visibility === 'hidden' || style.opacity === '0') return false;
            if (el.matches('.skip-link') || el.closest('.mobile-menu[hidden]')) return false;
            return el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
          })
          .map((el) => el.id || el.className || el.tagName));
      await page.close();
      if (fixed.length) throw new Error(`${label}: visible fixed controls: ${fixed.join(', ')}`);
    }
  });

  test('responsive service register exposes all seven services and working controls', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.mobile, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.locator('#services').scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const status = document.getElementById('services-rail-status');
      window.__serviceStatusMutations = 0;
      new MutationObserver(() => { window.__serviceStatusMutations++; })
        .observe(status, { childList: true, characterData: true, subtree: true });
    });
    const initial = await page.evaluate(() => {
      const rail = document.getElementById('services-list');
      const active = rail.querySelector('.service-card');
      const railRect = rail.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      return {
        cards: rail.querySelectorAll('.service-card').length,
        description: rail.getAttribute('aria-roledescription'),
        tabIndex: rail.getAttribute('tabindex'),
        status: document.getElementById('services-rail-status').textContent,
        prevDisabled: document.getElementById('services-prev').disabled,
        controls: [...document.querySelectorAll('.services-rail-button')]
          .map((button) => button.getBoundingClientRect())
          .map((rect) => ({ width: rect.width, height: rect.height })),
        initialHeightGap: railRect.height - activeRect.height,
      };
    });
    await page.click('#services-next');
    await page.waitForTimeout(700);
    const afterButton = await page.textContent('#services-rail-status');
    await page.focus('#services-list');
    await page.keyboard.press('End');
    await page.waitForTimeout(700);
    const afterKeyboard = await page.textContent('#services-rail-status');
    const final = await page.evaluate(() => {
      const rail = document.getElementById('services-list');
      const card = rail.querySelectorAll('.service-card')[6];
      return {
        mutations: window.__serviceStatusMutations,
        finalHeightGap: rail.getBoundingClientRect().height - card.getBoundingClientRect().height,
      };
    });
    await page.close();

    if (initial.cards !== 7 || initial.description !== 'carousel' || initial.tabIndex !== '0' ||
        !/service 1 of 7/i.test(initial.status) || !initial.prevDisabled) {
      throw new Error(JSON.stringify(initial));
    }
    if (initial.controls.some((rect) => rect.width < 44 || rect.height < 44)) {
      throw new Error(`undersized service controls: ${JSON.stringify(initial.controls)}`);
    }
    if (initial.initialHeightGap < 0 || initial.initialHeightGap > 24 ||
        final.finalHeightGap < 0 || final.finalHeightGap > 24) {
      throw new Error(`service rail does not fit its active card: ${JSON.stringify({ initial, final })}`);
    }
    if (!/service 2 of 7/i.test(afterButton) || !/service 7 of 7/i.test(afterKeyboard)) {
      throw new Error(`service navigation failed: ${afterButton} / ${afterKeyboard}`);
    }
    if (final.mutations > 4) {
      throw new Error(`service live region chattered ${final.mutations} times`);
    }
  });

  test('contact hash navigation clears the sticky header', async (browser) => {
    for (const [label, viewport] of Object.entries({
      mobile: VIEWPORTS.mobile,
      tablet: VIEWPORTS.tablet,
      desktop: VIEWPORTS.desktop,
    })) {
      for (const target of ['contact', 'groundline']) {
        const page = await browser.newPage({ viewport });
        await page.goto(`${BASE}/index.html#${target}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(700);
        const state = await page.evaluate((id) => {
          const section = document.getElementById(id);
          const heading = section.querySelector('h2');
          return {
            headerBottom: document.querySelector('.site-header').getBoundingClientRect().bottom,
            headingTop: heading.getBoundingClientRect().top,
            headingBottom: heading.getBoundingClientRect().bottom,
            viewportHeight: window.innerHeight,
          };
        }, target);
        await page.close();
        if (state.headingTop < state.headerBottom || state.headingBottom > state.viewportHeight) {
          throw new Error(`${label} #${target}: ${JSON.stringify(state)}`);
        }
      }
    }
  });

  /* ---- mobile menu focus management (WCAG 2.2 2.4.11) ---- */
  test('menu is modal at mobile and tablet widths', async (browser) => {
    for (const [label, viewport] of Object.entries({
      mobile: VIEWPORTS.mobile,
      tablet: VIEWPORTS.tablet,
    })) {
      const page = await browser.newPage({ viewport });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await page.click('.nav-toggle');
      await page.waitForTimeout(350);
      const modal = await page.evaluate(() => ({
        main: document.getElementById('main').hasAttribute('inert'),
        footer: document.querySelector('.site-footer').hasAttribute('inert'),
        brand: document.querySelector('.brand').hasAttribute('inert'),
        headerCta: document.querySelector('.header-actions .btn-small').hasAttribute('inert'),
        headerCall: document.querySelector('.header-call-icon').hasAttribute('inert'),
        headerCtaVisibility: getComputedStyle(
          document.querySelector('.header-actions .btn-small')
        ).visibility,
        headerCallVisibility: getComputedStyle(
          document.querySelector('.header-call-icon')
        ).visibility,
        toggleInert: document.querySelector('.nav-toggle').hasAttribute('inert'),
      }));
      for (let i = 0; i < 14; i++) await page.keyboard.press('Tab');
      const inside = await page.evaluate(() =>
        !!document.activeElement.closest('#mobile-menu, .nav-toggle'));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      const restored = await page.evaluate(() => ({
        onToggle: document.activeElement === document.querySelector('.nav-toggle'),
        inertLeft: [...document.querySelectorAll(
          '#main, .site-footer, .brand, .header-actions .btn-small, .header-call-icon'
        )].some((el) => el.hasAttribute('inert')),
      }));
      await page.close();
      if (!modal.main || !modal.footer || !modal.brand || !modal.headerCta || !modal.headerCall ||
          modal.headerCtaVisibility !== 'hidden' || modal.headerCallVisibility !== 'hidden' ||
          modal.toggleInert) {
        throw new Error(`${label}: non-modal state ${JSON.stringify(modal)}`);
      }
      if (!inside) throw new Error(`${label}: focus escaped the overlay`);
      if (!restored.onToggle) throw new Error(`${label}: focus not returned to the toggle`);
      if (restored.inertLeft) throw new Error(`${label}: inert not cleared on close`);
    }
  });

  test('desktop resize closes a mobile menu and clears every modal side effect', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.tablet });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.click('.nav-toggle');
    await page.waitForTimeout(100);
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => ({
      expanded: document.querySelector('.nav-toggle').getAttribute('aria-expanded'),
      menuHidden: document.getElementById('mobile-menu').hidden,
      bodyLocked: document.body.classList.contains('menu-open') ||
        getComputedStyle(document.body).overflow === 'hidden',
      inertLeft: [...document.querySelectorAll(
        '#main, .site-footer, .brand, .header-actions .btn-small, .header-call-icon'
      )].some((node) => node.hasAttribute('inert')),
      desktopNav: getComputedStyle(document.querySelector('.site-nav')).display,
    }));
    await page.close();
    if (state.expanded !== 'false' || !state.menuHidden || state.bodyLocked ||
        state.inertLeft || state.desktopNav === 'none') {
      throw new Error(JSON.stringify(state));
    }
  });

  /* ---- form validation surfaces per-field, not colour-only ---- */
  test('form errors are visually hidden before validation', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const errors = [...document.querySelectorAll('.field-error')];
      return {
        total: errors.length,
        visible: errors
          .filter((el) => getComputedStyle(el).display !== 'none')
          .map((el) => el.id || el.textContent.trim()),
      };
    });
    await page.close();
    if (!state.total) throw new Error('no per-field errors found to verify');
    if (state.visible.length) {
      throw new Error(`initially visible errors: ${state.visible.join(', ')}`);
    }
  });

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

  /* ---- Groundline brief honesty + deterministic behaviour ---- */
  test('groundline brief covers all four routes with three safe actions', async (browser) => {
    const cases = [
      ['none', null, /no listed warning signs selected/i],
      ['record', 'granules', /build a ground-level record/i],
      ['shingles', 'shingles', /schedule a closer inspection/i],
      ['water', 'interior', /active water calls for a safety-first response/i],
    ];
    for (const [label, sign, expected] of cases) {
      const page = await browser.newPage({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      if (sign) await page.check(`input[name="sign"][value="${sign}"]`);
      await page.click('#check-tool button[type=submit]');
      await page.waitForTimeout(100);
      const out = await page.evaluate(() => {
        const result = document.getElementById('check-result');
        const heading = result.querySelector('.check-verdict');
        return {
          text: result.textContent,
          live: result.getAttribute('aria-live'),
          actionCount: result.querySelectorAll('.check-action-list > li').length,
          hasReason: !!result.querySelector('.check-reason'),
          hasCall: !!result.querySelector('a[href="tel:+12245006825"]'),
          hasUse: [...result.querySelectorAll('button')].some((button) => /use this in my request/i.test(button.textContent)),
          hasCopy: [...result.querySelectorAll('button')].some((button) => /copy action plan/i.test(button.textContent)),
          headingFocused: document.activeElement === heading,
          headingVisible: heading && heading.getBoundingClientRect().top >= 0 &&
            heading.getBoundingClientRect().bottom <= window.innerHeight,
        };
      });
      await page.close();
      if (!expected.test(out.text) || out.live !== 'polite' || out.actionCount !== 3 ||
          !out.hasReason || !out.hasCall || !out.hasUse || !out.hasCopy ||
          !out.headingFocused || !out.headingVisible ||
          !/not an inspection, diagnosis, weather verification, service-area result/i.test(out.text)) {
        throw new Error(`${label}: ${JSON.stringify(out)}`);
      }
      if (/\b(?:19|20)\d{2}\b/.test(out.text.replace(/\(224\)\s*500-6825/g, ''))) {
        throw new Error(`${label}: output contains what looks like a fabricated event date`);
      }
    }
  });

  test('groundline brief transfers safely into the email request', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.check('input[name="age"][value="mid"]');
    await page.check('input[name="sign"][value="shingles"]');
    await page.click('#check-tool button[type=submit]');
    await page.getByRole('button', { name: /use this in my request/i }).click();
    await page.waitForTimeout(80);
    const state = await page.evaluate(() => ({
      service: document.getElementById('f-service').value,
      message: document.getElementById('f-message').value,
      focused: document.activeElement === document.getElementById('f-message'),
    }));
    await page.close();
    if (state.service !== 'Storm damage inspection' || !state.focused ||
        !/Groundline observation brief/.test(state.message) ||
        !/Missing, lifted, cracked, or curled shingles/.test(state.message) ||
        !/It is not an inspection, diagnosis/.test(state.message)) {
      throw new Error(JSON.stringify(state));
    }
  });

  test('groundline copy action uses plain text without HTML interpolation', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      window.__copiedBrief = '';
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async (value) => { window.__copiedBrief = value; } },
      });
    });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.check('input[name="sign"][value="dents"]');
    await page.click('#check-tool button[type=submit]');
    await page.getByRole('button', { name: /copy action plan/i }).click();
    await page.waitForTimeout(50);
    const state = await page.evaluate(async () => ({
      copied: window.__copiedBrief,
      status: document.querySelector('.check-copy-status').textContent,
      script: await fetch('js/main.js').then((response) => response.text()),
    }));
    await page.close();
    if (!/Groundline observation brief/.test(state.copied) ||
        !/Action plan copied/i.test(state.status) ||
        /checkResult\.innerHTML\s*=/.test(state.script)) {
      throw new Error(JSON.stringify(state));
    }
  });

  /* ---- content must not be hidden if JS fails ---- */
  test('content is visible with JavaScript disabled', async (browser) => {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    const vis = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.reveal:not(#contact-form):not(#check-tool)')];
      const hidden = els.filter((e) => getComputedStyle(e).opacity === '0').length;
      const fallback = document.getElementById('form-fallback');
      const checkFallback = document.querySelector('.check-fallback');
      return {
        total: els.length,
        hidden,
        formDisplay: getComputedStyle(document.getElementById('contact-form')).display,
        fallbackVisible: getComputedStyle(fallback).display !== 'none',
        fallbackLinks: fallback.querySelectorAll('a[href^="tel:"], a[href^="mailto:"]').length,
        checkToolDisplay: getComputedStyle(document.getElementById('check-tool')).display,
        checkFallbackVisible: getComputedStyle(checkFallback).display !== 'none',
        rangeDisplay: getComputedStyle(document.getElementById('ba-range')).display,
        comparisonFallbackVisible: getComputedStyle(document.querySelector('.ba-nojs')).display !== 'none',
      };
    });
    await ctx.close();
    if (vis.hidden > 0) throw new Error(`${vis.hidden}/${vis.total} revealed blocks hidden without JS`);
    if (vis.formDisplay !== 'none' || !vis.fallbackVisible || vis.fallbackLinks !== 2) {
      throw new Error(`no-JS contact fallback is incomplete: ${JSON.stringify(vis)}`);
    }
    if (vis.checkToolDisplay !== 'none' || !vis.checkFallbackVisible ||
        vis.rangeDisplay !== 'none' || !vis.comparisonFallbackVisible) {
      throw new Error(`no-JS interactive alternatives are incomplete: ${JSON.stringify(vis)}`);
    }
  });

  test('no-JS mobile navigation and services remain directly operable', async (browser) => {
    const ctx = await browser.newContext({
      viewport: VIEWPORTS.mobile,
      javaScriptEnabled: false,
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    const state = await page.evaluate(() => {
      const nav = document.querySelector('.nojs-nav');
      const rail = document.getElementById('services-list');
      const cards = [...rail.querySelectorAll('.service-card')].map((card) => {
        const rect = card.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      });
      return {
        navDisplay: getComputedStyle(nav).display,
        navLinks: nav.querySelectorAll('a[href^="#"]').length,
        toggleDisplay: getComputedStyle(document.querySelector('.nav-toggle')).display,
        railDisplay: getComputedStyle(rail).display,
        railOverflow: getComputedStyle(rail).overflowX,
        railTabIndex: rail.tabIndex,
        cards,
        viewportWidth: innerWidth,
      };
    });
    await ctx.close();
    if (state.navDisplay === 'none' || state.navLinks < 7 ||
        state.toggleDisplay !== 'none' || state.railDisplay !== 'grid' ||
        state.railOverflow === 'auto' || state.railTabIndex >= 0 ||
        state.cards.some((card) => card.left < -1 || card.right > state.viewportWidth + 1)) {
      throw new Error(JSON.stringify(state));
    }
  });

  test('reveal content fails open if initialization throws', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: function () { throw new Error('synthetic matchMedia failure'); },
      });
    });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    const vis = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.reveal:not(#contact-form):not(#check-tool)')];
      const hidden = els.filter((el) => {
        const style = getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      });
      const fallback = document.getElementById('form-fallback');
      const checkFallback = document.querySelector('.check-fallback');
      return {
        total: els.length,
        hidden: hidden.length,
        formDisplay: getComputedStyle(document.getElementById('contact-form')).display,
        fallbackVisible: getComputedStyle(fallback).display !== 'none',
        checkFallbackVisible: getComputedStyle(checkFallback).display !== 'none',
      };
    });
    await page.close();
    if (!vis.total) throw new Error('no reveal content found to verify');
    if (vis.hidden) {
      throw new Error(`${vis.hidden}/${vis.total} revealed blocks hidden after initialization failure`);
    }
    if (vis.formDisplay !== 'none' || !vis.fallbackVisible || !vis.checkFallbackVisible) {
      throw new Error(`contact did not fail open to direct links: ${JSON.stringify(vis)}`);
    }
  });

  /* ---- placeholder and high-risk public copy must stay removed ---- */
  test('placeholder testimonials and reviews section are absent', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => ({
      reviewNodes: document.querySelectorAll('#reviews, .reviews, .review-card').length,
      placeholderComment: /placeholder\s+testimonials?/i.test(document.documentElement.innerHTML),
    }));
    await page.close();
    if (state.reviewNodes) throw new Error(`${state.reviewNodes} review/testimonial nodes remain`);
    if (state.placeholderComment) throw new Error('placeholder testimonial marker remains in the page');
  });

  test('Storm Sequence condition map is explicitly illustrative', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const state = await page.evaluate(async () => ({
      label: document.querySelector('.storm-example')?.textContent || '',
      scope: document.querySelector('.storm-scope')?.textContent || '',
      script: await fetch('js/storm.js').then((response) => response.text()),
    }));
    await page.close();
    if (!/illustrative example/i.test(state.label) || !/not a customer project/i.test(state.label)) {
      throw new Error(`condition map lacks an explicit example label: ${state.label}`);
    }
    if (/\b(?:14\s+sq|42\s+lf|2\s+sht|38\s+lf)\b/i.test(state.scope + state.script)) {
      throw new Error('fabricated project quantities remain in the illustrative sequence');
    }
    if (!/ILLUSTRATIVE ONLY/.test(state.script) || !/NOT A CUSTOMER FILE/.test(state.script)) {
      throw new Error('canvas title block is not marked as illustrative');
    }
  });

  test('visible copy avoids unapproved claim-advocacy language', async (browser) => {
    const patterns = [
      ['public adjusting', /\bpublic\s+adjusting\b/i],
      ['file/manage a claim', /\b(?:fil(?:e|es|ed|ing)|manag(?:e|es|ed|ing))\b[^.!?]{0,80}\b(?:a|the|your)\s+claim\b/i],
      ['negotiate a settlement', /\bnegotiat\w*\b[^.!?]{0,40}\b(?:a|the|your)\s+settlement\b/i],
      ['on your behalf', /\bon\s+your\s+behalf\b/i],
      ['read your policy', /\bread(?:s|ing)?\s+your\s+policy\b/i],
      ['argue the claim', /\bargu\w*\b[^.!?]{0,40}\b(?:a|the|your)\s+claim\b/i],
      ['one accountable team', /\bone\s+accountable\s+team\b/i],
      ['free inspection', /\bfree\s+inspection\b/i],
      ['24–48 hour response', /\b24\s*[–—-]\s*48\s+hours?\b/i],
      ['unverified region', /\b(?:Spring|Northwest Suburbs|Greater Houston|The Woodlands|Tomball|Klein|Conroe)\b/i],
      ['fabricated scope quantity', /\b(?:14\s+sq|42\s+lf|2\s+sht|38\s+lf)\b/i],
      ['unsupported betterment promise', /\bbuilt\s+back\s+better\b/i],
    ];
    const violations = [];
    for (const [viewportName, viewport] of Object.entries({
      mobile: VIEWPORTS.mobile,
      desktop: VIEWPORTS.desktop,
    })) {
      const page = await browser.newPage({ viewport });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      const copy = await page.locator('body').innerText();
      await page.close();
      for (const [label, pattern] of patterns) {
        const match = copy.match(pattern);
        if (match) violations.push(`${viewportName}: ${label} ("${match[0]}")`);
      }
    }
    if (violations.length) throw new Error(violations.join('; '));
  });

  test('verified Illinois credentials are linked and unsupported coverage UI is absent', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.trust-row a')].map((link) => ({
        text: link.innerText.replace(/\s+/g, ' ').trim(),
        href: link.href,
      }));
      return {
        links,
        trustDate: document.querySelector('.trust-date')?.textContent || '',
        footer: document.querySelector('.footer-legal')?.textContent.replace(/\s+/g, ' ').trim() || '',
        areasSection: !!document.getElementById('areas'),
        areasLinks: document.querySelectorAll('a[href="#areas"]').length,
        unverifiedSchema: document.querySelectorAll('script[type="application/ld+json"]').length,
      };
    });
    await page.close();
    const combined = state.links.map((link) => `${link.text} ${link.href}`).join(' ');
    if (!/License 104\.020040 Active · Unlimited/i.test(combined) ||
        !/data\.illinois\.gov/.test(combined) ||
        !/Accredited Business A\+ rating/i.test(combined) ||
        !/bbb\.org/.test(combined) ||
        !/Certified™ contractor ID 1151998/i.test(combined) ||
        !/gaf\.com/.test(combined) ||
        !/checked July 27, 2026/i.test(state.trustDate) ||
        !/Alpha Restoration Inc\. d\/b\/a Raccoon Restoration/i.test(state.footer) ||
        state.areasSection || state.areasLinks || state.unverifiedSchema) {
      throw new Error(JSON.stringify(state));
    }
  });

  test('jury polish keeps service, proof, comparison, contact, and menu labels legible', async (browser) => {
    const desktop = await browser.newPage({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
    await desktop.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const desktopState = await desktop.evaluate(() => {
      const heading = [...document.querySelectorAll('.service-card h3')]
        .find((node) => /Interior Restoration/.test(node.textContent));
      const text = heading?.firstChild;
      const wordStart = text?.data.indexOf('Restoration') ?? -1;
      let wordLines = 0;
      if (text && wordStart >= 0) {
        const range = document.createRange();
        range.setStart(text, wordStart);
        range.setEnd(text, wordStart + 'Restoration'.length);
        wordLines = range.getClientRects().length;
      }
      return { wordLines };
    });
    await desktop.close();

    const mobile = await browser.newPage({ viewport: VIEWPORTS.mobile, reducedMotion: 'reduce' });
    await mobile.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const mobileState = await mobile.evaluate(() => {
      const serviceGrid = document.getElementById('services-list');
      const cards = [...serviceGrid.querySelectorAll('.service-card')];
      const after = document.querySelector('.ba-tag-after').getBoundingClientRect();
      const before = document.querySelector('.ba-tag-before').getBoundingClientRect();
      const trustSizes = [...document.querySelectorAll('.trust-row span')]
        .map((node) => parseFloat(getComputedStyle(node).fontSize));
      const basedRow = [...document.querySelectorAll('.contact-details li')]
        .find((row) => /Based in/i.test(row.querySelector('.detail-label')?.textContent || ''));
      const basedLabel = basedRow?.querySelector('.detail-label')?.getBoundingClientRect();
      const basedValue = basedRow?.querySelector('span:not(.detail-label)')?.getBoundingClientRect();
      return {
        serviceAlign: getComputedStyle(serviceGrid).alignItems,
        ordinaryMax: Math.max(...cards.slice(0, 6).map((card) => card.getBoundingClientRect().height)),
        featuredHeight: cards.at(-1).getBoundingClientRect().height,
        comparisonGap: before.left - after.right,
        comparisonLabels: [
          document.querySelector('.ba-tag-after').textContent,
          document.querySelector('.ba-tag-before').textContent,
        ].join(' '),
        minTrustSize: Math.min(...trustSizes),
        basedGap: basedLabel && basedValue ? basedValue.left - basedLabel.right : -1,
        phoneLabel: document.querySelector('label[for="f-phone"]')?.textContent.trim(),
        emailLabel: document.querySelector('label[for="f-email"]')?.textContent.trim(),
        replyHint: document.querySelector('.form-reply-hint')?.textContent || '',
        phoneDescription: document.getElementById('f-phone').getAttribute('aria-describedby') || '',
        emailDescription: document.getElementById('f-email').getAttribute('aria-describedby') || '',
      };
    });
    await mobile.click('.nav-toggle');
    await mobile.waitForTimeout(180);
    const menuState = await mobile.evaluate(() => ({
      closeGlyph: getComputedStyle(document.querySelector('.nav-toggle'), '::after').content,
      closeOpacity: getComputedStyle(document.querySelector('.nav-toggle'), '::after').opacity,
      visibleBars: [...document.querySelectorAll('.nav-toggle-bar')]
        .filter((node) => Number(getComputedStyle(node).opacity) > 0.01).length,
    }));
    await mobile.close();

    if (desktopState.wordLines !== 1) {
      throw new Error(`Interior Restoration word split across ${desktopState.wordLines} lines`);
    }
    if (mobileState.serviceAlign !== 'flex-start' ||
        mobileState.ordinaryMax >= mobileState.featuredHeight ||
        mobileState.comparisonGap < 4 ||
        !/Illustrated · restored.*Illustrated · storm/i.test(mobileState.comparisonLabels) ||
        mobileState.minTrustSize < 12 ||
        mobileState.basedGap < 4 ||
        mobileState.phoneLabel !== 'Phone' ||
        mobileState.emailLabel !== 'Email' ||
        !/phone number, email address, or both/i.test(mobileState.replyHint) ||
        !/\bh-reply\b/.test(mobileState.phoneDescription) ||
        !/\bh-reply\b/.test(mobileState.emailDescription) ||
        !/[×x]/i.test(menuState.closeGlyph) ||
        Number(menuState.closeOpacity) < 0.99 ||
        menuState.visibleBars) {
      throw new Error(JSON.stringify({ desktopState, mobileState, menuState }));
    }
  });

  test('public copy keeps location, specialty, illustration, and scheduling claims narrow', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.check('input[name="sign"][value="interior"]');
    await page.click('#check-tool button[type=submit]');
    const state = await page.evaluate(() => ({
      copy: document.body.innerText,
      basedIn: [...document.querySelectorAll('.contact-details li')].some((row) =>
        /^Based in\s+Barrington, Illinois$/i.test(row.innerText.replace(/\s+/g, ' ').trim())),
      comparisonLabels: [...document.querySelectorAll('.ba-tag')]
        .map((node) => node.textContent.trim()),
      waterResult: document.getElementById('check-result').innerText,
    }));
    await page.close();

    if (!state.basedIn ||
        /\b(?:cedar|seamless-run|energy performance)\b/i.test(state.copy) ||
        state.comparisonLabels.length !== 2 ||
        state.comparisonLabels.some((label) => !/^Illustrated\b/i.test(label)) ||
        !/ask whether an inspection is available/i.test(state.waterResult) ||
        /arrange prompt help|prompt on-site help/i.test(state.waterResult)) {
      throw new Error(JSON.stringify(state));
    }
  });

  test('Groundline naming and social metadata are complete and consistent', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const meta = (selector) => document.querySelector(selector)?.getAttribute('content') || '';
      return {
        groundline: !!document.getElementById('groundline'),
        groundlineLinks: document.querySelectorAll('a[href="#groundline"]').length,
        oldId: !!document.getElementById('storm-check'),
        image: meta('meta[property="og:image"]'),
        width: meta('meta[property="og:image:width"]'),
        height: meta('meta[property="og:image:height"]'),
        alt: meta('meta[property="og:image:alt"]'),
        twitterTitle: meta('meta[name="twitter:title"]'),
        twitterDescription: meta('meta[name="twitter:description"]'),
        twitterImage: meta('meta[name="twitter:image"]'),
        twitterAlt: meta('meta[name="twitter:image:alt"]'),
      };
    });
    await page.close();
    if (!state.groundline || state.groundlineLinks < 3 || state.oldId ||
        !/\/assets\/og\.png$/.test(state.image) || state.width !== '1200' ||
        state.height !== '630' || !state.alt || !state.twitterTitle ||
        !state.twitterDescription || state.twitterImage !== state.image ||
        state.twitterAlt !== state.alt) {
      throw new Error(JSON.stringify(state));
    }
  });

  test('header uses the production logo lockup without a redraw', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const logo = await page.evaluate(() => {
      const img = document.querySelector('.brand > img.brand-logo');
      if (!img) return null;
      const rect = img.getBoundingClientRect();
      return {
        src: img.getAttribute('src'),
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        renderedHeight: rect.height,
        renderedRatio: rect.width / rect.height,
        extraArtwork: document.querySelectorAll('.brand svg, .brand canvas').length,
      };
    });
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);
    const secondary = await page.evaluate(() => {
      const headerLogo = document.querySelector('.brand-logo');
      const footerLogo = document.querySelector('.footer-logo');
      const footerRect = footerLogo.getBoundingClientRect();
      return {
        scrolledHeaderHeight: headerLogo.getBoundingClientRect().height,
        footerSource: footerLogo.getAttribute('src'),
        footerNaturalWidth: footerLogo.naturalWidth,
        footerNaturalHeight: footerLogo.naturalHeight,
        footerRatio: footerRect.width / footerRect.height,
        alternateWordmark: document.querySelectorAll('.footer-word').length,
      };
    });
    await page.close();
    if (!logo) throw new Error('header production-logo image is missing');
    if (logo.src !== 'assets/logo.png') throw new Error(`unexpected logo source: ${logo.src}`);
    if (logo.naturalWidth !== 1536 || logo.naturalHeight !== 835) {
      throw new Error(`unexpected production asset dimensions: ${logo.naturalWidth}×${logo.naturalHeight}`);
    }
    const sourceRatio = 1536 / 835;
    if (Math.abs(logo.renderedRatio - sourceRatio) > 0.01) {
      throw new Error(`logo is distorted: rendered ratio ${logo.renderedRatio.toFixed(3)}`);
    }
    if (logo.extraArtwork) throw new Error('a reconstructed logo is present beside the production lockup');
    if (secondary.scrolledHeaderHeight < logo.renderedHeight - 1) {
      throw new Error(`scrolled header shrinks the full lockup from ${logo.renderedHeight}px to ${secondary.scrolledHeaderHeight}px`);
    }
    if (secondary.footerSource !== 'assets/logo.png' ||
        secondary.footerNaturalWidth !== 1536 || secondary.footerNaturalHeight !== 835 ||
        Math.abs(secondary.footerRatio - sourceRatio) > 0.01 ||
        secondary.alternateWordmark) {
      throw new Error(`footer identity is not the exact lockup: ${JSON.stringify(secondary)}`);
    }
  });

  test('contact form requires a reply method and labels its interim delivery', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const deliveryState = await page.evaluate(() => {
      const form = document.getElementById('contact-form');
      return {
        action: form.getAttribute('action'),
        delivery: form.dataset.delivery,
        button: form.querySelector('button[type="submit"]').textContent.trim(),
        note: document.getElementById('form-note').textContent.trim(),
      };
    });
    await page.fill('#f-name', 'Test Homeowner');
    await page.evaluate(() => document.getElementById('contact-form')
      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })));
    await page.waitForTimeout(200);
    const state = await page.evaluate(() => {
      const form = document.getElementById('contact-form');
      const error = document.getElementById('e-contact');
      return {
        errorVisible: !error.hidden,
        phoneDescribed: document.getElementById('f-phone').getAttribute('aria-describedby'),
        emailDescribed: document.getElementById('f-email').getAttribute('aria-describedby'),
      };
    });
    await page.close();
    if (!state.errorVisible || !/e-contact/.test(state.phoneDescribed || '') ||
        !/e-contact/.test(state.emailDescribed || '')) {
      throw new Error('phone-or-email error is not visible and wired to both inputs');
    }
    if (deliveryState.delivery !== 'email-client' || !/^mailto:/i.test(deliveryState.action)) {
      throw new Error(`interim delivery is mislabeled: ${deliveryState.delivery}, ${deliveryState.action}`);
    }
    if (!/prepare email request/i.test(deliveryState.button) ||
        !/nothing is sent from this page/i.test(deliveryState.note)) {
      throw new Error('the interim email handoff is not explained truthfully');
    }
  });

  test('contact validation rejects formatting-only values and guards mailto size', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.__preparedEmails = [];
      document.getElementById('contact-form').addEventListener('emailrequestprepared', (event) => {
        event.preventDefault();
        window.__preparedEmails.push(event.detail.uri);
      });
    });
    const submit = () => page.evaluate(() => document.getElementById('contact-form')
      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })));

    await page.fill('#f-name', '   ');
    await page.fill('#f-email', 'person@example.com');
    await submit();
    const whitespaceName = await page.evaluate(() => ({
      prepared: window.__preparedEmails.length,
      errorVisible: !document.getElementById('e-name').hidden,
      invalid: document.getElementById('f-name').getAttribute('aria-invalid'),
    }));

    await page.fill('#f-name', 'Test Homeowner');
    await page.fill('#f-email', '');
    await page.fill('#f-phone', '+++++++');
    await submit();
    const symbolPhone = await page.evaluate(() => ({
      prepared: window.__preparedEmails.length,
      errorVisible: !document.getElementById('e-phone').hidden,
      invalid: document.getElementById('f-phone').getAttribute('aria-invalid'),
    }));

    await page.fill('#f-phone', '');
    await page.fill('#f-email', 'person@example.com');
    await page.check('input[name="sign"][value="interior"]');
    await page.click('#check-tool button[type=submit]');
    await page.getByRole('button', { name: /use this in my request/i }).click();
    await submit();
    const groundline = await page.evaluate(() => ({
      prepared: window.__preparedEmails.length,
      uriLength: window.__preparedEmails.at(-1)?.length || 0,
      messageLength: document.getElementById('f-message').value.length,
      maxLength: document.getElementById('f-message').maxLength,
    }));

    await page.evaluate(() => {
      document.getElementById('f-message').value = 'é'.repeat(1000);
    });
    await submit();
    const oversized = await page.evaluate(() => ({
      prepared: window.__preparedEmails.length,
      errorVisible: !document.getElementById('e-message').hidden,
      note: document.getElementById('form-note').textContent,
    }));
    await page.close();

    if (whitespaceName.prepared || !whitespaceName.errorVisible || whitespaceName.invalid !== 'true' ||
        symbolPhone.prepared || !symbolPhone.errorVisible || symbolPhone.invalid !== 'true' ||
        groundline.prepared !== 1 || !groundline.uriLength || groundline.uriLength > 2000 ||
        groundline.messageLength > groundline.maxLength ||
        oversized.prepared !== 1 || !oversized.errorVisible ||
        !/too long/i.test(oversized.note)) {
      throw new Error(JSON.stringify({ whitespaceName, symbolPhone, groundline, oversized }));
    }
  });

  test('optional property ZIP validates without implying service coverage', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.fill('#f-name', 'Test Homeowner');
    await page.fill('#f-email', 'test@example.com');
    await page.fill('#f-zip', '60A');
    await page.evaluate(() => document.getElementById('contact-form')
      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })));
    const invalid = await page.evaluate(() => ({
      visible: !document.getElementById('e-zip').hidden,
      described: document.getElementById('f-zip').getAttribute('aria-describedby'),
      text: document.querySelector('label[for="f-zip"]').parentElement.textContent,
    }));
    await page.fill('#f-zip', '');
    const cleared = await page.evaluate(() => ({
      visible: !document.getElementById('e-zip').hidden,
      valid: document.getElementById('f-zip').checkValidity(),
    }));
    await page.close();
    if (!invalid.visible || !/e-zip/.test(invalid.described || '') ||
        !/does not mean a project can be scheduled/i.test(invalid.text) ||
        cleared.visible || !cleared.valid) {
      throw new Error(JSON.stringify({ invalid, cleared }));
    }
  });

  test('valid contact details produce an encoded, truthful email handoff', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.__preparedEmail = '';
      document.getElementById('contact-form').addEventListener('emailrequestprepared', (event) => {
        event.preventDefault();
        window.__preparedEmail = event.detail.uri;
      }, { once: true });
    });
    await page.fill('#f-name', 'Zoë O’Neil');
    await page.fill('#f-email', 'zoe@example.com');
    await page.fill('#f-zip', '60010');
    await page.fill('#f-message', 'Line one\nLine two & roof?');
    await page.evaluate(() => document.getElementById('contact-form')
      .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })));
    const state = await page.evaluate(() => ({
      uri: window.__preparedEmail,
      note: document.getElementById('form-note').textContent.trim(),
      sentClass: document.getElementById('form-note').classList.contains('sent'),
    }));
    await page.close();
    if (!state.uri) throw new Error('valid submission did not prepare an email URI');
    const uri = new URL(state.uri);
    if (uri.protocol !== 'mailto:' || uri.pathname !== 'info@raccoonrestoration.com') {
      throw new Error(`unexpected mailto destination: ${state.uri}`);
    }
    if (uri.searchParams.get('subject') !== 'Inspection request — Zoë O’Neil') {
      throw new Error(`subject encoding failed: ${uri.searchParams.get('subject')}`);
    }
    const body = uri.searchParams.get('body') || '';
    if (!body.includes('Name: Zoë O’Neil') || !body.includes('Email: zoe@example.com') ||
        !body.includes('Property ZIP: 60010') ||
        !body.includes('Line one\nLine two & roof?')) {
      throw new Error(`body encoding failed: ${body}`);
    }
    if (!state.sentClass || !/nothing has been sent yet/i.test(state.note)) {
      throw new Error(`truthful prepared state missing: ${JSON.stringify(state)}`);
    }
  });

  test('responsive narrative meets the post-audit scroll-height budgets', async (browser) => {
    const budgets = {
      mobile: 9400,
      tablet: 9700,
      desktop: 9100,
    };
    for (const [label, budget] of Object.entries(budgets)) {
      const page = await browser.newPage({ viewport: VIEWPORTS[label] });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.close();
      if (height > budget) throw new Error(`${label}: ${height}px > ${budget}px budget`);
    }
  });

  test('first-load local asset payload stays below 450KB', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const payload = await page.evaluate(async () => {
      const urls = new Set([location.href]);
      performance.getEntriesByType('resource').forEach((entry) => {
        if (entry.name.startsWith(location.origin)) urls.add(entry.name);
      });
      const files = [];
      let total = 0;
      for (const url of urls) {
        const response = await fetch(url);
        const bytes = (await response.arrayBuffer()).byteLength;
        files.push({ url: new URL(url).pathname, bytes });
        total += bytes;
      }
      return { total, files };
    });
    await page.close();
    if (payload.total > 450 * 1024) {
      throw new Error(`${payload.total} bytes: ${JSON.stringify(payload.files)}`);
    }
  });

  /* ---- self-hosted fonts cover every glyph they are assigned to render ---- */
  test('self-hosted fonts render assigned glyphs without silent fallback', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const res = await page.evaluate(async () => {
      await document.fonts.ready;
      const assigned = { Archivo: new Set(), Inter: new Set() };
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const parent = walker.currentNode.parentElement;
        if (!parent || parent.closest('[aria-hidden="true"]')) continue;
        const family = getComputedStyle(parent).fontFamily;
        const target = family.includes('Archivo')
          ? assigned.Archivo
          : family.includes('Inter')
            ? assigned.Inter
            : null;
        if (!target) continue;
        [...walker.currentNode.data].forEach((char) => {
          if (char.trim() && char.codePointAt(0) > 31) target.add(char);
        });
      }

      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 80;
      const context = canvas.getContext('2d');
      const signature = (family, weight, fallback, char) => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#000';
        context.textBaseline = 'top';
        context.font = `${weight} 48px "${family}", ${fallback}`;
        context.fillText(char, 4, 4);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let hash = 2166136261;
        for (let i = 3; i < pixels.length; i += 4) {
          hash ^= pixels[i];
          hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
      };
      const missing = [];
      for (const [family, chars] of Object.entries(assigned)) {
        const weight = family === 'Archivo' ? 800 : 400;
        for (const char of chars) {
          const variants = ['serif', 'monospace', 'cursive']
            .map((fallback) => signature(family, weight, fallback, char));
          if (new Set(variants).size > 1) {
            missing.push(`${family}: U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} ${char}`);
          }
        }
      }
      return {
        loaded: document.fonts.check('800 40px Archivo') && document.fonts.check('400 16px Inter'),
        missing,
      };
    });
    await page.close();
    if (!res.loaded) throw new Error('a self-hosted face failed to load');
    if (res.missing.length) {
      throw new Error(`font fallback detected: ${JSON.stringify(res.missing)}`);
    }
  });

  test('font payload stays within budget', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
    let fontBytes = 0;
    const pending = [];
    page.on('response', (r) => {
      if (!/\.woff2$/.test(r.url())) return;
      pending.push(r.body().then((b) => { fontBytes += b.length; }).catch(() => {}));
    });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await Promise.all(pending);           // bodies resolve async — await before asserting
    await page.close();
    const BUDGET = 150 * 1024;            // complete Latin Archivo + Inter ~= 135 KB
    if (fontBytes === 0) throw new Error('no fonts were loaded');
    if (fontBytes > BUDGET) {
      throw new Error(`fonts ${(fontBytes / 1024).toFixed(0)} KB exceeds the ${BUDGET / 1024} KB budget`);
    }
  });

  /* ---- launch pack ---- */
  test('launch pack files are served', async (browser) => {
    const page = await browser.newPage();
    const missing = [];
    for (const path of ['/robots.txt', '/sitemap.xml', '/site.webmanifest', '/404.html',
                        '/assets/logo.png', '/assets/logo-mark.png', '/assets/favicon-32.png',
                        '/assets/apple-touch-icon.png', '/assets/icon-192.png',
                        '/assets/icon-512.png', '/assets/og.png']) {
      const res = await page.goto(BASE + path);
      if (!res || res.status() >= 400) missing.push(`${path} -> ${res ? res.status() : 'no response'}`);
    }
    await page.close();
    if (missing.length) throw new Error(missing.join(', '));
  });

  test('404 asset references remain valid for nested missing routes', async (browser) => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/404.html`, { waitUntil: 'networkidle' });
    const bad = await page.evaluate(() =>
      [...document.querySelectorAll('link[href]')]
        .map((link) => link.getAttribute('href'))
        .filter((href) => !href.startsWith('/') && !/^[a-z]+:/i.test(href)));
    await page.close();
    if (bad.length) throw new Error(`relative 404 assets would break on nested routes: ${bad.join(', ')}`);
  });

  /* ---- local-business structured data remains held until identity is verified ---- */
  test('unverified local-business schema stays out of the page', async (browser) => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const blocks = await page.evaluate(() =>
      [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map((s) => { try { return JSON.parse(s.textContent); } catch { return 'PARSE_ERROR'; } }));
    await page.close();
    if (blocks.includes('PARSE_ERROR')) throw new Error('a JSON-LD block does not parse');

    const types = new Set();
    const guessed = new Set();
    const forbiddenKeys = new Set([
      'address',
      'aggregateRating',
      'areaServed',
      'geo',
      'location',
      'openingHours',
      'openingHoursSpecification',
      'priceRange',
      'review',
    ]);
    const visit = (value) => {
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (key === '@type') {
          (Array.isArray(child) ? child : [child]).forEach((type) => types.add(type));
        }
        if (forbiddenKeys.has(key)) guessed.add(key);
        visit(child);
      }
    };
    blocks.forEach(visit);

    for (const forbiddenType of [
      'AggregateRating',
      'FAQPage',
      'LocalBusiness',
      'Organization',
      'Review',
      'RoofingContractor',
    ]) {
      if (types.has(forbiddenType)) throw new Error(`${forbiddenType} schema must remain omitted`);
    }
    if (guessed.size) {
      throw new Error(`guessed JSON-LD fields remain: ${[...guessed].join(', ')}`);
    }
  });

  /* ---- axe-core across the states that matter ---- */
  if (axePath) {
    const states = [
      ['desktop', { viewport: VIEWPORTS.desktop }, null],
      ['320px reflow', { viewport: VIEWPORTS.reflow }, null],
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
    test('forced-colors mode preserves controls and non-color axe rules', async (browser) => {
      const page = await browser.newPage({
        viewport: VIEWPORTS.mobile,
        reducedMotion: 'reduce',
        forcedColors: 'active',
      });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await page.focus('.header-call-icon');
      const controls = await page.evaluate(() => {
        const call = document.querySelector('.header-call-icon');
        const option = document.querySelector('#check-tool input[type="checkbox"]');
        const button = document.querySelector('#check-tool button[type="submit"]');
        return [call, option, button].map((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return {
            display: style.display,
            visibility: style.visibility,
            width: rect.width,
            height: rect.height,
            outline: style.outlineStyle,
          };
        });
      });
      await page.addScriptTag({ path: axePath });
      const violations = await page.evaluate(async () => {
        const r = await window.axe.run(document, {
          runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
          rules: { 'color-contrast': { enabled: false } },
        });
        return r.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`);
      });
      await page.close();
      if (controls.some((control) =>
        control.display === 'none' || control.visibility === 'hidden' ||
        control.width < 18 || control.height < 18)) {
        throw new Error(`forced-colors control disappeared: ${JSON.stringify(controls)}`);
      }
      if (controls[0].outline === 'none') throw new Error('forced-colors focus indicator is missing');
      if (violations.length) throw new Error(violations.join('; '));
    });
    test('axe: zero violations (groundline result)', async (browser) => {
      const page = await browser.newPage({ viewport: VIEWPORTS.mobile, reducedMotion: 'reduce' });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await page.check('input[name="sign"][value="interior"]');
      await page.click('#check-tool button[type=submit]');
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
