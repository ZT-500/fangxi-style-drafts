/* 方曦 · lab-type — parametric display face, kinetic type, page wiring */
(function () {
  'use strict';
  var html = document.documentElement;
  var STATIC = html.classList.contains('static');
  var RM = html.classList.contains('rm');

  /* ---------------- parametric "FX Wide" face ----------------
     Cap height 100 units. u = glyph width (the width axis). Rounded outer corners, sharp counters. */
  var H = 100, SV = 28, SH = 25, R = 24, RI = 2.5;
  function f(n) { return Math.round(n * 100) / 100; }
  function poly(pts) {
    var d = '', n = pts.length;
    for (var i = 0; i < n; i++) {
      var x = pts[i][0], y = pts[i][1], r = pts[i][2] || 0;
      if (!r) { d += (i ? 'L' : 'M') + f(x) + ' ' + f(y); continue; }
      var p = pts[(i + n - 1) % n], q = pts[(i + 1) % n];
      var ax = p[0] - x, ay = p[1] - y, la = Math.hypot(ax, ay);
      var bx = q[0] - x, by = q[1] - y, lb = Math.hypot(bx, by);
      var rr = Math.min(r, la * 0.5, lb * 0.5);
      var k = 0.553; // cubic circle approximation
      var x1 = x + ax / la * rr, y1 = y + ay / la * rr, x2 = x + bx / lb * rr, y2 = y + by / lb * rr;
      d += (i ? 'L' : 'M') + f(x1) + ' ' + f(y1) + 'C' + f(x1 + (x - x1) * k) + ' ' + f(y1 + (y - y1) * k) + ' ' + f(x2 + (x - x2) * k) + ' ' + f(y2 + (y - y2) * k) + ' ' + f(x2) + ' ' + f(y2);
    }
    return d + 'Z';
  }
  function diagW(u) { return SV * 1.08 * Math.hypot(H, u) / H; }
  var GL = {
    O: function (u) { return [[poly([[0, 0, R], [u, 0, R], [u, H, R], [0, H, R]]) + poly([[SV, SH, RI], [u - SV, SH, RI], [u - SV, H - SH, RI], [SV, H - SH, RI]]), 'evenodd']]; },
    G: function (u) { var ym = 45, xb = u * 0.5; return [[poly([[0, 0, R], [u, 0, R], [u, SH], [SV, SH, RI], [SV, H - SH, RI], [u - SV, H - SH], [u - SV, ym + SH], [xb, ym + SH], [xb, ym], [u, ym], [u, H, R], [0, H, R]])]]; },
    E: function (u) { var ym = 50 - SH / 2; return [[poly([[0, 0, R], [u, 0], [u, SH], [SV, SH], [SV, ym], [u * .86, ym], [u * .86, ym + SH], [SV, ym + SH], [SV, H - SH], [u, H - SH], [u, H], [0, H, R]])]]; },
    F: function (u) { var ym = 41; return [[poly([[0, 0, R], [u, 0], [u, SH], [SV, SH], [SV, ym], [u * .82, ym], [u * .82, ym + SH], [SV, ym + SH], [SV, H], [0, H]])]]; },
    A: function (u) { var yc = 54; return [[poly([[0, H], [0, 0, R], [u, 0, R], [u, H], [u - SV, H], [u - SV, yc + SH], [SV, yc + SH], [SV, H]]) + poly([[SV, SH], [u - SV, SH], [u - SV, yc], [SV, yc]]), 'evenodd']]; },
    N: function (u) {
      var w = diagW(u - SV), m = H / (u - w), yA = m * (u - SV - w);
      return [[poly([[0, 0], [w, 0], [u - SV, yA], [u - SV, 0], [u, 0], [u, H], [u - w, H], [SV, H - yA], [SV, H], [0, H]])]];
    },
    X: function (u) { var w = diagW(u) * 0.98; return [[poly([[0, 0], [w, 0], [u, H], [u - w, H]])], [poly([[u - w, 0], [u, 0], [w, H], [0, H]])]]; },
    I: function () { return [[poly([[0, 0], [SV * 1.1, 0], [SV * 1.1, H], [0, H]])]]; },
    '0': function (u) { return GL.O(u); },
    '1': function (u) { var w = Math.max(u, SV * 2.4), xs = w * 0.5 + SV * 0.55, fl = xs - SV * 1.9; return [[poly([[fl, 0, 6], [xs, 0], [xs, H - SH + 1], [xs - SV, H - SH + 1], [xs - SV, SH], [fl, SH]])], [poly([[w * 0.08, H - SH], [w * 0.92, H - SH], [w * 0.92, H], [w * 0.08, H]])]]; },
    '2': function (u) { var ym = 50 - SH / 2; return [[poly([[0, 0], [u, 0, R], [u, ym + SH, R * .5], [SV, ym + SH], [SV, H - SH], [u, H - SH], [u, H], [0, H], [0, ym, R * .5], [u - SV, ym], [u - SV, SH], [0, SH]])]]; },
    '3': function (u) { var ym = 50 - SH / 2; return [[poly([[0, 0], [u, 0, R], [u, H, R], [0, H], [0, H - SH], [u - SV, H - SH], [u - SV, ym + SH], [u * .28, ym + SH], [u * .28, ym], [u - SV, ym], [u - SV, SH], [0, SH]])]]; }
  };
  function glyphW(ch, u) { return ch === 'I' ? SV * 1.1 : (ch === '1' ? Math.max(u, SV * 2.4) : u); }
  function glyphSVG(ch, u, scale) {
    var w = glyphW(ch, u), parts = GL[ch](u), s = '';
    for (var i = 0; i < parts.length; i++) s += '<path d="' + parts[i][0] + '"' + (parts[i][1] ? ' fill-rule="evenodd"' : '') + '/>';
    return '<svg viewBox="0 0 ' + f(w) + ' ' + H + '" width="' + f(w * scale) + '" height="' + f(H * scale) + '" aria-hidden="true">' + s + '</svg>';
  }
  // fit a word into width W at cap height hpx: solve the common width unit U
  function fitU(word, mult, W, hpx, gap) {
    var scale = hpx / H, avail = W / scale - gap * (word.length - 1), fixed = 0, m = 0;
    for (var i = 0; i < word.length; i++) { var c = word[i]; if (c === 'I') fixed += SV * 1.1; else m += (mult[c] || 1); }
    return (avail - fixed) / m;
  }
  function renderWord(el, word, mult, U, scale, gap, wrap) {
    var out = '';
    for (var i = 0; i < word.length; i++) {
      var c = word[i], u = U * (mult[c] || 1);
      var svg = glyphSVG(c, u, scale);
      out += wrap ? '<span class="gl" style="' + (i < word.length - 1 ? 'margin-right:' + f(gap * scale) + 'px;' : '') + '">' + svg + '</span>' : svg;
    }
    el.innerHTML = out;
  }

  /* hero word GEO */
  var heroWord = document.getElementById('heroWord');
  var heroMult = { G: 1, E: 0.9, O: 1.06 };
  function layoutHero() {
    if (!heroWord) return;
    var W = heroWord.clientWidth, vw = window.innerWidth;
    var hpx = vw <= 760 ? Math.min(W * 0.27, 120) : Math.min(250, Math.max(150, W * 0.185));
    var gap = 18, U = fitU('GEO', heroMult, W, hpx, gap);
    renderWord(heroWord, 'GEO', heroMult, U, hpx / H, 0, true);
    // spread with justify-content:space-between
    var svgs = heroWord.querySelectorAll('svg');
    for (var i = 0; i < svgs.length; i++) svgs[i].style.transitionDelay = (0.25 + i * 0.13) + 's';
  }
  /* nav mini wordmark */
  var navWord = document.getElementById('navWord');
  if (navWord) renderWord(navWord, 'FANGXI', {}, 116, 0.15, 20, false), navWord.querySelectorAll('svg').forEach(function (s, i) { if (i) s.style.marginLeft = '3px'; });

  /* footer wordmark */
  var fIn = document.getElementById('fwordIn'), fWrap = document.getElementById('fword');
  function layoutFoot() {
    if (!fIn) return;
    var W = fIn.clientWidth, gap = 16, ratio = 1.02;
    // total units with U = ratio*H; scale from width
    var units = 5 * ratio * H + SV * 1.1 + gap * 5, scale = W / units;
    renderWord(fIn, 'FANGXI', {}, ratio * H, scale, 0, false);
    fWrap.style.setProperty('--wh', (H * scale) + 'px');
  }

  /* row numerals with a scroll-driven width axis */
  var nums = [].slice.call(document.querySelectorAll('.row-num'));
  var numState = nums.map(function () { return { p: -1 }; });
  function drawNum(el, st, p) {
    var hpx = parseFloat(getComputedStyle(el).height) || 210, scale = hpx / H;
    var colW = el.parentNode.clientWidth - 96 + 4; if (window.innerWidth <= 760) colW = el.parentNode.clientWidth - 28;
    var gap = 14, uMax = (colW / scale - gap) / 2, uMin = 48;
    uMax = Math.max(uMin + 10, Math.min(uMax, 175));
    var e = p * p * (3 - 2 * p), U = uMin + (uMax - uMin) * e;
    var t = el.getAttribute('data-num');
    el.innerHTML = glyphSVG(t[0], U, scale) + '<span style="width:' + f(gap * scale) + 'px;flex:none"></span>' + glyphSVG(t[1], U, scale);
    st.p = p;
  }

  /* notch hairline in the nav */
  var notch = document.getElementById('notch');
  function drawNotch() {
    if (!notch) return;
    var w = window.innerWidth, c = w / 2, y0 = 57, y1 = 84, a = 250, b = 210;
    notch.setAttribute('viewBox', '0 0 ' + w + ' 96');
    notch.querySelector('path').setAttribute('d', 'M' + 250 + ' ' + y0 + 'H' + (c - a) + 'C' + (c - a + 22) + ' ' + y0 + ' ' + (c - b - 18) + ' ' + y1 + ' ' + (c - b) + ' ' + y1 + 'H' + (c + b) + 'C' + (c + b + 18) + ' ' + y1 + ' ' + (c + a - 22) + ' ' + y0 + ' ' + (c + a) + ' ' + y0 + 'H' + (w - 250));
  }

  /* instrument dial around the eye */
  var dial = document.getElementById('dial');
  if (dial) {
    var s = '<circle r="92" stroke-opacity=".18"/><circle r="70.5" stroke-opacity=".1"/><g class="rot">';
    for (var i = 0; i < 120; i++) {
      var a = i * Math.PI * 2 / 120, L = i % 10 === 0 ? 6 : (i % 5 === 0 ? 3.6 : 2), r0 = 92, r1 = 92 + L;
      s += '<line x1="' + f(Math.cos(a) * r0) + '" y1="' + f(Math.sin(a) * r0) + '" x2="' + f(Math.cos(a) * r1) + '" y2="' + f(Math.sin(a) * r1) + '" stroke-opacity="' + (i % 10 === 0 ? .7 : .3) + '"/>';
      if (i % 30 === 0) s += '<text class="lab" x="' + f(Math.cos(a) * 104) + '" y="' + f(Math.sin(a) * 104 + 3) + '" text-anchor="middle">' + ('00' + i * 3).slice(-3) + '</text>';
    }
    s += '</g><line x1="-100" y1="0" x2="-75" y2="0" stroke-opacity=".35"/><line x1="75" y1="0" x2="100" y2="0" stroke-opacity=".35"/><line x1="0" y1="-100" x2="0" y2="-94" stroke-opacity=".6"/>';
    dial.innerHTML = s;
  }

  /* kinetic text content */
  var sep = '<svg class="sep" viewBox="-50 -50 100 100" aria-hidden="true"><g fill="#0b0b0c"><rect x="-12" y="-46" width="24" height="92" rx="12"/><rect x="-12" y="-46" width="24" height="92" rx="12" transform="rotate(60)"/><rect x="-12" y="-46" width="24" height="92" rx="12" transform="rotate(120)"/></g></svg>';
  function rep(str, n) { var o = ''; for (var i = 0; i < n; i++) o += str; return o; }
  var k1 = document.getElementById('k1t'), k2 = document.getElementById('k2t'), k3 = document.getElementById('k3t');
  if (k1) k1.innerHTML = rep('问清楚' + sep + '存下来' + sep + '标出来' + sep, 3);
  if (k2) k2.innerHTML = rep('ChatGPT / <em>DeepSeek</em> / 豆包 / 腾讯元宝 / <em>通义千问</em> / 文心一言 / ', 3);
  if (k3) k3.textContent = rep('同一个问题 · 问遍主流 AI · 完整回答 · 引用来源 · 抓取时间 · 提到 / 漏掉 / 说错 · ', 6);
  var kLines = [].slice.call(document.querySelectorAll('.kin-line'));
  var kin = document.getElementById('method');

  /* ---------------- layout on resize ---------------- */
  function layout() {
    layoutHero(); layoutFoot(); drawNotch();
    nums.forEach(function (el, i) { drawNum(el, numState[i], numState[i].p < 0 ? (STATIC || RM ? 0.62 : 0) : numState[i].p); });
    tick(true);
  }
  var lastW = 0;
  var ro = new ResizeObserver(function () { var w = document.body.clientWidth; if (Math.abs(w - lastW) > 1) { lastW = w; layout(); } });
  ro.observe(document.body);

  /* ---------------- scroll-driven loop ---------------- */
  var nav = document.getElementById('nav');
  var lastY = -1, vel = 0, skew = 0;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function tick(force) {
    var y = window.scrollY, vh = window.innerHeight;
    var dy = lastY < 0 ? 0 : y - lastY; lastY = y;
    vel += (dy - vel) * 0.2; skew += (clamp(-vel * 0.12, -9, 9) - skew) * 0.15;
    if (nav) nav.classList.toggle('scrolled', y > 40);
    if (RM || STATIC) {
      if (force) {
        kLines.forEach(function (l, i) { l.style.transform = 'translate3d(' + (i % 2 ? -18 : -6) + '%,0,0)'; });
        if (fIn) fIn.style.transform = 'none';
      }
      return;
    }
    // kinetic band
    if (kin) {
      var r = kin.getBoundingClientRect();
      if (r.bottom > -200 && r.top < vh + 200) {
        var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
        kLines.forEach(function (l) {
          var dir = +l.getAttribute('data-dir'), amp = +l.getAttribute('data-amp');
          var x = dir < 0 ? -p * amp * 100 : (-amp * 100 + p * amp * 100) - 10;
          l.style.transform = 'translate3d(' + f(x) + '%,0,0) skewX(' + f(skew * (dir < 0 ? 1 : -1)) + 'deg)';
        });
      }
    }
    // numerals width axis
    nums.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var p = clamp((vh - r.top) / (vh * 0.85), 0, 1);
      if (Math.abs(p - numState[i].p) > 0.004 || force) drawNum(el, numState[i], p);
    });
    // footer wordmark rises from the bottom edge
    if (fWrap && fIn) {
      var fr = fWrap.getBoundingClientRect();
      var q = clamp((vh - fr.top) / (fr.height + 140), 0, 1);
      var e = 1 - Math.pow(1 - q, 3);
      fIn.style.transform = 'translate3d(0,' + f((1 - e) * 70) + '%,0)';
    }
  }
  function loop() { tick(false); requestAnimationFrame(loop); }

  /* ---------------- reveals ---------------- */
  var revs = [].slice.call(document.querySelectorAll('.reveal,.frame'));
  if (STATIC || RM || !('IntersectionObserver' in window)) revs.forEach(function (el) { el.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revs.forEach(function (el, i) {
      if (el.closest('.hero')) { el.style.transitionDelay = (0.15 + (i % 6) * 0.12) + 's'; }
      io.observe(el);
    });
  }

  /* ---------------- nav menu ---------------- */
  var burger = document.getElementById('burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });
    document.querySelectorAll('#menu a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', '打开菜单'); });
    });
  }

  /* ---------------- FAQ ---------------- */
  document.querySelectorAll('.qb').forEach(function (b) {
    b.addEventListener('click', function () { b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'); });
  });

  /* ---------------- right rail: which platform is being asked ---------------- */
  var rail = [].slice.call(document.querySelectorAll('#railR li:not(.hud)'));
  if (rail.length && !STATIC && !RM) {
    var ri = 2;
    setInterval(function () { rail[ri].classList.remove('on'); ri = (ri + 1) % rail.length; rail[ri].classList.add('on'); }, 1600);
  }

  layout();
  requestAnimationFrame(function () { requestAnimationFrame(function () { html.classList.add('ready'); }); });
  if (!RM && !STATIC) requestAnimationFrame(loop);
  else window.addEventListener('scroll', function () { if (nav) nav.classList.toggle('scrolled', window.scrollY > 40); }, { passive: true });
})();
