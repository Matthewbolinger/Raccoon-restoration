/* Raccoon Restoration — interactions
   Everything here is progressive enhancement: the page is fully usable without it. */
(function () {
  'use strict';

  var docEl = document.documentElement;
  docEl.classList.add('js'); // gates reveal-hiding so a JS failure never hides content

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Sticky header shadow ---------- */
  var header = document.querySelector('.site-header');
  var onScroll = function () {
    header.classList.toggle('scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    var closeMenu = function (returnFocus) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      menu.hidden = true;
      document.body.classList.remove('menu-open');
      if (returnFocus) toggle.focus();
    };
    var openMenu = function () {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      menu.hidden = false;
      document.body.classList.add('menu-open');
      var first = menu.querySelector('a');
      if (first) first.focus();
    };
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      open ? closeMenu(true) : openMenu();
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
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
    // small delay so layers assemble as the hero settles in
    window.setTimeout(function () { fig.classList.add('drawing'); }, 250);
  }

  /* ---------- Before / after slider ---------- */
  var baViewport = document.getElementById('ba-viewport');
  var baRange = document.getElementById('ba-range');
  if (baViewport && baRange) {
    var setCut = function () {
      var v = Number(baRange.value);
      baViewport.style.setProperty('--cut', v + '%');
      baRange.setAttribute(
        'aria-valuetext',
        v + ' percent — ' + (v < 50 ? 'mostly restored view' : v > 50 ? 'mostly storm-damaged view' : 'even split')
      );
    };
    baRange.addEventListener('input', setCut);
    setCut();
  }

  /* ---------- Contact form (static-host friendly) ---------- */
  var form = document.getElementById('contact-form');
  var note = document.getElementById('form-note');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll('[required]').forEach(function (input) {
        var field = input.closest('.field');
        var ok = input.checkValidity();
        if (field) field.classList.toggle('invalid', !ok);
        if (!ok) valid = false;
      });
      if (!valid) {
        if (note) {
          note.textContent = 'Please fill in your name, phone, and a valid email.';
          note.classList.remove('sent');
        }
        var firstInvalid = form.querySelector('.field.invalid input');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      // No backend on a static host: hand off to the visitor's mail client,
      // prefilled. Swap for a form endpoint (see README) when one is wired up.
      var get = function (name) {
        var el = form.elements[name];
        return el ? el.value.trim() : '';
      };
      var subject = 'Inspection request — ' + get('name');
      var body = [
        'Name: ' + get('name'),
        'Phone: ' + get('phone'),
        'Email: ' + get('email'),
        'Needs: ' + get('service'),
        '',
        get('message')
      ].join('\n');
      window.location.href =
        'mailto:info@raccoonrestoration.com' +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      if (note) {
        note.textContent = 'Opening your email app — or call us at (224) 500-6825.';
        note.classList.add('sent');
      }
    });
    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field');
      if (field && field.classList.contains('invalid') && e.target.checkValidity()) {
        field.classList.remove('invalid');
      }
    });
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
