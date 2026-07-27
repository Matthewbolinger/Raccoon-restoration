/* Raccoon Restoration — interactions
   Everything here is progressive enhancement: the page is fully usable without it. */
(function () {
  'use strict';

  /* Set the JS gate FIRST, before anything that could throw, so a later error
     can never leave reveal-gated content permanently hidden. */
  document.documentElement.classList.add('js');
})();

(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Sticky header state ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('mobile-menu');
  var main = document.getElementById('main');
  var footer = document.querySelector('.site-footer');

  if (toggle && menu) {
    var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

    var callBarEl = document.getElementById('call-bar');
    var skipLink = document.querySelector('.skip-link');
    var setInert = function (on) {
      [main, footer, header, callBarEl, skipLink].forEach(function (el) {
        if (!el) return;
        if (on) { el.setAttribute('inert', ''); }
        else { el.removeAttribute('inert'); }
      });
      // the toggle lives inside the header, so keep it reachable
      if (on && header) header.removeAttribute('inert');
    };

    var closeMenu = function (returnFocus) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      menu.hidden = true;
      document.body.classList.remove('menu-open');
      setInert(false);
      if (returnFocus) toggle.focus();
    };

    var openMenu = function () {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      menu.hidden = false;
      document.body.classList.add('menu-open');
      setInert(true);
      var first = menu.querySelector('a');
      if (first) first.focus();
    };

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      open ? closeMenu(true) : openMenu();
    });

    var closeBtn = menu.querySelector('.menu-close');
    if (closeBtn) closeBtn.addEventListener('click', function () { closeMenu(true); });

    /* Move focus to the destination rather than dropping it on <body>. */
    menu.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      closeMenu(false);
      if (!link) return;
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      window.setTimeout(function () {
        var heading = target.querySelector('h1, h2, h3') || target;
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }, 60);
    });

    /* Keep focus inside the overlay while it is open (WCAG 2.2 §2.4.11). */
    document.addEventListener('keydown', function (e) {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') { closeMenu(true); return; }
      if (e.key !== 'Tab') return;

      var items = [toggle].concat(Array.prototype.slice.call(menu.querySelectorAll(FOCUSABLE)));
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

  /* ---------- Scroll reveals ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Hero roof-assembly build-on ---------- */
  var fig = document.querySelector('.hero-fig');
  if (fig && !reducedMotion.matches) {
    window.setTimeout(function () { fig.classList.add('drawing'); }, 250);
  }

  /* ---------- Before / after slider ----------
     --cut is the LEFT inset on the damaged pane, so a LOW value reveals MORE
     damage. The announcement has to follow that, not the raw number. */
  var baViewport = document.getElementById('ba-viewport');
  var baRange = document.getElementById('ba-range');
  if (baViewport && baRange) {
    var setCut = function () {
      var v = Number(baRange.value);
      baViewport.style.setProperty('--cut', v + '%');
      baRange.setAttribute('aria-valuetext', v + '% restored, ' + (100 - v) + '% storm-damaged');
    };
    baRange.addEventListener('input', setCut);
    setCut();
  }

  /* ---------- Mobile call bar ----------
     Hidden while the contact section is on screen — it would be redundant. */
  var callBar = document.getElementById('call-bar');
  var contact = document.getElementById('contact');
  if (callBar && contact && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        callBar.classList.toggle('is-hidden', e.isIntersecting);
      });
    }, { threshold: 0.16 }).observe(contact);
  }

  /* ---------- Contact form ----------
     novalidate is applied HERE, not in markup: a no-JS visitor must keep the
     browser's own constraint validation, since this replacement never loads. */
  var form = document.getElementById('contact-form');
  if (form) form.noValidate = true;
  var note = document.getElementById('form-note');

  function showError(input, show) {
    var field = input.closest('.field');
    var msg = field && field.querySelector('.field-error');
    if (field) field.classList.toggle('invalid', show);
    if (msg) {
      msg.hidden = !show;
      /* Only describe the field while the error is actually showing. A
         permanent aria-describedby pointing at hidden text gets spoken on
         every focus, before anything is wrong. */
      if (show) input.setAttribute('aria-describedby', msg.id);
      else input.removeAttribute('aria-describedby');
    }
    input.setAttribute('aria-invalid', show ? 'true' : 'false');
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      var invalid = [];
      form.querySelectorAll('[required]').forEach(function (input) {
        var ok = input.checkValidity();
        showError(input, !ok);
        if (!ok) invalid.push(input);
      });

      if (invalid.length) {
        e.preventDefault();
        if (note) {
          note.textContent = invalid.length === 1
            ? 'One field still needs attention.'
            : invalid.length + ' fields still need attention.';
          note.classList.remove('sent');
        }
        window.setTimeout(function () { invalid[0].focus(); }, 120);
        return;
      }

      /* Endpoint not wired yet: fall back to a prefilled mail client rather
         than silently pretending the message was sent. */
      if (form.action.indexOf('FORM_ENDPOINT') !== -1) {
        e.preventDefault();
        var get = function (name) {
          var el = form.elements[name];
          return el ? el.value.trim() : '';
        };
        var body = [
          'Name: ' + get('name'),
          'Phone: ' + get('phone'),
          'Email: ' + get('email'),
          'Needs: ' + get('service'),
          '',
          get('message')
        ].join('\n');
        window.location.href = 'mailto:info@raccoonrestoration.com' +
          '?subject=' + encodeURIComponent('Inspection request — ' + get('name')) +
          '&body=' + encodeURIComponent(body);
        if (note) {
          note.textContent = 'Opening your email app — or call (224) 500-6825.';
          note.classList.add('sent');
        }
      }
    });

    var NOTE_DEFAULT = note ? note.textContent : '';
    form.addEventListener('input', function (e) {
      if (!e.target.matches('[required]')) return;
      if (e.target.checkValidity()) showError(e.target, false);
      // restore the reassurance line once nothing is outstanding
      var stillInvalid = form.querySelectorAll('.field.invalid').length;
      if (!stillInvalid && note && !note.classList.contains('sent')) {
        note.textContent = NOTE_DEFAULT;
      }
    });
  }

  /* ---------- Storm Check ----------
     An honest self-assessment: real service-area data and transparent logic.
     It never invents storm history — it tells you what your own answers mean. */
  var checkTool = document.getElementById('check-tool');
  var checkResult = document.getElementById('check-result');
  if (checkTool) checkTool.noValidate = true;

  // ZIPs actually covered by the Barrington and Spring offices.
  var IL_ZIPS = ['60010', '60011', '60021', '60047', '60067', '60074', '60078',
                 '60004', '60005', '60006', '60169', '60179', '60192',
                 '60012', '60014', '60039', '60102', '60103'];
  var TX_ZIPS = ['77373', '77375', '77377', '77379', '77380', '77381', '77382',
                 '77384', '77385', '77386', '77388', '77389', '77391',
                 '77301', '77302', '77303', '77304', '77306'];

  if (checkTool && checkResult) {
    checkTool.addEventListener('submit', function (e) {
      e.preventDefault();

      var zip = (checkTool.elements.zip.value || '').trim();
      var age = (checkTool.querySelector('input[name="age"]:checked') || {}).value || 'unknown';
      var signs = Array.prototype.slice
        .call(checkTool.querySelectorAll('input[name="sign"]:checked'))
        .map(function (i) { return i.value; });

      // score: transparent and deliberately conservative
      var score = 0;
      if (age === 'old') score += 2;
      else if (age === 'mid') score += 1;
      if (signs.indexOf('granules') > -1) score += 1;
      if (signs.indexOf('dents') > -1) score += 2;
      if (signs.indexOf('shingles') > -1) score += 2;
      if (signs.indexOf('interior') > -1) score += 3;
      if (signs.indexOf('storm') > -1) score += 2;

      var inIL = IL_ZIPS.indexOf(zip) > -1;
      var inTX = TX_ZIPS.indexOf(zip) > -1;
      var served = inIL || inTX;
      var known = /^[0-9]{5}$/.test(zip);

      var level, headline, body;
      if (score >= 6) {
        level = 'high';
        headline = 'Worth an inspection soon.';
        body = 'Several of those signs together — especially interior staining or impact dents — are the pattern that usually turns into a legitimate claim. Storm damage claims also have filing deadlines, so this is the one case where waiting genuinely costs you something.';
      } else if (score >= 3) {
        level = 'mid';
        headline = 'Worth a look, no urgency.';
        body = 'What you are describing is consistent with normal wear, but it can also be early storm damage — the two look identical from the ground, which is exactly why a documented inspection is useful. A free one gives you a dated photo baseline either way.';
      } else {
        level = 'low';
        headline = 'Probably nothing. Genuinely.';
        body = 'Nothing you have described suggests active damage. Keep an eye on the gutters after the next hailstorm, and get a documented baseline at some point so you can prove what the roof looked like before. There is no need to rush.';
      }

      var area = served
        ? '<p class="check-area is-served"><strong>' + zip + '</strong> is inside our ' +
          (inIL ? 'Barrington, IL' : 'Spring, TX') + ' service area.</p>'
        : known
          ? '<p class="check-area">We may not cover <strong>' + zip + '</strong> directly — call and we will tell you honestly, and point you to someone good if it is not us.</p>'
          : zip
            ? '<p class="check-area">“' + zip.replace(/[<>&]/g, '') + '” isn\'t a complete ZIP code — add all five digits and we will confirm your service area.</p>'
            : '<p class="check-area">Add your ZIP and we will confirm whether you are in our service area.</p>';

      checkResult.innerHTML =
        '<div class="check-card is-' + level + '">' +
          '<h3 class="check-verdict" tabindex="-1">' + headline + '</h3>' +
          '<p>' + body + '</p>' +
          area +
          '<div class="check-actions">' +
            '<a class="btn btn-amber btn-small" href="#contact">Book a free inspection</a>' +
            '<a class="btn btn-line btn-small" href="tel:+12245006825">Call (224) 500-6825</a>' +
          '</div>' +
          '<p class="check-disclaimer">This is a guide based on what you told us, not an inspection or a coverage determination. Only a look at the actual roof settles it.</p>' +
        '</div>';

      checkResult.classList.add('has-result');
      /* Bring the answer into view before focusing it. On a phone the submit
         button sits low, so the result card otherwise renders below the fold
         with no cue that anything happened. */
      var verdict = checkResult.querySelector('.check-verdict');
      if (verdict) {
        /* Focus the heading and let THAT be the announcement. Writing into a
           polite live region and focusing inside it in the same tick makes
           screen readers double-read or truncate. */
        checkResult.removeAttribute('aria-live');
        checkResult.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        window.setTimeout(function () { verdict.focus(); }, 60);
      }
    });
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
