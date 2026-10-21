// 深海光雾 · the signature visual.
// A volumetric ribbon of pale-blue smoke threaded with molten-gold filaments and thousands of drifting sparks.
// Everything is drawn from one forward map ribbon(s, v, t): s runs across the ribbon, v along the flow.
// Smoke strands, gold filaments and sparks all use that map, so the sparks sit on the filaments and the
// filaments weave through the smoke. Where the twisting sheet turns edge-on its strands bunch up and glow.
// Usage: <canvas data-mist="hero|card|footer"></canvas>
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const note = msg => { root.dataset.glError = (root.dataset.glError ? root.dataset.glError + ' | ' : '') + msg; console.error(msg); };

  // Shared GLSL: the flow map.
  const MAP = `
precision highp float;
uniform vec2 uRes; uniform float uT; uniform vec2 uA; uniform vec2 uB; uniform float uL;
uniform vec4 uShape;   // width, twist, flare (signed: side it peels to), wobble
uniform float uFlareV; // where along the flow the outer strands peel away
uniform vec3 uMouse;   // device px, strength
vec2 ribbon(float s, float v, float t){
  vec2 AB = uB - uA; vec2 D = normalize(AB); vec2 N = vec2(-D.y, D.x);
  float w = uShape.x * (1.12 - .42 * v + .18 * sin(v * 3.1 + t * .07 + 1.3));
  float c = .075 * sin(v * 4.2 + t * .11 + 1.) + .04 * sin(v * 9.3 + t * .16 + 2.);
  // A 3D sheet whose cross-section is an arc, turning as it flows: edge-on stretches fold the strands together.
  float th = uShape.y * (1.2 * sin(v * 3.6 + t * .19) + .65 * sin(v * 8.1 + t * .12 + 1.7) + .55 * s * sin(v * 2.2 - t * .1));
  float lat = s * cos(th) + .5 * (1. - s * s) * sin(th);
  lat += uShape.w * (.16 * sin(s * 4.3 + v * 6.1 + t * .42) * (.55 + .45 * sin(v * 2.3 + t * .2)) + .09 * sin(v * 11. + s * 2.3 + t * .5) + .045 * sin(v * 23. - s * 4.1 + t * .75) + .018 * sin(v * 47. + s * 9. + t * 1.1));
  // One stretch of the outer strands peels off sideways and rolls, like a wisp caught by a draught.
  float fv = v - uFlareV - .035 * sin(t * .13);
  float fl = exp(-fv * fv / .011);
  float sg = sign(uShape.z);
  float sp = max(s * sg + .25, 0.);
  float flare = uShape.z * fl * sp * sp * (1. + .35 * sin(v * 19. + s * 3. + t * .6));
  float along = .02 * sin(s * 3. + v * 7. + t * .3) + abs(uShape.z) * fl * .28 * sp * sp * sin(s * 4. + v * 9. + t * .45);
  vec2 p = uA + AB * v + (D * along + N * (c + w * lat + flare)) * uL;
  // The cursor parts the smoke.
  vec2 d = p - uMouse.xy; float r2 = dot(d, d) / (uL * uL);
  p += d / (sqrt(dot(d, d)) + 1.) * uMouse.z * uL * .07 * exp(-r2 / .022);
  return p;
}
float filS(float k, float seed, float v, float t){
  float amp = 1. + .7 * smoothstep(.95, 1.5, abs(k));
  return k + amp * (.16 * sin(v * 5.3 + seed * 6.283 + t * .23) + .07 * sin(v * 12.7 - seed * 3.1 + t * .41));
}
float filI(float seed, float v, float t){
  float m = .5 + .5 * sin(v * 7.5 + seed * 17. + t * .55);
  float m2 = .5 + .5 * sin(v * 2.9 - seed * 5. + t * .29);
  return clamp(pow(m * m2, 1.3) * 1.7, 0., 1.);
}
float ends(float v){ return smoothstep(-.13, .02, v) * smoothstep(1.13, .98, v); }
vec4 clip(vec2 p){ return vec4(p.x / uRes.x * 2. - 1., 1. - p.y / uRes.y * 2., 0., 1.); }
`;

  const BG_V = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  const BG_F = MAP + `
uniform vec3 uBg0; uniform vec3 uBg1; uniform float uHaze; uniform vec2 uBgScale; uniform float uWarm;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
void main(){
  // Rendered at half resolution into a texture: the volume is soft, the strands on top carry the detail.
  vec2 px = vec2(gl_FragCoord.x * uBgScale.x, uRes.y - gl_FragCoord.y * uBgScale.y);
  vec2 AB = uB - uA; vec2 D = normalize(AB); vec2 N = vec2(-D.y, D.x);
  float t = uT;
  float v = dot(px - uA, AB) / dot(AB, AB);
  vec2 c = ribbon(0., v, t);
  float d = dot(px - c, N) / uL;
  float w = uShape.x * (1.12 - .42 * v + .18 * sin(v * 3.1 + t * .07 + 1.3));
  float x = d / w;
  // Smoke volume in flow-aligned coordinates: streaks run along the flow and curl where the warp bends them.
  vec2 q = vec2(x * 1.5, v * 2.6 + t * .075);
  vec2 wq = vec2(fbm(q * vec2(1., 1.3) + vec2(0., t * .05)), fbm(q * 1.2 + vec2(3.1, t * .04)));
  vec2 r = q + (wq - .5) * vec2(2., 1.3);
  float n1 = fbm(r * vec2(1.5, .9));
  float rid = 1. - abs(2. * fbm(r * vec2(3.4, 1.3) + 7.3) - 1.);
  float env = exp(-x * x / 1.25);
  float dens = smoothstep(.32, .78, n1) * env;
  float wisp = pow(rid, 6.) * env * smoothstep(.3, .62, n1);
  float halo = exp(-x * x / 10.);
  vec3 col = mix(uBg0, uBg1, smoothstep(.2, 1., px.x / uRes.x));
  col += vec3(.004, .024, .075) * halo * uHaze;
  vec3 smoke = mix(vec3(.04, .12, .34), vec3(.2, .42, .78), dens);
  float warm = smoothstep(-.1, .9, x * uWarm) * smoothstep(.45, .85, fbm(r * .7 + 11.));
  smoke = mix(smoke, vec3(.42, .26, .1), warm * .6);
  col += smoke * dens * .9 * uHaze;
  col += mix(vec3(.3, .55, .95), vec3(.9, .66, .38), warm) * wisp * .55 * uHaze;
  gl_FragColor = vec4(max(col, 0.), 1.);
}`;
  const BLIT_F = `precision mediump float; uniform sampler2D uTex; uniform vec2 uRes; uniform float uT;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){ vec3 c = texture2D(uTex, gl_FragCoord.xy / uRes).rgb; c += (hash(gl_FragCoord.xy + fract(uT * 7.)) - .5) / 160.; gl_FragColor = vec4(max(c, 0.), 1.); }`;

  const STRAND_V = MAP + `
attribute vec4 aP; // s, v, side, seed
uniform float uHalfW; uniform float uAlpha; uniform float uWarm;
varying float vSide; varying vec3 vCol;
void main(){
  float s = aP.x, v = aP.y, t = uT;
  vec2 p = ribbon(s, v, t);
  vec2 p2 = ribbon(s, v + .006, t);
  vec2 q = ribbon(s + .03, v, t);
  vec2 tg = normalize(p2 - p + vec2(1e-4, 0.));
  vec2 n = vec2(-tg.y, tg.x);
  float spacing = length(q - p) / (.03 * uL * uShape.x);
  float bunch = clamp(1. / (spacing + .2), 0., 3.5);
  gl_Position = clip(p + n * aP.z * uHalfW);
  vSide = aP.z;
  float edge = smoothstep(1.14, .45, abs(s));
  float flick = .5 + .5 * sin(aP.w * 31.7 + v * 5.3 + t * .37);
  // The smoke breaks into separate sheets: a slow mask across s and v opens dark gaps between wisps.
  float m1 = sin(s * 3.1 + v * 2.6 + t * .21 + 1.3) + .7 * sin(s * 5.7 - v * 4.3 + t * .33) + .4 * sin(v * 9.1 + s * 1.7 + t * .5);
  float sheet = smoothstep(-.35, .9, m1);
  float a = uAlpha * edge * ends(v) * (.3 + .7 * flick) * (.12 + .88 * bunch) * (.06 + .94 * sheet) * (1. + 1.4 * sheet * (1. - sheet));
  vec3 blue = vec3(.17, .4, .9), pale = vec3(.66, .84, 1.), warm = vec3(1., .72, .4);
  vec3 col = mix(blue, pale, clamp(bunch * .45 - .25, 0., 1.));
  float wm = smoothstep(.25, .95, sin(v * 3.4 - s * 1.2 + t * .11 + 2.1)) * smoothstep(-.2, .95, s * uWarm);
  col = mix(col, warm, wm * .8);
  vCol = col * a;
}`;
  const STRAND_F = `precision mediump float; varying float vSide; varying vec3 vCol;
void main(){ float k = 1. - vSide * vSide; gl_FragColor = vec4(vCol * k * k, 1.); }`;

  const FIL_V = MAP + `
attribute vec4 aP; // k, v, side, seed
uniform float uHalfW; uniform float uAlpha;
varying float vSide; varying float vV; varying float vI; varying float vSeed; varying vec3 vCol;
void main(){
  float t = uT, v = aP.y;
  float s = filS(aP.x, aP.w, v, t), s2 = filS(aP.x, aP.w, v + .006, t);
  vec2 p = ribbon(s, v, t), p2 = ribbon(s2, v + .006, t);
  vec2 tg = normalize(p2 - p + vec2(1e-4, 0.));
  vec2 n = vec2(-tg.y, tg.x);
  float I = filI(aP.w, v, t);
  gl_Position = clip(p + n * aP.z * uHalfW * (.6 + .6 * I));
  vSide = aP.z; vV = v; vI = I; vSeed = aP.w * 40.;
  float outer = 1. - .4 * smoothstep(1., 1.5, abs(aP.x));
  vCol = mix(vec3(1., .36, .04), vec3(1., .62, .2), I) * uAlpha * ends(v) * outer;
}`;
  const FIL_F = `precision mediump float;
uniform float uCore; uniform float uDots;
varying float vSide; varying float vV; varying float vI; varying float vSeed; varying vec3 vCol;
void main(){
  float k = 1. - vSide * vSide;
  float prof = uCore > .5 ? k * k * k : k * k;
  float dots = pow(.5 + .5 * sin(vV * uDots + vSeed), 6.);
  float a = prof * (vI + (1. - vI) * dots * .7) * (.15 + .85 * vI);
  vec3 col = vCol;
  if (uCore > .5) col += vec3(.25, .2, .1) * pow(k, 8.) * vI * vI * length(vCol);
  gl_FragColor = vec4(col * a, 1.);
}`;

  const PT_V = MAP + `
attribute vec4 aA; // k, filament seed, v0, speed
attribute vec4 aB; // size, type (0 on a filament, 1 in the smoke, 2 free ember), jitter, own seed
uniform float uDpr; uniform float uPtAlpha;
varying vec3 vCol; varying float vSoft;
void main(){
  float t = uT;
  float v = fract(aA.z - t * aA.w) * 1.26 - .13;
  float type = aB.y;
  float s = type < .5 ? filS(aA.x, aA.y, v, t) + aB.z : aA.x + aB.z;
  vec2 p = ribbon(s, v, t);
  float sd = aB.w;
  p += vec2(sin(t * .7 + sd * 40.), cos(t * .6 + sd * 31.)) * uDpr * (type > 1.5 ? 9. : 2.5);
  gl_Position = clip(p);
  float I = type < .5 ? filI(aA.y, v, t) : .55;
  float tw = .5 + .5 * sin(t * (1.6 + sd * 3.) + sd * 60.);
  float big = step(4., aB.x);
  gl_PointSize = aB.x * uDpr * (.75 + .35 * tw);
  float a = uPtAlpha * ends(v) * (.35 + .65 * tw) * (type < .5 ? (.15 + 1.1 * I) : (type < 1.5 ? .5 : .75)) * (1. - .55 * big);
  vCol = mix(vec3(1., .46, .1), vec3(1., .8, .48), clamp(I + tw * .3, 0., 1.)) * a;
  vSoft = big;
}`;
  const PT_F = `precision mediump float; varying vec3 vCol; varying float vSoft;
void main(){
  float r = length(gl_PointCoord - .5) * 2.;
  float a = vSoft > .5 ? exp(-r * r * 2.6) * smoothstep(1., .7, r) : smoothstep(1., .15, r);
  gl_FragColor = vec4(vCol * a, 1.);
}`;

  // Seeded random, so every load draws the same smoke.
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  // Each preset returns the flow geometry for a canvas of W×H css px.
  const PRESETS = {
    hero: (W, H) => W >= H * 1.05
      ? { A: [.8 * W, -.07 * H], B: [.56 * W, 1.07 * H], L: H, shape: [.18, 1, -.5, 1], flareV: .6, warm: 1, bg0: [0, 0, 0], bg1: [.006, .045, .12], haze: 1, fine: 160, broad: 34, fils: 12, pts: 8000, ptA: 1.6, seed: 7, t0: 14, speed: 1 }
      : { A: [.92 * W, .02 * H], B: [.34 * W, 1.06 * H], L: H * .78, shape: [.15, 1, -.45, 1], flareV: .62, warm: 1, bg0: [0, 0, 0], bg1: [.006, .05, .13], haze: 1, fine: 120, broad: 26, fils: 10, pts: 2600, ptA: 1.1, seed: 7, t0: 14, speed: 1 },
    card: (W, H) => ({ A: [1.1 * W, .22 * H], B: [-.1 * W, .86 * H], L: H * .9, shape: [.16, .9, .45, 1], flareV: .4, warm: -1, bg0: [.004, .012, .04], bg1: [.01, .05, .14], haze: 1.1, fine: 110, broad: 24, fils: 9, pts: 2200, ptA: 1, seed: 21, t0: 31, speed: 1 }),
    footer: (W, H) => W >= H * 1.05
      ? { A: [.86 * W, -.12 * H], B: [.62 * W, 1.12 * H], L: H, shape: [.13, 1, -.45, 1], flareV: .55, warm: 1, bg0: [0, 0, 0], bg1: [.006, .05, .13], haze: .9, fine: 120, broad: 26, fils: 10, pts: 3000, ptA: .95, seed: 3, t0: 52, speed: .9 }
      : { A: [1.05 * W, .05 * H], B: [.2 * W, 1.08 * H], L: H * .7, shape: [.14, 1, -.4, 1], flareV: .55, warm: 1, bg0: [0, 0, 0], bg1: [.006, .05, .13], haze: .9, fine: 100, broad: 22, fils: 9, pts: 1800, ptA: 1, seed: 3, t0: 52, speed: .9 },
  };

  const FIL_K = [-.85, -.5, -.18, .1, .36, .62, .88, 1.18, 1.46, -1.22, .74, -.02, 1.3, -1.4];
  const M = 190, V0 = -.13, V1 = 1.13;

  function stripData(lines) {
    const out = new Float32Array(lines.length * ((M + 1) * 2 + 2) * 4);
    let o = 0;
    const push = (a, b, c, d) => { out[o++] = a; out[o++] = b; out[o++] = c; out[o++] = d; };
    lines.forEach(([s, seed], li) => {
      for (let j = 0; j <= M; j++) {
        const v = V0 + (V1 - V0) * j / M;
        if (j === 0 && li > 0) push(s, v, -1, seed);
        push(s, v, -1, seed); push(s, v, 1, seed);
      }
      push(s, V1, 1, seed);
    });
    return out.subarray(0, o);
  }

  const instances = [];
  let paused = false;
  window.mist = {
    setPaused(p) { paused = p; instances.forEach(i => i.kick()); },
    get paused() { return paused; },
  };

  function make(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) { canvas.classList.add('no-gl'); return; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) note('compile: ' + gl.getShaderInfoLog(s)); return s; };
    const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) note('link: ' + gl.getProgramInfoLog(p)); return p; };
    const P = { bg: prog(BG_V, BG_F), blit: prog(BG_V, BLIT_F), strand: prog(STRAND_V, STRAND_F), fil: prog(FIL_V, FIL_F), pt: prog(PT_V, PT_F) };
    const loc = {};
    const U = (p, n) => { const key = p + n; if (!(key in loc)) loc[key] = gl.getUniformLocation(P[p], n); return loc[key]; };
    const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    let bw = 1, bh = 1;

    const name = canvas.dataset.mist || 'hero';
    let cfg = null, geo = null, geoKey = '';
    const buildGeo = c => {
      const r = rng(c.seed * 977 + 13);
      const fine = [], broad = [];
      for (let i = 0; i < c.fine; i++) { const u = -1.12 + 2.24 * (i + .5) / c.fine; fine.push([u + .05 * Math.sin(u * 19) + (r() - .5) * .01, r()]); }
      for (let i = 0; i < c.broad; i++) { const u = -1 + 2 * (i + .5) / c.broad; broad.push([u + (r() - .5) * .04, r()]); }
      const fil = FIL_K.slice(0, c.fils).map(k => [k, r()]);
      const mk = data => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return { b, n: data.length / 4 }; };
      const pts = new Float32Array(c.pts * 8);
      for (let i = 0; i < c.pts; i++) {
        const o = i * 8, roll = r();
        let type, k, fseed = 0, jit, size;
        if (roll < .66) { const f = fil[Math.floor(r() * fil.length)]; type = 0; k = f[0]; fseed = f[1]; jit = (r() - .5) * (r() < .7 ? .018 : .07); size = 1.1 + Math.pow(r(), 3) * 2.4; }
        else if (roll < .88) { type = 1; k = (r() * 2 - 1) * 1.05; jit = 0; size = .9 + Math.pow(r(), 2) * 1.6; }
        else { type = 2; const side = r() < .62 ? 1 : -1; k = side * (1.05 + Math.pow(r(), 1.5) * 1.6); jit = 0; size = r() < .09 ? 5 + r() * 7 : 1 + r() * 2; }
        pts[o] = k; pts[o + 1] = fseed; pts[o + 2] = r(); pts[o + 3] = (.012 + r() * .03) * (type === 2 ? 1.4 : 1);
        pts[o + 4] = size; pts[o + 5] = type; pts[o + 6] = jit; pts[o + 7] = r();
      }
      const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
      return { fine: mk(stripData(fine)), broad: mk(stripData(broad)), fil: mk(stripData(fil)), pts: { b: pb, n: c.pts } };
    };

    const mouse = [-1e5, -1e5], target = [-1e5, -1e5];
    let mk = 0, mkT = 0;
    const onMove = e => { const r = canvas.getBoundingClientRect(); target[0] = e.clientX - r.left; target[1] = e.clientY - r.top; mkT = 1; if (mouse[0] < -1e4) { mouse[0] = target[0]; mouse[1] = target[1]; } kick(); };
    addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', () => { mkT = 0; });

    let running = false, visible = true, dpr = 1, last = 0, clock = 0;
    const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w === canvas.width && h === canvas.height && cfg) return;
      canvas.width = w; canvas.height = h;
      bw = Math.ceil(w / 2); bh = Math.ceil(h / 2);
      gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, bw, bh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) note('framebuffer incomplete');
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      cfg = PRESETS[name](canvas.clientWidth, canvas.clientHeight);
      const key = [cfg.fine, cfg.broad, cfg.fils, cfg.pts, cfg.seed].join();
      if (key !== geoKey) { geo = buildGeo(cfg); geoKey = key; }
      kick();
    };
    size(); new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);

    const common = (p, t) => {
      gl.useProgram(P[p]);
      gl.uniform2f(U(p, 'uRes'), canvas.width, canvas.height);
      gl.uniform1f(U(p, 'uT'), t);
      gl.uniform2f(U(p, 'uA'), cfg.A[0] * dpr, cfg.A[1] * dpr);
      gl.uniform2f(U(p, 'uB'), cfg.B[0] * dpr, cfg.B[1] * dpr);
      gl.uniform1f(U(p, 'uL'), cfg.L * dpr);
      gl.uniform4fv(U(p, 'uShape'), cfg.shape);
      gl.uniform1f(U(p, 'uFlareV'), cfg.flareV);
      gl.uniform3f(U(p, 'uMouse'), mouse[0] * dpr, mouse[1] * dpr, mk);
    };
    const attr = (p, name, b, size, stride, off) => { const l = gl.getAttribLocation(P[p], name); if (l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, stride, off); };
    const disableAll = () => { for (let i = 0; i < 4; i++) gl.disableVertexAttribArray(i); };

    function draw(t) {
      disableAll();
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, bw, bh);
      common('bg', t);
      gl.uniform3fv(U('bg', 'uBg0'), cfg.bg0); gl.uniform3fv(U('bg', 'uBg1'), cfg.bg1); gl.uniform1f(U('bg', 'uHaze'), cfg.haze);
      gl.uniform2f(U('bg', 'uBgScale'), canvas.width / bw, canvas.height / bh); gl.uniform1f(U('bg', 'uWarm'), cfg.warm);
      attr('bg', 'a', quad, 2, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      disableAll(); gl.useProgram(P.blit);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(U('blit', 'uTex'), 0); gl.uniform2f(U('blit', 'uRes'), canvas.width, canvas.height); gl.uniform1f(U('blit', 'uT'), t);
      attr('blit', 'a', quad, 2, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      const strands = (g, halfW, alpha) => {
        disableAll(); common('strand', t);
        gl.uniform1f(U('strand', 'uHalfW'), halfW * dpr); gl.uniform1f(U('strand', 'uAlpha'), alpha); gl.uniform1f(U('strand', 'uWarm'), cfg.warm);
        attr('strand', 'aP', g.b, 4, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, g.n);
      };
      strands(geo.broad, 20, .018);
      strands(geo.fine, 1.1, .15);
      const fil = (halfW, alpha, core) => {
        disableAll(); common('fil', t);
        gl.uniform1f(U('fil', 'uHalfW'), halfW * dpr); gl.uniform1f(U('fil', 'uAlpha'), alpha); gl.uniform1f(U('fil', 'uCore'), core); gl.uniform1f(U('fil', 'uDots'), 1500 * Math.max(.4, canvas.clientHeight / 900));
        attr('fil', 'aP', geo.fil.b, 4, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, geo.fil.n);
      };
      fil(15, .17, 0);
      fil(2, .95, 1);
      disableAll(); common('pt', t);
      gl.uniform1f(U('pt', 'uDpr'), dpr); gl.uniform1f(U('pt', 'uPtAlpha'), cfg.ptA);
      attr('pt', 'aA', geo.pts.b, 4, 32, 0); attr('pt', 'aB', geo.pts.b, 4, 32, 16);
      gl.drawArrays(gl.POINTS, 0, geo.pts.n);
    }

    function frame(now) {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      if (!reduce && !paused) clock += dt * cfg.speed;
      mk += (mkT - mk) * .04;
      mouse[0] += (target[0] - mouse[0]) * .06; mouse[1] += (target[1] - mouse[1]) * .06;
      draw(cfg.t0 + clock);
      const moving = !reduce && !paused;
      if (visible && (moving || Math.abs(mkT - mk) > .01 || Math.abs(target[0] - mouse[0]) > .5)) requestAnimationFrame(frame);
      else { running = false; last = 0; }
    }
    instances.push({ kick });
    kick();
  }

  document.querySelectorAll('canvas[data-mist]').forEach(make);
})();
