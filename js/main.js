/* Raccoon Restoration — interactions
   Everything here is progressive enhancement: the page is fully usable without it. */
(function () {
  'use strict';

  /* Mark enhanced UI immediately. Reveal effects use a separate reveal-ready
     gate that is added only after their observer is fully installed. */
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

    var skipLink = document.querySelector('.skip-link');
    var headerSiblings = header ? [
      header.querySelector('.brand'),
      header.querySelector('.site-nav'),
      header.querySelector('.header-phone'),
      header.querySelector('.header-call-icon'),
      header.querySelector('.header-actions .btn-small')
    ].filter(Boolean) : [];
    var setInert = function (on) {
      [main, footer, skipLink].concat(headerSiblings).forEach(function (el) {
        if (!el) return;
        if (on) { el.setAttribute('inert', ''); }
        else { el.removeAttribute('inert'); }
      });
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
      /* Cycle explicitly instead of relying on the browser's default Tab
         order. WebKit can be configured to skip links, which otherwise drops
         focus onto <body> after the first menu item. */
      e.preventDefault();
      var current = items.indexOf(document.activeElement);
      if (current < 0) {
        items[0].focus();
        return;
      }
      var next = e.shiftKey
        ? (current - 1 + items.length) % items.length
        : (current + 1) % items.length;
      items[next].focus();
    });

    /* A breakpoint change must never hide the only control that can close the
       modal. Hand the page back to desktop navigation before the toggle goes. */
    var mobileMenuMode = window.matchMedia('(max-width: 940px)');
    var syncMenuMode = function (event) {
      if (!event.matches && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu(false);
      }
    };
    if (mobileMenuMode.addEventListener) {
      mobileMenuMode.addEventListener('change', syncMenuMode);
    }
    document.documentElement.classList.add('menu-ready');
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
    document.documentElement.classList.add('reveal-ready');
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Hero roof-assembly build-on ---------- */
  var fig = document.querySelector('.hero-fig');
  if (fig && !reducedMotion.matches) {
    window.setTimeout(function () { fig.classList.add('drawing'); }, 250);
  }

  /* ---------- Responsive service register ---------- */
  var servicesList = document.getElementById('services-list');
  var servicesPrev = document.getElementById('services-prev');
  var servicesNext = document.getElementById('services-next');
  var servicesStatus = document.getElementById('services-rail-status');
  if (servicesList && servicesPrev && servicesNext && servicesStatus) {
    var serviceCards = Array.prototype.slice.call(servicesList.querySelectorAll('.service-card'));
    var serviceRailMode = window.matchMedia('(max-width: 940px)');
    var serviceIndex = 0;
    var serviceScrollFrame = 0;
    var serviceScrollTimer = 0;
    var serviceHeightFrame = 0;

    var syncServiceHeight = function (index) {
      if (serviceHeightFrame) cancelAnimationFrame(serviceHeightFrame);
      serviceHeightFrame = requestAnimationFrame(function () {
        serviceHeightFrame = 0;
        if (!serviceRailMode.matches) {
          servicesList.style.removeProperty('height');
          return;
        }
        var card = serviceCards[index];
        if (!card) return;
        var style = getComputedStyle(servicesList);
        var extras = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) +
          parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
        servicesList.style.height = Math.ceil(card.getBoundingClientRect().height + extras) + 'px';
      });
    };

    var announceService = function (index, force) {
      var next = Math.max(0, Math.min(serviceCards.length - 1, index));
      var changed = next !== serviceIndex || force || !servicesStatus.dataset.ready;
      serviceIndex = next;
      var title = serviceCards[serviceIndex].querySelector('h3');
      if (changed) {
        servicesStatus.textContent = 'Service ' + (serviceIndex + 1) + ' of ' +
          serviceCards.length + (title ? ' · ' + title.textContent.trim() : '');
        servicesStatus.dataset.ready = 'true';
      }
      servicesPrev.disabled = serviceIndex === 0;
      servicesNext.disabled = serviceIndex === serviceCards.length - 1;
      syncServiceHeight(serviceIndex);
    };

    var nearestService = function () {
      var railLeft = servicesList.getBoundingClientRect().left;
      var best = 0;
      var distance = Infinity;
      serviceCards.forEach(function (card, index) {
        var delta = Math.abs(card.getBoundingClientRect().left - railLeft);
        if (delta < distance) { distance = delta; best = index; }
      });
      announceService(best);
    };

    var goToService = function (index) {
      var next = Math.max(0, Math.min(serviceCards.length - 1, index));
      var cardRect = serviceCards[next].getBoundingClientRect();
      var railRect = servicesList.getBoundingClientRect();
      servicesList.scrollTo({
        left: servicesList.scrollLeft + cardRect.left - railRect.left,
        behavior: reducedMotion.matches ? 'auto' : 'smooth'
      });
      announceService(next);
    };

    servicesPrev.addEventListener('click', function () { goToService(serviceIndex - 1); });
    servicesNext.addEventListener('click', function () { goToService(serviceIndex + 1); });
    servicesList.addEventListener('scroll', function () {
      if (serviceScrollFrame) cancelAnimationFrame(serviceScrollFrame);
      if (serviceScrollTimer) clearTimeout(serviceScrollTimer);
      serviceScrollFrame = requestAnimationFrame(function () {
        serviceScrollFrame = 0;
        serviceScrollTimer = window.setTimeout(nearestService, 140);
      });
    }, { passive: true });
    servicesList.addEventListener('keydown', function (event) {
      if (!serviceRailMode.matches) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); goToService(serviceIndex - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); goToService(serviceIndex + 1); }
      if (event.key === 'Home') { event.preventDefault(); goToService(0); }
      if (event.key === 'End') { event.preventDefault(); goToService(serviceCards.length - 1); }
    });

    var syncServiceMode = function () {
      if (serviceRailMode.matches) {
        servicesList.setAttribute('aria-roledescription', 'carousel');
        servicesList.setAttribute('tabindex', '0');
        announceService(serviceIndex, true);
      } else {
        servicesList.removeAttribute('aria-roledescription');
        servicesList.removeAttribute('tabindex');
        servicesList.scrollLeft = 0;
        announceService(0, true);
      }
    };
    syncServiceMode();
    if (serviceRailMode.addEventListener) serviceRailMode.addEventListener('change', syncServiceMode);
    if ('ResizeObserver' in window) {
      var serviceSizeObserver = new ResizeObserver(function () {
        syncServiceHeight(serviceIndex);
      });
      serviceCards.forEach(function (card) { serviceSizeObserver.observe(card); });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { syncServiceHeight(serviceIndex); });
    }
    document.documentElement.classList.add('services-ready');
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
      baRange.setAttribute(
        'aria-valuetext',
        v + '% illustrated restored, ' + (100 - v) + '% illustrated storm condition'
      );
    };
    baRange.addEventListener('input', setCut);
    setCut();
    document.documentElement.classList.add('comparison-ready');
  }

  /* ---------- Contact form ---------- */
  var form = document.getElementById('contact-form');
  var note = document.getElementById('form-note');

  function setDescription(input, id, add) {
    var ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    var next = ids.filter(function (item) { return item !== id; });
    if (add) next.push(id);
    if (next.length) input.setAttribute('aria-describedby', next.join(' '));
    else input.removeAttribute('aria-describedby');
  }

  function showError(input, show, messageId) {
    var field = input.closest('.field');
    var msg = messageId ? document.getElementById(messageId) : field && field.querySelector('.field-error');
    if (field) field.classList.toggle('invalid', show);
    if (msg) {
      msg.hidden = !show;
      setDescription(input, msg.id, show);
    }
    input.setAttribute('aria-invalid', show ? 'true' : 'false');
  }

  if (form) {
    var nameInput = document.getElementById('f-name');
    var phone = document.getElementById('f-phone');
    var email = document.getElementById('f-email');
    var propertyZip = document.getElementById('f-zip');
    var message = document.getElementById('f-message');
    var contactError = document.getElementById('e-contact');

    var nameIsValid = function () {
      return !!nameInput && !!nameInput.value.trim() && nameInput.checkValidity();
    };
    var phoneIsValid = function () {
      if (!phone || !phone.value.trim()) return true;
      var digits = phone.value.replace(/\D/g, '');
      return phone.checkValidity() && digits.length >= 7 && digits.length <= 15;
    };
    var emailIsValid = function () {
      return !email || !email.value.trim() || email.checkValidity();
    };
    var messageIsValid = function () {
      return !message || message.value.length <= 1000;
    };

    var showContactError = function (show) {
      if (contactError) contactError.hidden = !show;
      [phone, email].forEach(function (input) {
        if (!input) return;
        setDescription(input, 'e-contact', show);
        if (show) input.setAttribute('aria-invalid', 'true');
        else if (!input.closest('.field').classList.contains('invalid')) {
          input.setAttribute('aria-invalid', 'false');
        }
      });
    };

    form.addEventListener('submit', function (e) {
      var invalid = [];
      form.querySelectorAll('[required]').forEach(function (input) {
        var ok = input === nameInput ? nameIsValid() : input.checkValidity();
        showError(input, !ok);
        if (!ok) invalid.push(input);
      });

      var phoneEntered = phone && phone.value.trim();
      var emailEntered = email && email.value.trim();
      var phoneOk = phoneIsValid();
      var emailOk = emailIsValid();
      showError(phone, !phoneOk, 'e-phone');
      showError(email, !emailOk, 'e-email');
      if (!phoneOk) invalid.push(phone);
      if (!emailOk) invalid.push(email);

      var zipEntered = propertyZip && propertyZip.value.trim();
      var zipOk = !zipEntered || propertyZip.checkValidity();
      showError(propertyZip, !zipOk, 'e-zip');
      if (!zipOk) invalid.push(propertyZip);

      var messageOk = messageIsValid();
      showError(message, !messageOk, 'e-message');
      if (!messageOk) invalid.push(message);

      var contactMissing = !phoneEntered && !emailEntered;
      showContactError(contactMissing);
      if (contactMissing) invalid.push(phone || email);

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

      /* Explicit interim delivery mode: prepare a message in the visitor's
         email client. This is not presented as a submitted web lead. */
      if (form.dataset.delivery === 'email-client') {
        e.preventDefault();
        var get = function (name) {
          var el = form.elements[name];
          return el ? el.value.trim() : '';
        };
        var body = [
          'Name: ' + get('name'),
          'Phone: ' + get('phone'),
          'Email: ' + get('email'),
          'Property ZIP: ' + get('zip'),
          'Needs: ' + get('service'),
          '',
          get('message')
        ].join('\n');
        var mailtoUri = 'mailto:info@raccoonrestoration.com' +
          '?subject=' + encodeURIComponent('Inspection request — ' + get('name')) +
          '&body=' + encodeURIComponent(body);
        if (mailtoUri.length > 2000) {
          showError(message, true, 'e-message');
          if (note) {
            note.textContent = 'The prepared email is too long. Shorten the note and try again.';
            note.classList.remove('sent');
          }
          window.setTimeout(function () { message.focus(); }, 120);
          return;
        }
        var preparedEvent = new CustomEvent('emailrequestprepared', {
          bubbles: true,
          cancelable: true,
          detail: { uri: mailtoUri }
        });
        if (form.dispatchEvent(preparedEvent)) window.location.href = mailtoUri;
        if (note) {
          note.textContent = 'Opening your email app — nothing has been sent yet.';
          note.classList.add('sent');
        }
      }
    });

    var NOTE_DEFAULT = note ? note.textContent : '';
    form.addEventListener('input', function (e) {
      if (e.target.matches('[required]')) {
        var requiredOk = e.target === nameInput ? nameIsValid() : e.target.checkValidity();
        showError(e.target, !requiredOk);
      }
      if (e.target === phone || e.target === email) {
        var contactValueOk = e.target === phone ? phoneIsValid() : emailIsValid();
        showError(e.target, !contactValueOk,
          e.target === phone ? 'e-phone' : 'e-email');
        showContactError(!phone.value.trim() && !email.value.trim());
      }
      if (e.target === propertyZip) {
        showError(propertyZip, !!propertyZip.value.trim() && !propertyZip.checkValidity(), 'e-zip');
      }
      if (e.target === message) showError(message, !messageIsValid(), 'e-message');
      // restore the delivery explanation once nothing is outstanding
      var stillInvalid = form.querySelectorAll('.field.invalid').length;
      if (!stillInvalid && contactError.hidden && note && !note.classList.contains('sent')) {
        note.textContent = NOTE_DEFAULT;
      }
    });
    document.documentElement.classList.add('form-ready');
  }

  /* ---------- Groundline brief ----------
     Deterministic routing based only on observations the visitor selects.
     This never diagnoses, verifies weather, or claims service coverage. */
  var checkTool = document.getElementById('check-tool');
  var checkResult = document.getElementById('check-result');

  if (checkTool && checkResult) {
    var SIGN_LABELS = {
      granules: 'Granules near a downspout or gutter outlet',
      dents: 'Dents in gutters, vents, or downspouts',
      shingles: 'Missing, lifted, cracked, or curled shingles',
      interior: 'Active water or staining on a ceiling or wall',
      storm: 'A recent hail or heavy-wind event you observed'
    };
    var AGE_LABELS = {
      new: 'Under 10 years',
      mid: '10–20 years',
      old: 'Over 20 years',
      unknown: 'Not sure'
    };
    var ROUTES = {
      water: {
        level: 'high',
        headline: 'Active water calls for a safety-first response.',
        reason: 'You selected active water or interior staining. This tool cannot identify the source or determine who is available. Scheduling must be confirmed directly.',
        actions: [
          'Keep people away from wet ceilings, light fixtures, and visibly unstable materials.',
          'From a safe floor-level position, note when and where you saw the water and photograph it.',
          'Contact an appropriate local professional. You can call Raccoon to ask whether an inspection is available for your property.'
        ]
      },
      shingles: {
        level: 'mid',
        headline: 'Schedule a closer inspection.',
        reason: 'You selected a visible shingle change. A ground-level view cannot show the full roof assembly or determine the repair.',
        actions: [
          'Stay on the ground; do not lift, replace, or walk on the shingles.',
          'Photograph the visible change from more than one safe ground-level angle and note the date.',
          'Arrange an inspection and ask which roof and exterior conditions will be documented.'
        ]
      },
      record: {
        level: 'mid',
        headline: 'Build a ground-level record.',
        reason: 'You selected exterior marks, granules, or a weather event you observed. Those details are useful context, not a diagnosis.',
        actions: [
          'Stay on the ground and photograph each visible dent, granule deposit, or exterior change.',
          'Write down when you first noticed the condition and any weather event you personally observed.',
          'Arrange an inspection if the change persists or you remain concerned, and bring this brief.'
        ]
      },
      none: {
        level: 'low',
        headline: 'No listed warning signs selected.',
        reason: 'Your selections do not include one of the visible conditions in this short brief. That does not clear the roof or rule out hidden damage.',
        actions: [
          'Do not climb onto the roof to search for a condition you cannot see from the ground.',
          'Save a dated ground-level photo so you have a safe visual reference after future weather.',
          'Arrange an inspection if you notice a change or remain concerned about the roof.'
        ]
      }
    };

    var makeElement = function (tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (typeof text === 'string') node.textContent = text;
      return node;
    };

    var copyBrief = function (textToCopy, card, status) {
      var showFallback = function () {
        var existing = card.querySelector('.check-copy-fallback');
        if (existing) existing.remove();
        var fallback = makeElement('textarea', 'check-copy-fallback');
        fallback.setAttribute('aria-label', 'Action plan text to copy');
        fallback.value = textToCopy;
        card.insertBefore(fallback, status);
        fallback.focus();
        fallback.select();
        status.textContent = 'Automatic copy was unavailable. The full plan is selected above.';
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(function () {
          status.textContent = 'Action plan copied.';
        }).catch(showFallback);
        return;
      }

      var temporary = makeElement('textarea');
      temporary.value = textToCopy;
      temporary.setAttribute('readonly', '');
      temporary.style.position = 'fixed';
      temporary.style.opacity = '0';
      document.body.appendChild(temporary);
      temporary.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
      temporary.remove();
      if (copied) status.textContent = 'Action plan copied.';
      else showFallback();
    };

    checkTool.addEventListener('submit', function (e) {
      e.preventDefault();

      var age = (checkTool.querySelector('input[name="age"]:checked') || {}).value || 'unknown';
      var signs = Array.prototype.slice
        .call(checkTool.querySelectorAll('input[name="sign"]:checked'))
        .map(function (i) { return i.value; });

      var routeKey = signs.indexOf('interior') > -1
        ? 'water'
        : signs.indexOf('shingles') > -1
          ? 'shingles'
          : signs.some(function (sign) { return sign === 'granules' || sign === 'dents' || sign === 'storm'; })
            ? 'record'
            : 'none';
      var route = ROUTES[routeKey];
      var selectedLabels = signs.map(function (sign) { return SIGN_LABELS[sign]; });
      if (!selectedLabels.length) selectedLabels.push('No listed observations selected');

      var card = makeElement('div', 'check-card is-' + route.level);
      var heading = makeElement('h3', 'check-verdict', route.headline);
      heading.setAttribute('tabindex', '-1');
      card.appendChild(heading);
      card.appendChild(makeElement('p', 'check-card-label', 'Why this result appeared'));
      card.appendChild(makeElement('p', 'check-reason',
        route.reason + ' Roof age reported: ' + AGE_LABELS[age] + '.'));

      card.appendChild(makeElement('p', 'check-card-label', 'Observations in this brief'));
      var observationList = makeElement('ul', 'check-observations');
      selectedLabels.forEach(function (label) {
        observationList.appendChild(makeElement('li', '', label));
      });
      card.appendChild(observationList);

      card.appendChild(makeElement('p', 'check-card-label', 'Three next actions'));
      var actionList = makeElement('ol', 'check-action-list');
      route.actions.forEach(function (action) {
        actionList.appendChild(makeElement('li', '', action));
      });
      card.appendChild(actionList);

      var disclaimerText = 'This action plan reflects only the observations you selected. ' +
        'It is not an inspection, diagnosis, weather verification, service-area result, ' +
        'or insurance coverage determination.';
      var briefText = [
        'Groundline observation brief',
        'Roof age: ' + AGE_LABELS[age],
        'Observations: ' + selectedLabels.join('; '),
        '',
        route.headline,
        route.reason,
        '',
        'Next actions:',
        '1. ' + route.actions[0],
        '2. ' + route.actions[1],
        '3. ' + route.actions[2],
        '',
        disclaimerText
      ].join('\n');

      var actions = makeElement('div', 'check-actions');
      var call = makeElement('a', 'btn btn-amber btn-small', 'Call (224) 500-6825');
      call.href = 'tel:+12245006825';
      var use = makeElement('button', 'btn btn-line btn-small', 'Use this in my request');
      use.type = 'button';
      var copy = makeElement('button', 'btn btn-line btn-small', 'Copy action plan');
      copy.type = 'button';
      actions.appendChild(call);
      actions.appendChild(use);
      actions.appendChild(copy);
      card.appendChild(actions);

      var copyStatus = makeElement('p', 'check-copy-status');
      copyStatus.setAttribute('role', 'status');
      copyStatus.setAttribute('aria-live', 'polite');
      card.appendChild(copyStatus);
      card.appendChild(makeElement('p', 'check-disclaimer', disclaimerText));

      use.addEventListener('click', function () {
        var service = document.getElementById('f-service');
        var message = document.getElementById('f-message');
        var contactSection = document.getElementById('contact');
        if (service) service.value = 'Storm damage inspection';
        if (message) message.value = briefText;
        if (contactSection) contactSection.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        window.setTimeout(function () {
          if (message) message.focus({ preventScroll: true });
        }, reducedMotion.matches ? 0 : 450);
      });
      copy.addEventListener('click', function () { copyBrief(briefText, card, copyStatus); });

      checkResult.replaceChildren(card);

      checkResult.classList.add('has-result');
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
        block: 'start'
      });
    });
    document.documentElement.classList.add('groundline-ready');
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Initial fragment alignment ----------
     Responsive enhancements above can remove several screens of layout after
     the browser has already restored an initial #fragment. Re-align once the
     page and its intrinsic-size assets are settled so the sticky header never
     covers the destination. This lives in the base bundle because mobile and
     reduced-motion visitors intentionally do not download storm.js. */
  var alignCurrentHash = function () {
    if (!location.hash || location.hash.length < 2) return;
    var target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch (error) { target = null; }
    if (!target) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var root = document.documentElement;
        var previous = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        target.scrollIntoView({ block: 'start' });
        root.style.scrollBehavior = previous;
      });
    });
  };
  var settleInitialHash = function () {
    alignCurrentHash();
    window.setTimeout(alignCurrentHash, 120);
  };
  if (document.readyState === 'complete') settleInitialHash();
  else window.addEventListener('load', settleInitialHash, { once: true });
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) settleInitialHash();
  });

  /* ---------- Conditional Storm Sequence loader ----------
     Mobile, reduced-motion, and Save-Data visitors receive the complete static
     comparison without downloading the desktop-only canvas renderer. */
  var stormWide = window.matchMedia('(min-width: 941px)');
  var stormSaveData = navigator.connection && navigator.connection.saveData;
  var stormRequested = false;
  var requestStorm = function () {
    if (stormRequested || stormSaveData || !stormWide.matches || reducedMotion.matches) return;
    stormRequested = true;
    var script = document.createElement('script');
    script.src = 'js/storm.js';
    script.async = true;
    script.dataset.stormRenderer = 'true';
    document.body.appendChild(script);
  };
  requestStorm();
  if (stormWide.addEventListener) stormWide.addEventListener('change', requestStorm);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', requestStorm);
})();
