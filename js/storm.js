/* ===========================================================================
   THE STORM SEQUENCE
   A scroll-scrubbed, four-act narrative rendered to a 2D canvas:
     I   Calm      — the house you never think about
     II  Storm     — hail and wind; shingles tear off, damage accrues
     III Scope     — the scene wireframes into a blueprint with illustrative
                     visible-condition callouts
     IV  Restored  — the assembly rebuilds deck-up and the house comes back

   Deliberately Canvas 2D, not WebGL: line drawing is the art direction and
   the sequence adds no browser-runtime dependency. Device-level render
   performance still requires representative field measurement.

   Progressive enhancement: this file only takes over above 940px when canvas
   is supported and the visitor has not asked for reduced motion. Otherwise
   the static before/after comparison in the markup is what ships.
   =========================================================================== */
(function () {
  'use strict';

  var section = document.querySelector('.storm');
  if (!section) return;

  var track = section.querySelector('.storm-track');
  var canvas = document.getElementById('storm-canvas');
  if (!track || !canvas || !canvas.getContext) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var wideLayout = window.matchMedia('(min-width: 941px)');
  var saveData = navigator.connection && navigator.connection.saveData;
  if (saveData) return;

  var ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  /* ---------- palette ---------- */
  var INK = '#F4F5F6';
  var AMBER = '#FFB200';
  var MUTED = '#A8AEB5';
  var DAMAGE = '#C2410C';
  var GRAPHITE = '#0E1114';

  /* ---------- virtual drawing space (matches the site's SVG house) ---------- */
  var VW = 760, VH = 560;

  var acts = Array.prototype.slice.call(section.querySelectorAll('.storm-act'));
  var rails = Array.prototype.slice.call(section.querySelectorAll('.storm-rail li'));

  var w = 0, h = 0, scale = 1, offX = 0, offY = 0, dpr = 1, narrow = false;
  var progress = 0, rendered = -1, running = false, rafId = 0;
  var lastActIndex = -1;
  var enhanced = false;
  var stormObserver = null;

  /* ---------- adaptive quality ----------
     The cost here is fill rate, not JS: a 1440x900 stage at DPR 2 repaints
     5.2 Mpx every frame. Batching draw calls barely moved it. So instead of
     claiming 60fps everywhere, measure and step the backing store down on
     hardware that can't hold the frame. Layout is unaffected — only raster
     resolution changes, and the drawing is line art, so it degrades softly. */
  var quality = 1;
  var slowFrames = 0, lastFrameAt = 0;

  var TIERS = [1, 0.7, 0.5, 0.36];
  var tier = 0;
  function degrade() {
    if (tier >= TIERS.length - 1) return false;
    quality = TIERS[++tier];
    resize();
    return true;
  }

  /* ---------- responsive sizing ---------- */
  function resize() {
    var rect = canvas.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    // cap DPR (fill rate, not detail), then scale by the measured quality tier
    dpr = Math.max(0.6, Math.min(window.devicePixelRatio || 1, 2) * quality);
    var bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;   // reallocates the backing store, so only when it changed
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Wide screens: the scene occupies the channel between the copy column and
       the act rail, so nothing overlaps. Narrow: centre it and let the copy
       sit over the top with a scrim behind it. */
    narrow = w < 940;
    if (!narrow) {
      /* The rail now sits along the bottom, so the drawing gets the whole
         right-hand channel instead of being squeezed to 46% of the stage. */
      scale = Math.min((w * 0.56) / VW, (h * 0.86) / VH);
      offX = w - VW * scale - w * 0.05;
      offY = (h - VH * scale) / 2 - h * 0.03;
    } else {
      // narrow fallback: copy in the upper third and scene above the act rail
      scale = Math.min((w * 0.86) / VW, (h * 0.40) / VH);
      offX = (w - VW * scale) / 2;
      offY = h - VH * scale - h * 0.20;
    }
    rendered = -1;
  }

  function vx(x) { return offX + x * scale; }
  function vy(y) { return offY + y * scale; }
  function vs(n) { return n * scale; }

  /* ---------- tiny helpers ---------- */
  function clamp(n, a, b) { return n < a ? a : n > b ? b : n; }
  // JS % keeps the sign of the dividend; weather needs a true positive wrap
  function wrap(v, m) { return ((v % m) + m) % m; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  // normalised progress inside a sub-range, eased
  function seg(p, from, to) { return clamp((p - from) / (to - from), 0, 1); }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  /* One beginPath/stroke for a whole set of segments. The house was issuing
     ~40 separate stroke calls per frame; batching by style cuts that to four. */
  function strokeSet(segs, color, width, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.6, vs(width));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < segs.length; i++) {
      var pts = segs[i];
      for (var j = 0; j < pts.length; j += 2) {
        var X = vx(pts[j]), Y = vy(pts[j + 1]);
        if (j === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function line(pts, color, width, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.6, vs(width));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < pts.length; i += 2) {
      var X = vx(pts[i]), Y = vy(pts[i + 1]);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function poly(pts, stroke, fill, width, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (var i = 0; i < pts.length; i += 2) {
      var X = vx(pts[i]), Y = vy(pts[i + 1]);
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(0.6, vs(width || 2));
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function rect(x, y, rw, rh, stroke, width, alpha) {
    poly([x, y, x + rw, y, x + rw, y + rh, x, y + rh], stroke, null, width, alpha);
  }

  function circle(cx, cy, r, stroke, fill, width, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(vx(cx), vy(cy), vs(r), 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(0.6, vs(width || 2)); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  function label(text, x, y, size, color, alpha, align) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = '600 ' + Math.max(8, vs(size)) + 'px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, vx(x), vy(y));
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  /* ---------- weather particles (fixed pools, no allocation in the loop) ---------- */
  var RAIN = [], HAIL = [];
  for (var i = 0; i < 190; i++) {
    RAIN.push({ x: Math.random() * VW, y: Math.random() * VH, len: 12 + Math.random() * 26, sp: 7 + Math.random() * 9 });
  }
  for (var j = 0; j < 34; j++) {
    HAIL.push({ x: Math.random() * VW, y: Math.random() * VH, r: 2 + Math.random() * 3.4, sp: 5 + Math.random() * 5, sw: Math.random() * 6 });
  }

  /* ---------- shingles that tear off in Act II ---------- */
  // scattered across the main roof triangle (150,252)-(300,116)-(450,252)
  var TABS = [];
  (function seedTabs() {
    /* Integer LCG state. Keeping the *normalised* value as state collapses the
       map to a fixed point (~0.2201) within three draws, which put all 16 tabs
       at the same coordinates with the same velocity — one shingle, drawn 16x. */
    var seed = 20260724;
    function rnd() {
      /* Math.imul, not `*`: 1103515245 * seed overflows 2^53, so plain
         multiplication is inexact and the low bits come out zero. */
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7FFFFFFF;
      return seed / 0x7FFFFFFF;
    }
    for (var k = 0; k < 16; k++) {
      var a = rnd(), b = rnd();
      if (a + b > 1) { a = 1 - a; b = 1 - b; }
      // barycentric point inside the roof triangle
      var x = 150 + a * (300 - 150) + b * (450 - 150);
      var y = 252 + a * (116 - 252) + b * (252 - 252);
      TABS.push({
        x: x, y: y,
        detach: 0.30 + rnd() * 0.60,          // when in Act II it lets go
        vx: 1.4 + rnd() * 2.6,
        vy: -0.7 - rnd() * 1.1,
        rot: (rnd() - 0.5) * 0.5
      });
    }
  })();

  /* ---------- illustrative condition callouts drawn in Act III ---------- */
  // ly values are spaced >= 44 apart per side so labels and their rules never stack
  var CALLOUTS = [
    { x: 232, y: 196, lx: 44,  ly: 120, t: 'HAIL-LIKE SURFACE MARKS' },
    { x: 356, y: 168, lx: 566, ly: 92,  t: 'CREASED SHINGLE TABS' },
    { x: 344, y: 140, lx: 566, ly: 150, t: 'RIDGE-CAP CONDITION' },
    { x: 452, y: 320, lx: 566, ly: 292, t: 'STEP-FLASHING CONDITION' },
    { x: 300, y: 264, lx: 44,  ly: 300, t: 'DECK MOISTURE INDICATOR' },
    { x: 500, y: 330, lx: 566, ly: 366, t: 'GUTTER IMPACT MARKS' }
  ];

  /* =========================================================================
     SCENE PARTS
     ========================================================================= */

  var _top = [0, 0, 0], _bot = [0, 0, 0];   // scratch, not reallocated per frame

  function drawSky(p) {
    // dusk -> storm -> blueprint -> dawn
    // CanvasGradient stops cannot be cleared, so this must be rebuilt as the
    // scene colors evolve rather than accumulating stops on a cached gradient.
    var g = ctx.createLinearGradient(0, 0, 0, h);
    var stormT = seg(p, 0.18, 0.46);
    var bpT = seg(p, 0.48, 0.60);
    var dawnT = seg(p, 0.78, 1);

    var top = _top, bot = _bot;
    top[0] = 16; top[1] = 20; top[2] = 25;
    bot[0] = 10; bot[1] = 13; bot[2] = 16;
    // storm darkens and cools
    top[0] = lerp(top[0], 18, stormT); top[1] = lerp(top[1], 22, stormT); top[2] = lerp(top[2], 28, stormT);
    // blueprint flattens to graphite
    top[0] = lerp(top[0], 14, bpT); top[1] = lerp(top[1], 17, bpT); top[2] = lerp(top[2], 20, bpT);
    // dawn warms the horizon
    bot[0] = lerp(bot[0], 46, dawnT); bot[1] = lerp(bot[1], 33, dawnT); bot[2] = lerp(bot[2], 14, dawnT);

    g.addColorStop(0, 'rgb(' + (top[0] | 0) + ',' + (top[1] | 0) + ',' + (top[2] | 0) + ')');
    g.addColorStop(1, 'rgb(' + (bot[0] | 0) + ',' + (bot[1] | 0) + ',' + (bot[2] | 0) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawGrid(alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = 'rgba(244,245,246,0.10)';
    ctx.lineWidth = 1;
    var step = vs(38);
    ctx.beginPath();
    for (var x = offX % step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (var y = offY % step; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawMoonSun(p) {
    var calm = 1 - seg(p, 0.14, 0.30);
    var dawn = seg(p, 0.80, 1);
    if (calm > 0) circle(640, 96, 30, MUTED, null, 1.4, calm * 0.5);
    if (dawn > 0) {
      circle(640, 96, 34, AMBER, null, 1.6, dawn);
      for (var k = 0; k < 8; k++) {
        var a = (k / 8) * Math.PI * 2;
        var r1 = 44, r2 = 56;
        line([640 + Math.cos(a) * r1, 96 + Math.sin(a) * r1,
              640 + Math.cos(a) * r2, 96 + Math.sin(a) * r2], AMBER, 1.4, dawn * 0.8);
      }
    }
  }

  /* Geometry hoisted to module scope and grouped by stroke style, so a frame
     is four stroke calls plus two small circles instead of forty. */
  var HOUSE_BODY = [
    [30, 502, 730, 502],
    [178, 252, 178, 500], [422, 252, 422, 500],
    [150, 252, 178, 252], [422, 252, 450, 252],
    [166, 252, 300, 130, 434, 252],
    [340, 131, 340, 154], [376, 131, 376, 187],
    [334, 123, 382, 123, 382, 131, 334, 131, 334, 123],
    // upper windows + sills
    [212, 288, 274, 288, 274, 370, 212, 370, 212, 288], [206, 372, 280, 372],
    [326, 288, 388, 288, 388, 370, 326, 370, 326, 288], [320, 372, 394, 372],
    // door
    [272, 398, 328, 398, 328, 500, 272, 500, 272, 398],
    [279, 412, 321, 412, 321, 500, 279, 500],
    // lower windows
    [200, 408, 254, 408, 254, 484, 200, 484, 200, 408],
    [346, 408, 400, 408, 400, 484, 346, 484, 346, 408],
    // wing + garage
    [450, 320, 450, 500], [648, 330, 648, 500],
    [450, 322, 545, 272, 648, 328],
    [486, 384, 604, 384, 604, 500, 486, 500, 486, 384]
  ];
  var HOUSE_THIN = [
    [281, 206, 319, 206], [300, 187, 300, 225],
    [243, 288, 243, 370], [212, 329, 274, 329],
    [357, 288, 357, 370], [326, 329, 388, 329],
    [272, 412, 328, 412],
    [227, 408, 227, 484], [200, 446, 254, 446],
    [373, 408, 373, 484], [346, 446, 400, 446],
    [486, 413, 604, 413], [486, 442, 604, 442], [486, 471, 604, 471]
  ];
  var HOUSE_TREES = [
    [96, 502, 96, 470], [96, 414, 126, 470, 66, 470, 96, 414],
    [96, 372, 120, 438, 72, 438, 96, 372],
    [700, 502, 700, 478], [700, 436, 722, 478, 678, 478, 700, 436]
  ];
  var HOUSE_ROOF = [
    [150, 252, 300, 116, 450, 252],
    [436, 322, 545, 262, 662, 326]
  ];

  function drawHouse(p, inkColor, roofColor, alpha) {
    if (alpha <= 0) return;
    strokeSet(HOUSE_BODY, inkColor, 2.2, alpha);
    strokeSet(HOUSE_THIN, inkColor, 1.2, alpha * 0.8);
    strokeSet(HOUSE_TREES, inkColor, 1.6, alpha * 0.85);
    strokeSet(HOUSE_ROOF, roofColor, 3.4, alpha);
    circle(300, 206, 19, inkColor, null, 2.2, alpha);   // attic light
    circle(315, 458, 2.4, inkColor, null, 1.2, alpha * 0.8);
  }

  function drawShingleCourses(p, color, alpha) {
    if (alpha <= 0) return;
    // intact courses fade out as the storm strips them
    line([198, 208, 300, 116, 402, 208], color, 1.2, alpha * 0.55);
    line([230, 236, 300, 172, 370, 236], color, 1.2, alpha * 0.4);
  }

  function drawTornTabs(stormT, blueprintFade) {
    if (stormT <= 0) return;
    var a = 1 - blueprintFade;
    if (a <= 0) return;
    TABS.forEach(function (tab) {
      var d = (stormT - tab.detach) / (1 - tab.detach);
      if (d <= 0) {
        // still attached — a small lifted tab
        poly([tab.x, tab.y, tab.x + 15, tab.y - 8, tab.x + 19, tab.y + 3, tab.x + 4, tab.y + 11],
             DAMAGE, 'rgba(194,65,12,0.16)', 1.4, a * 0.85);
        return;
      }
      var fly = ease(clamp(d, 0, 1));
      var dx = tab.vx * fly * 240;
      var dy = tab.vy * fly * 120 + fly * fly * 300;
      var op = (1 - fly) * a;
      if (op <= 0.01) return;
      ctx.save();
      ctx.translate(vx(tab.x + dx), vy(tab.y + dy));
      ctx.rotate(tab.rot * fly * 7);
      ctx.globalAlpha = op;
      ctx.strokeStyle = DAMAGE;
      ctx.fillStyle = 'rgba(194,65,12,0.14)';
      ctx.lineWidth = Math.max(0.6, vs(1.4));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(vs(15), vs(-8));
      ctx.lineTo(vs(19), vs(3));
      ctx.lineTo(vs(4), vs(11));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    });
  }

  function drawDamage(t, fade) {
    var a = t * (1 - fade);
    if (a <= 0) return;
    // wall crack
    if (t > 0.35) line([422, 300, 406, 318, 416, 332, 398, 352, 406, 364], DAMAGE, 2.4, a);
    // boarded window
    if (t > 0.55) {
      line([326, 288, 388, 370], DAMAGE, 2.4, a);
      line([388, 288, 326, 370], DAMAGE, 2.4, a);
    }
    // tarp on the wing
    if (t > 0.7) {
      poly([545, 272, 620, 312, 588, 330, 515, 291], DAMAGE, 'rgba(194,65,12,0.18)', 1.8, a);
    }
    // sagging gutter
    if (t > 0.45) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = DAMAGE;
      ctx.lineWidth = Math.max(0.6, vs(2.4));
      ctx.beginPath();
      ctx.moveTo(vx(450), vy(322));
      ctx.quadraticCurveTo(vx(480), vy(348), vx(512), vy(330));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawWeather(rainT, hailT, time) {
    if (rainT <= 0) return;
    var count = Math.floor(RAIN.length * rainT * quality);
    ctx.globalAlpha = rainT * 0.55;
    ctx.strokeStyle = '#7A8896';
    ctx.lineWidth = Math.max(0.6, vs(1.5));
    ctx.beginPath();
    for (var i = 0; i < count; i++) {
      var d = RAIN[i];
      var y = wrap(d.y + time * d.sp * 60, VH + 80) - 40;
      var x = wrap(d.x - time * 34, VW + 120) - 60;
      ctx.moveTo(vx(x), vy(y));
      ctx.lineTo(vx(x - 9), vy(y + d.len));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (hailT > 0) {
      var hc = Math.floor(HAIL.length * hailT * quality);
      ctx.globalAlpha = hailT * 0.85;
      ctx.fillStyle = '#D6DCE2';
      ctx.beginPath();                       // one path for every hailstone
      for (var k = 0; k < hc; k++) {
        var st = HAIL[k];
        var hy = wrap(st.y + time * st.sp * 60, VH + 60) - 30;
        var hx = wrap(st.x - time * 26 + Math.sin(time * 2 + st.sw) * 10, VW + 100) - 50;
        var hr = vs(st.r);
        ctx.moveTo(vx(hx) + hr, vy(hy));
        ctx.arc(vx(hx), vy(hy), hr, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawCallouts(t) {
    if (t <= 0) return;
    CALLOUTS.forEach(function (c, i) {
      var start = i * 0.11;
      var a = clamp((t - start) / 0.34, 0, 1);
      if (a <= 0) return;
      /* Narrow screens can't hold the leader lines and labels legibly — the
         damage points still pulse, and the scope list is real text in the
         act copy alongside. */
      if (narrow) { circle(c.x, c.y, 4.5, null, AMBER, 0, a); return; }
      var right = c.lx > 300;
      // leader line draws itself out
      var mx = lerp(c.x, c.lx + (right ? -14 : 14), ease(a));
      var my = lerp(c.y, c.ly, ease(a));
      line([c.x, c.y, mx, my], MUTED, 1, a * 0.9);
      circle(c.x, c.y, 3.4, null, AMBER, 0, a);
      if (a > 0.55) {
        var la = (a - 0.55) / 0.45;
        label(c.t, c.lx, c.ly, 11.5, INK, la, right ? 'left' : 'right');
        line([c.lx - (right ? 0 : 150), c.ly + 10, c.lx + (right ? 150 : 0), c.ly + 10], MUTED, 0.8, la * 0.35);
      }
    });
  }

  function drawTitleBlock(t) {
    if (t <= 0 || narrow) return;
    var x = 448, y = 506, bw = 282, bh = 50;
    // Keep the example in the sheet margin and explicitly distinguish it from
    // a scope, diagnosis, or real customer file.
    poly([x, y, x + bw, y, x + bw, y + bh, x, y + bh], MUTED, GRAPHITE, 1, t);
    line([x, y + 19, x + bw, y + 19], MUTED, 0.8, t * 0.6);
    line([x + 178, y, x + 178, y + bh], MUTED, 0.8, t * 0.6);
    label('CONDITION MAP', x + 10, y + 10, 11, AMBER, t);
    label('SAMPLE', x + 188, y + 10, 11, MUTED, t);
    label('ILLUSTRATIVE ONLY', x + 10, y + 32, 11, INK, t);
    label('NOT A CUSTOMER FILE', x + 10, y + 44, 10, MUTED, t);
    label('EXAMPLE', x + 188, y + 32, 10, MUTED, t);
  }

  /* Act IV — the assembly rebuilds, deck first, sweeping ridge-ward */
  // constant table, hoisted out of the render loop
  var LAYERS = [
    { from: 0.00, to: 0.30, off: 26, color: MUTED,  name: 'DECKING' },
    { from: 0.22, to: 0.50, off: 19, color: '#8FA0AE', name: 'ICE & WATER' },
    { from: 0.44, to: 0.72, off: 12, color: '#C4CDD5', name: 'UNDERLAYMENT' },
    { from: 0.66, to: 1.00, off: 0,  color: AMBER,   name: 'SHINGLES' }
  ];

  function drawRebuild(t) {
    if (t <= 0) return;
    var layers = LAYERS;
    // once the shingles are on, the sub-layers are buried — fade them out so
    // the sequence resolves to a clean finished roof rather than scaffolding
    var settle = 1 - seg(t, 0.86, 1);

    layers.forEach(function (L, idx) {
      var a = seg(t, L.from, L.to);
      if (a <= 0) return;
      var isTop = idx === layers.length - 1;
      var alpha = isTop ? 0.95 : 0.9 * settle;
      if (alpha <= 0.01) return;
      var e = ease(a);
      /* Offsets must run PERPENDICULAR to each roof plane, not straight down —
         offsetting vertically pushed the strokes outside the silhouette.
         Left plane (150,252)->(300,116): unit perp into the roof is
         (0.671, 0.740); the right plane mirrors it. */
      var px = 0.671 * L.off, py = 0.740 * L.off;
      var lx = lerp(150, 300, e), ly = lerp(252, 116, e);
      var rx = lerp(450, 300, e), ry = lerp(252, 116, e);
      line([150 + px, 252 + py, lx + px, ly + py], L.color, 2.6, alpha);
      line([450 - px, 252 + py, rx - px, ry + py], L.color, 2.6, alpha);
    });

    // the layer being installed names itself, clearing before the raccoon lands
    var active = null;
    for (var i = layers.length - 1; i >= 0; i--) {
      if (t >= layers[i].from && t <= layers[i].to + 0.06) { active = layers[i]; break; }
    }
    if (active) {
      var la = 1 - Math.abs((t - (active.from + active.to) / 2) / ((active.to - active.from) / 2 + 0.08));
      /* Off the ridge axis and left-aligned: centred at x=300 it sat directly
         behind the raccoon that perches on the ridge at the end of Act IV. */
      label(active.name, 96, 132, 13, active.color, clamp(la, 0, 1) * settle, 'left');
    }
  }

  /* The raccoon: shelters against the wall mid-storm, tops out on the finished
     ridge at the end. Drawn to actually read as a RACCOON — small rounded ears,
     an eye-band mask inset from the head edge, and a bushy ringed tail. An
     earlier pass with triangular ears, a full-width amber bar and a hook tail
     read as a cat. Opaque fills so it sits in front of the roof it perches on. */
  function drawRaccoon(x, y, s, alpha, color) {
    if (alpha <= 0) return;
    var c = color || INK;
    var lw = 2.0;

    // --- bushy ringed tail (behind the body)
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = c;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, vs(5.4 * s));
    ctx.beginPath();
    ctx.moveTo(vx(x + 8 * s), vy(y - 6 * s));
    ctx.bezierCurveTo(vx(x + 21 * s), vy(y - 4 * s),
                      vx(x + 25 * s), vy(y - 15 * s),
                      vx(x + 18 * s), vy(y - 22 * s));
    ctx.stroke();
    ctx.globalAlpha = 1;
    [[13.2, -6.9, 15.4, -2.9], [19.8, -9.6, 22.9, -7.2], [20.6, -16.4, 23.4, -13.4]]
      .forEach(function (r) {
        line([x + r[0] * s, y + r[1] * s, x + r[2] * s, y + r[3] * s], AMBER, 2.3 * s, alpha * 0.95);
      });

    // --- low hunched body
    poly([x - 9 * s, y, x + 9 * s, y, x + 10 * s, y - 8 * s, x + 6 * s, y - 14 * s,
          x - 6 * s, y - 14 * s, x - 10 * s, y - 7 * s], c, GRAPHITE, lw, alpha);
    line([x - 5 * s, y - 3.5 * s, x - 5 * s, y], c, lw, alpha * 0.9);
    line([x + 3 * s, y - 3.5 * s, x + 3 * s, y], c, lw, alpha * 0.9);

    // --- rounded head with a tapered snout
    poly([x - 8.6 * s, y - 21 * s, x - 6.8 * s, y - 26.6 * s, x - 1 * s, y - 28.4 * s,
          x + 5.6 * s, y - 26.6 * s, x + 7.8 * s, y - 21 * s, x + 5 * s, y - 15.4 * s,
          x - 4 * s, y - 14.8 * s, x - 7.8 * s, y - 17.2 * s], c, GRAPHITE, lw, alpha);
    line([x - 7.8 * s, y - 17.2 * s, x - 10.6 * s, y - 15.6 * s], c, lw, alpha);
    circle(x - 10.8 * s, y - 15.4 * s, 1.1 * s, null, c, 0, alpha);

    // --- small ROUNDED ears (triangular ones read feline)
    circle(x - 6.0 * s, y - 27.0 * s, 2.9 * s, c, GRAPHITE, lw * 0.85, alpha);
    circle(x + 4.4 * s, y - 27.0 * s, 2.9 * s, c, GRAPHITE, lw * 0.85, alpha);

    // --- the mask: an eye BAND inset from the head edges, not a full-width bar.
    //     This is the brand mark reused at raccoon scale.
    ctx.globalAlpha = alpha;
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.moveTo(vx(x - 7.8 * s), vy(y - 22.6 * s));
    ctx.lineTo(vx(x + 6.8 * s), vy(y - 23.4 * s));
    ctx.lineTo(vx(x + 6.2 * s), vy(y - 19.2 * s));
    ctx.lineTo(vx(x - 7.4 * s), vy(y - 18.4 * s));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    circle(x - 4.0 * s, y - 20.8 * s, 1.15 * s, null, GRAPHITE, 0, alpha);
    circle(x + 2.6 * s, y - 21.2 * s, 1.15 * s, null, GRAPHITE, 0, alpha);
  }

  /* =========================================================================
     FRAME
     ========================================================================= */
  function render(p, time) {
    var stormT = seg(p, 0.20, 0.50);          // storm intensity
    var hailT = seg(p, 0.30, 0.46);
    var blueprintT = seg(p, 0.50, 0.64);      // shading -> blueprint
    var scopeT = seg(p, 0.55, 0.76);          // callouts draw in
    var retractT = seg(p, 0.74, 0.80);        // scope clears before Act IV
    var rebuildT = seg(p, 0.80, 1.0);         // assembly rebuilds
    var weatherOut = 1 - seg(p, 0.48, 0.58);  // weather clears for the scope

    drawSky(p); // opaque gradient — no need to clear first

    drawGrid(blueprintT * (1 - seg(p, 0.74, 0.80)) );
    drawMoonSun(p);

    // house — roof accent drains to grey as damage takes hold, returns in Act IV
    var damaged = stormT * (1 - rebuildT);
    var roofColor = rebuildT > 0.66 ? AMBER
      : damaged > 0.3 ? '#6B747C'
      : AMBER;
    var inkColor = blueprintT > 0.5 ? '#CBD3DA' : INK;
    drawHouse(p, inkColor, roofColor, 1);
    drawShingleCourses(p, roofColor, (1 - stormT) * (1 - blueprintT) + rebuildT * 0.6);

    drawTornTabs(stormT, blueprintT);
    /* Damage clears on its own ramp, finishing before the assembly does — the
       tarp and boarded window coming off is the first sign of restoration, not
       something that lingers over a half-rebuilt roof. */
    drawDamage(stormT, seg(p, 0.72, 0.80));

    drawWeather(stormT * weatherOut, hailT * weatherOut, time);

    var callout = scopeT * (1 - retractT);
    drawCallouts(callout);
    drawTitleBlock(blueprintT * (1 - seg(p, 0.74, 0.80)));

    drawRebuild(rebuildT);

    /* Raccoon: shelters against the wall mid-storm, tops out on the ridge at the
       end. Drawn large enough to actually read — at s=1 it was a ~26px scribble. */
    var shelter = seg(p, 0.28, 0.38) * (1 - seg(p, 0.52, 0.60));
    if (shelter > 0) drawRaccoon(140, 500, 2.3, shelter);
    var perched = seg(p, 0.88, 0.96);
    if (perched > 0) drawRaccoon(300, 116, 2.0, perched);

    // final stamp
    var stamp = seg(p, 0.94, 1);
    if (stamp > 0) {
      ctx.save();
      ctx.translate(vx(596), vy(214));
      ctx.rotate(-0.14);
      ctx.globalAlpha = stamp;
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = Math.max(1, vs(2));
      ctx.strokeRect(vs(-72), vs(-19), vs(144), vs(38));
      ctx.fillStyle = AMBER;
      ctx.font = '800 ' + Math.max(10, vs(19)) + 'px Archivo, Helvetica Neue, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RESTORED', 0, vs(1));
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
  }

  /* ---------- act copy + rail, driven by the same progress ---------- */
  function syncActs(p) {
    var idx = p < 0.20 ? 0 : p < 0.52 ? 1 : p < 0.80 ? 2 : 3;
    if (idx === lastActIndex) return;
    lastActIndex = idx;
    acts.forEach(function (el, i) { el.classList.toggle('is-active', i === idx); });
    rails.forEach(function (el, i) {
      el.classList.toggle('is-active', i === idx);
      el.classList.toggle('is-done', i < idx);
    });
    section.setAttribute('data-act', String(idx));
  }

  /* ---------- scroll → progress ---------- */
  function computeProgress() {
    var r = track.getBoundingClientRect();
    var span = r.height - window.innerHeight;
    if (span <= 0) return 0;
    return clamp(-r.top / span, 0, 1);
  }

  var startTime = performance.now();
  function frame() {
    if (!running) return;
    var nowT = performance.now();
    // step quality down after a sustained run of long frames
    if (lastFrameAt) {
      var dt = nowT - lastFrameAt;
      if (dt > 21) { if (++slowFrames >= 10) { slowFrames = 0; degrade(); } }
      else if (slowFrames > 0) { slowFrames--; }
    }
    lastFrameAt = nowT;

    progress = computeProgress();
    var time = (nowT - startTime) / 1000;
    // always redraw while weather is on screen; otherwise only on change
    var animating = progress > 0.18 && progress < 0.60;
    if (animating || Math.abs(progress - rendered) > 0.0005) {
      render(progress, time);
      syncActs(progress);
      rendered = progress;
    }
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || !enhanced) return;
    running = true;
    startTime = performance.now();
    lastFrameAt = 0;
    slowFrames = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* ---------- responsive enhancement lifecycle ---------- */
  function alignHashTarget() {
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
  }

  function hashTargetIsVisible() {
    if (!location.hash || location.hash.length < 2) return false;
    var target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch (error) { target = null; }
    if (!target) return false;
    var rect = target.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  function enable() {
    if (enhanced || !wideLayout.matches || reduceMotion.matches) return;
    enhanced = true;
    track.hidden = false;
    section.classList.add('is-live');
    resize();
    progress = computeProgress();
    render(progress, 0);
    syncActs(progress);
    stormObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { entry.isIntersecting ? start() : stop(); });
    }, { rootMargin: '10% 0px' });
    stormObserver.observe(track);
  }

  function disable() {
    if (!enhanced) return;
    enhanced = false;
    stop();
    if (stormObserver) stormObserver.disconnect();
    stormObserver = null;
    track.hidden = true;
    section.classList.remove('is-live');
    canvas.width = 0;
    canvas.height = 0;
    progress = 0;
    rendered = -1;
    lastActIndex = -1;
    syncActs(0);
  }

  function syncEnhancement(keepHashTarget) {
    if (wideLayout.matches && !reduceMotion.matches) enable();
    else disable();
    if (keepHashTarget) alignHashTarget();
  }

  syncEnhancement(true);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!enhanced) return;
      resize();
      progress = computeProgress();
      render(progress, 0);
      syncActs(progress);
    }, 120);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (!enhanced) return;
    document.hidden ? stop() : (isInView() && start());
  });

  function isInView() {
    var r = track.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }

  // Breakpoint and motion preference changes exchange the two complete experiences.
  var onEnhancementModeChange = function () {
    var keepHashTarget = hashTargetIsVisible();
    syncEnhancement(keepHashTarget);
  };
  if (wideLayout.addEventListener) wideLayout.addEventListener('change', onEnhancementModeChange);
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', onEnhancementModeChange);
  }
})();
