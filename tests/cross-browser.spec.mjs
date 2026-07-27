import { BASE, VIEWPORTS } from './site.spec.mjs';

export function makeCrossBrowserTests({ browserName, axePath }) {
  const tests = [];
  const test = (name, fn) => tests.push({ name: `${browserName}: ${name}`, fn });

  test('desktop and mobile load without runtime errors', async (browser) => {
    for (const viewport of [VIEWPORTS.mobile, VIEWPORTS.desktop]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      const state = await page.evaluate(() => ({
        title: document.title,
        logoWidth: document.querySelector('.brand-logo').naturalWidth,
        groundline: !!document.getElementById('groundline'),
      }));
      await page.close();
      if (errors.length || !/Raccoon Restoration/.test(state.title) ||
          state.logoWidth !== 1536 || !state.groundline) {
        throw new Error(JSON.stringify({ errors, state }));
      }
    }
  });

  test('320px reflow keeps content inside the viewport', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.reflow });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => {
      const width = window.innerWidth;
      const offenders = [...document.body.querySelectorAll('*')]
        .filter((el) => {
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          if (el.closest('.marquee, #art-defs, .mobile-menu[hidden]')) return false;
          if (el.closest('#services-list') && el.id !== 'services-list') return false;
          const rect = el.getBoundingClientRect();
          return rect.width && rect.height && (rect.left < -1 || rect.right > width + 1);
        })
        .slice(0, 10)
        .map((el) => el.id || el.className || el.tagName);
      return {
        offenders,
        bodyWidth: document.body.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    await page.close();
    if (state.bodyWidth > state.clientWidth + 1 || state.offenders.length) {
      throw new Error(JSON.stringify(state));
    }
  });

  test('reduced motion keeps the static restoration comparison', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    const state = await page.evaluate(() => ({
      live: document.querySelector('.storm').classList.contains('is-live'),
      trackHidden: document.querySelector('.storm-track').hidden,
      staticShown: getComputedStyle(document.querySelector('.storm-static')).display !== 'none',
      canvasWidth: document.getElementById('storm-canvas').width,
    }));
    await page.close();
    if (state.live || !state.trackHidden || !state.staticShown || state.canvasWidth) {
      throw new Error(JSON.stringify(state));
    }
  });

  test('mobile service rail and Groundline transfer work', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.mobile, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.click('#services-next');
    await page.check('input[name="sign"][value="interior"]');
    await page.click('#check-tool button[type="submit"]');
    await page.getByRole('button', { name: /use this in my request/i }).click();
    const state = await page.evaluate(() => ({
      serviceStatus: document.getElementById('services-rail-status').textContent,
      result: document.querySelector('.check-verdict').textContent,
      service: document.getElementById('f-service').value,
      message: document.getElementById('f-message').value,
    }));
    await page.close();
    if (!/Service 2 of 7/i.test(state.serviceStatus) ||
        !/Active water calls for a safety-first response/i.test(state.result) ||
        state.service !== 'Storm damage inspection' ||
        !/Groundline observation brief/.test(state.message)) {
      throw new Error(JSON.stringify(state));
    }
  });

  test('mobile menu traps focus and returns it on Escape', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.mobile });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.click('.nav-toggle');
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
    const inside = await page.evaluate(() =>
      !!document.activeElement.closest('#mobile-menu, .nav-toggle'));
    await page.keyboard.press('Escape');
    const returned = await page.evaluate(() =>
      document.activeElement === document.querySelector('.nav-toggle'));
    await page.close();
    if (!inside || !returned) throw new Error(JSON.stringify({ inside, returned }));
  });

  test('live breakpoint changes, menu cleanup, and desktop deep links stay coherent', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.tablet });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.click('.nav-toggle');
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(600);
    const resized = await page.evaluate(() => ({
      live: document.querySelector('.storm').classList.contains('is-live'),
      canvas: document.getElementById('storm-canvas').width,
      menuHidden: document.getElementById('mobile-menu').hidden,
      expanded: document.querySelector('.nav-toggle').getAttribute('aria-expanded'),
      bodyLocked: document.body.classList.contains('menu-open'),
      inert: document.getElementById('main').hasAttribute('inert'),
    }));
    await page.goto(`${BASE}/index.html#contact`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const linked = await page.evaluate(() => {
      const heading = document.getElementById('contact-title').getBoundingClientRect();
      const header = document.querySelector('.site-header').getBoundingClientRect();
      return { top: heading.top, bottom: heading.bottom, headerBottom: header.bottom, viewport: innerHeight };
    });
    await page.close();
    if (!resized.live || !resized.canvas || !resized.menuHidden ||
        resized.expanded !== 'false' || resized.bodyLocked || resized.inert ||
        linked.top < linked.headerBottom || linked.bottom > linked.viewport) {
      throw new Error(JSON.stringify({ resized, linked }));
    }
  });

  test('no-JS mobile fallbacks replace every enhanced-only control', async (browser) => {
    const context = await browser.newContext({
      viewport: VIEWPORTS.mobile,
      javaScriptEnabled: false,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
    const state = await page.evaluate(() => ({
      nav: getComputedStyle(document.querySelector('.nojs-nav')).display,
      toggle: getComputedStyle(document.querySelector('.nav-toggle')).display,
      services: getComputedStyle(document.getElementById('services-list')).display,
      serviceControls: getComputedStyle(document.querySelector('.services-rail-tools')).display,
      checkTool: getComputedStyle(document.getElementById('check-tool')).display,
      checkFallback: getComputedStyle(document.querySelector('.check-fallback')).display,
      range: getComputedStyle(document.getElementById('ba-range')).display,
      rangeFallback: getComputedStyle(document.querySelector('.ba-nojs')).display,
    }));
    await context.close();
    if (state.nav === 'none' || state.toggle !== 'none' || state.services !== 'grid' ||
        state.serviceControls !== 'none' || state.checkTool !== 'none' ||
        state.checkFallback === 'none' || state.range !== 'none' ||
        state.rangeFallback === 'none') {
      throw new Error(JSON.stringify(state));
    }
  });

  test('contact validation rejects whitespace names and formatting-only phones', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.__preparedCount = 0;
      document.getElementById('contact-form').addEventListener('emailrequestprepared', (event) => {
        event.preventDefault();
        window.__preparedCount++;
      });
    });
    const submit = () => page.evaluate(() => document.getElementById('contact-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.fill('#f-name', '   ');
    await page.fill('#f-email', 'person@example.com');
    await submit();
    const nameInvalid = await page.evaluate(() => !document.getElementById('e-name').hidden);
    await page.fill('#f-name', 'Test Homeowner');
    await page.fill('#f-email', '');
    await page.fill('#f-phone', '+++++++');
    await submit();
    const state = await page.evaluate(() => ({
      phoneInvalid: !document.getElementById('e-phone').hidden,
      prepared: window.__preparedCount,
    }));
    await page.close();
    if (!nameInvalid || !state.phoneInvalid || state.prepared) {
      throw new Error(JSON.stringify({ nameInvalid, state }));
    }
  });

  test('dynamic Groundline state has no automated accessibility violations', async (browser) => {
    const page = await browser.newPage({ viewport: VIEWPORTS.mobile, reducedMotion: 'reduce' });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.check('input[name="sign"][value="shingles"]');
    await page.click('#check-tool button[type="submit"]');
    await page.addScriptTag({ path: axePath });
    const violations = await page.evaluate(async () => {
      const result = await window.axe.run(document, {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      });
      return result.violations.map((violation) =>
        `${violation.id} (${violation.impact}, ${violation.nodes.length})`);
    });
    await page.close();
    if (violations.length) throw new Error(violations.join('; '));
  });

  return tests;
}
