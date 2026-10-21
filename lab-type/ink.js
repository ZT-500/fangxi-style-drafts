/* 方曦 · lab-type — red cursor ink: metaball blots that merge, then shrink away */
(function () {
  'use strict';
  var cv = document.getElementById('ink'); if (!cv) return;
  var html = document.documentElement;
  var RM = html.classList.contains('rm');
  function err(m) { html.dataset.glError = (html.dataset.glError || '') + ' ink:' + m; }
  var gl = null;
  try { gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }); } catch (e) { }
  if (!gl) return;
  var MAX = 40, SC = 0.5;
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec4 uB[' + MAX + '];uniform int uN;',
    'void main(){vec2 p=gl_FragCoord.xy;float f=0.;',
    ' for(int i=0;i<' + MAX + ';i++){if(i>=uN)break;vec4 b=uB[i];vec2 d=p-b.xy;f+=b.z*b.z/(dot(d,d)+.5);}',
    ' float a=smoothstep(.92,1.12,f);',
    ' vec3 red=vec3(.93,.17,.11);vec3 deep=vec3(.66,.05,.05);',
    ' vec3 col=mix(red,deep,smoothstep(1.6,6.,f)*.55);',
    ' col=mix(col,vec3(1.,.42,.36),smoothstep(1.12,.95,f)*.35);',
    ' gl_FragColor=vec4(col*a,a);}'
  ].join('\n');
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) err(gl.getShaderInfoLog(s)); return s; }
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { err(gl.getProgramInfoLog(pr)); return; }
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uB = gl.getUniformLocation(pr, 'uB'), uN = gl.getUniformLocation(pr, 'uN');
  var arr = new Float32Array(MAX * 4);

  var vw = 0, vh = 0, dirty = true;
  function resize() {
    vw = window.innerWidth; vh = cv.getBoundingClientRect().height || window.innerHeight;
    var w = Math.max(2, Math.round(vw * SC)), h = Math.max(2, Math.round(vh * SC));
    if (w !== cv.width || h !== cv.height) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    dirty = true; render();
  }
  new ResizeObserver(resize).observe(cv);

  var blobs = []; // x, y (document coords), r, born, life
  var t0 = performance.now();
  function now() { return (performance.now() - t0) / 1000; }
  function spawn(x, y, r, life, frozen) {
    if (blobs.length >= MAX) blobs.shift();
    blobs.push({ x: x, y: y + window.scrollY, r: r, b: now(), l: life, fz: !!frozen });
    dirty = true;
  }
  function size(b, t) {
    if (b.fz) return b.r;
    var a = (t - b.b) / b.l; if (a >= 1) return -1;
    if (a < 0.1) { var k = a / 0.1; return b.r * (1 - Math.pow(1 - k, 3)); }
    var k2 = (a - 0.1) / 0.9; return b.r * (1 - k2 * k2);
  }
  function render() {
    var t = now(), n = 0, sy = window.scrollY, keep = [];
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i], r = size(b, t);
      if (r < 0) continue; keep.push(b);
      var ys = b.y - sy; if (ys < -80 || ys > vh + 80) continue;
      arr[n * 4] = b.x * SC; arr[n * 4 + 1] = (vh - ys) * SC; arr[n * 4 + 2] = Math.max(r, 0) * SC; arr[n * 4 + 3] = 0; n++;
    }
    blobs = keep;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (n) { gl.uniform4fv(uB, arr); gl.uniform1i(uN, n); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    dirty = blobs.some(function (b) { return !b.fz; });
  }

  // seeded blots for the still frame (reduced motion / screenshots): a merged drop beside the lens
  function seed() {
    var w = document.querySelector('.eye-wrap'); if (!w) return;
    var r = w.getBoundingClientRect(), S = r.width, cx = r.left + S / 2, cy = r.top + S / 2;
    var k = Math.min(1, S / 600);
    spawn(cx - S * 0.36, cy - S * 0.47, 22 * k, 1, true);
    spawn(cx - S * 0.31, cy - S * 0.5, 12 * k, 1, true);
    spawn(cx - S * 0.4, cy - S * 0.42, 8 * k, 1, true);
    spawn(cx - S * 0.56, cy + S * 0.04, 9 * k, 1, true);
    spawn(cx - S * 0.53, cy + S * 0.08, 13 * k, 1, true);
  }

  if (RM) {
    requestAnimationFrame(function () { seed(); render(); });
    window.addEventListener('scroll', render, { passive: true });
    return;
  }

  var lx = null, ly = null, acc = 0, moved = false, lastMove = 0, dropped = true;
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    moved = true;
    var x = e.clientX, y = e.clientY;
    if (lx === null) { lx = x; ly = y; }
    var d = Math.hypot(x - lx, y - ly); acc += d;
    var sp = Math.min(d, 60);
    while (acc > 15) { acc -= 15; spawn(x + (Math.random() - .5) * 6, y + (Math.random() - .5) * 6, 7 + Math.random() * 9 + sp * 0.12, 0.7 + Math.random() * 0.6); }
    lx = x; ly = y; lastMove = now(); dropped = false;
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    for (var i = 0; i < 4; i++) spawn(e.clientX + (Math.random() - .5) * 30, e.clientY + (Math.random() - .5) * 30, 10 + Math.random() * 16, 1.2 + Math.random() * .6);
  }, { passive: true });
  window.addEventListener('scroll', function () { dirty = true; }, { passive: true });

  var hero = document.getElementById('hero'), heroVis = true;
  if (hero) new IntersectionObserver(function (es) { heroVis = es[0].isIntersecting; }).observe(hero);
  var gpx = null, gpy = null, gacc = 0, lastDrop = 0;
  function frame() {
    requestAnimationFrame(frame);
    var t = now();
    // a resting cursor leaves one larger blot
    if (moved && !dropped && t - lastMove > 0.14) { dropped = true; spawn(lx, ly, 20 + Math.random() * 10, 1.5); }
    // until the visitor moves, a ghost cursor traces where the lens is looking
    if (!moved && heroVis && window.__eyeGhost) {
      var w = document.querySelector('.eye-wrap'); if (w) {
        var r = w.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, g = window.__eyeGhost(t + 0.4);
        var gx = cx + g.x / 0.72 * vw * 0.42, gy = cy + g.y / 0.5 * window.innerHeight * 0.4 - r.height * 0.12;
        if (gpx === null) { gpx = gx; gpy = gy; }
        var dx = gx - gpx, dy = gy - gpy, d = Math.hypot(dx, dy), n = 0;
        gacc += d;
        while (gacc > 13 && n < 12) { gacc -= 13; n++; var k = 1 - gacc / Math.max(d, 1e-3); k = Math.max(0, Math.min(1, k)); spawn(gpx + dx * k + (Math.random() - .5) * 8, gpy + dy * k + (Math.random() - .5) * 8, 6 + Math.random() * 10, 0.9 + Math.random() * 0.5); }
        if (n >= 12) gacc = 0;
        if (t - lastDrop > 1.1) { lastDrop = t; spawn(gx, gy, 18 + Math.random() * 9, 1.7); spawn(gx + 14, gy - 10, 10, 1.4); }
        gpx = gx; gpy = gy;
      }
    }
    if (dirty) render();
  }
  requestAnimationFrame(frame);
})();
