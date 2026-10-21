// 流光白 · code-rendered visuals. Raw WebGL1, no libraries.
//   <canvas data-fx="mesh">   living mesh gradient with film grain (hero, contact)
//   <canvas data-fx="glass" data-mode="0..3">   glossy glass / liquid renders (focus-area tiles)
//   <canvas data-fx="arc">    glossy rainbow arc (principles)
(() => {
  const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  const COMMON = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uHover;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
`;

  // ---------- 1. Mesh gradient: a pearl base with colour lobes (magenta, hot pink, lemon, lavender) drifting through a warped field ----------
  const MESH = COMMON + `
uniform float uFade; uniform float uSeed;
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }
float lobe(vec2 p, vec2 c, float r){ vec2 d = p - c; return exp(-dot(d, d) / (r * r)); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 S = vec2(max(asp, 1.), max(1. / asp, 1.));
  vec2 p = (uv - .5) * S;
  float t = uTime * 2.1 + uSeed;
  // Warp the field so colour boundaries fold like silk rather than sitting as circles.
  vec2 q = p + .34 * vec2(noise(p * 1.4 + vec2(t * .06, -t * .05)) - .5, noise(p * 1.4 + vec2(4.1 - t * .05, 2.3 + t * .04)) - .5);
  q += .08 * vec2(sin(q.y * 2.6 + t * .21), cos(q.x * 2.2 - t * .17));
  vec2 h = .5 * S;
  vec3 MAG = vec3(.90, .20, .86), PINK = vec3(.97, .32, .62), LEM = vec3(.96, .91, .31), LAV = vec3(.80, .70, .97), PEARL = vec3(.955, .945, .955);
  // Strengths breathe, so the picture keeps shifting between magenta-led and lemon-led states.
  float sM = .55 + .45 * sin(t * .11), sL = .62 + .38 * sin(t * .11 + 2.6);
  float sP = .6 + .4 * sin(t * .09 + 4.), sV = .6 + .4 * sin(t * .13 + 1.);
  vec3 col = PEARL;
  col = mix(col, LAV,  sV * lobe(q, h * vec2(.9 * sin(t * .07 + 1.), .8 * cos(t * .06)), .75));
  col = mix(col, MAG,  sM * lobe(q, h * vec2(.95 * cos(t * .05 + .5), .7 * sin(t * .08 + 2.)), .8));
  col = mix(col, LEM,  sL * lobe(q, h * vec2(.9 * sin(t * .06 + 3.), .85 * cos(t * .07 + 4.)), .7));
  col = mix(col, PINK, sP * lobe(q, h * vec2(.85 * cos(t * .045 + 5.), .9 * sin(t * .055 + 1.)), .55));
  col = mix(col, MAG,  .85 * lobe(q, h * vec2(1.1 * sin(t * .04 + 4.5), -.95 + .3 * sin(t * .05)), .5));
  col = mix(col, PEARL, .7 * lobe(q, h * vec2(.35 * sin(t * .08 + 2.), .2 * cos(t * .07)), .36));
  // A pearl light that follows the cursor.
  vec2 m = (uMouse - .5) * S;
  col = mix(col, vec3(.99, .95, 1.), uHover * .45 * lobe(q, m, .26));
  // Contact section: fade to the page white at the top.
  col = mix(col, vec3(.969, .969, .98), uFade * smoothstep(.55, .98, uv.y));
  // Film grain, re-seeded every frame.
  float g = ign(gl_FragCoord.xy + 37. * fract(uTime * 7.31)) - .5;
  col += g * .06;
  gl_FragColor = vec4(col, 1.);
}`;

  // ---------- 2. Glass renders: elliptic tubes twisted along curved axes, shaded as glass, gold or wine ----------
  const GLASS = COMMON + `
uniform float uMode;
const float PI = 3.14159265;
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
// Studio around the sculpture: bright overhead softbox, dark flags at the sides, thin strip lights.
vec3 env(vec3 r, float warm){
  float az = atan(r.x, r.z), el = r.y;
  vec3 c = mix(vec3(.80, .80, .82), vec3(1.08), smoothstep(-.2, .8, el));
  c *= 1. - .92 * exp(-pow((az - .95) * 2.6, 2.)) * smoothstep(-.9, .2, el);
  c *= 1. - .75 * exp(-pow((az + 1.25) * 2.2, 2.));
  c *= 1. - .55 * smoothstep(-.15, -.75, el);
  c += 2.2 * exp(-pow((az - .32 - uMouse.x * .3) * 9., 2.)) * smoothstep(-.4, .5, el);
  c += 1.4 * exp(-pow((el - .55) * 7., 2.)) * smoothstep(-1.4, .2, az);
  c = mix(c, c * vec3(1.06, .98, .9), warm);
  return c;
}
vec3 bg(vec2 uv){
  if (uMode < .5) return mix(vec3(.80, .80, .82), vec3(.94, .94, .95), smoothstep(-.6, .7, uv.y + .2 * uv.x));
  if (uMode < 1.5) return mix(vec3(.82, .82, .84), vec3(.95, .95, .96), smoothstep(-.7, .6, uv.y - .1 * uv.x));
  if (uMode < 2.5) return mix(vec3(.84, .80, .75), vec3(.95, .93, .90), smoothstep(-.7, .7, uv.y + .3 * uv.x));
  vec3 a = vec3(1., .80, .80), b = vec3(.83, .80, .98), c = vec3(.74, .86, 1.);
  float k = clamp(.5 - .45 * (uv.x - uv.y), 0., 1.);
  return mix(mix(c, b, smoothstep(0., .5, k)), a, smoothstep(.5, 1., k));
}
// One twisted tube. In its own frame: x runs along the axis, the cross-section is an ellipse (a wide, b thick) rotated by th(x).
// Returns front depth (or -1e5 for a miss), thickness, and the outward normal in screen space.
struct Hit { float z; float th; vec3 n; float s; };
Hit tube(vec2 p, vec2 o, float ang, float amp, float k, float ph, float a, float b, float w0, float w1, float zoff){
  Hit h; h.z = -1e5; h.th = 0.; h.n = vec3(0., 0., 1.); h.s = 0.;
  vec2 q = rot(ang) * (p - o);
  float x = q.x;
  float cy = amp * sin(k * x + ph), dc = amp * k * cos(k * x + ph);
  float y = (q.y - cy) / sqrt(1. + dc * dc);
  float th = w0 + w1 * x, dth = w1;
  float c = cos(th), s = sin(th), ia = 1. / (a * a), ib = 1. / (b * b);
  float A = s * s * ia + c * c * ib;
  float B = 2. * c * s * y * (ia - ib);
  float C = y * y * (c * c * ia + s * s * ib) - 1.;
  float D = B * B - 4. * A * C;
  if (D < 0.) return h;
  float sq = sqrt(D);
  float z = (-B + sq) / (2. * A);
  float X = c * y + s * z, Y = -s * y + c * z;
  float gx = X * ia, gy = Y * ib;
  float nY = c * gx - s * gy, nZ = s * gx + c * gy;
  float nX = dth * X * Y * (ia - ib) - dc * nY;
  vec2 nxy = rot(-ang) * vec2(nX, nY);
  h.z = z + zoff; h.th = sq / A; h.n = normalize(vec3(nxy, nZ)); h.s = X / a;
  return h;
}
vec3 irid(float x){ return .5 + .5 * cos(6.2832 * (x + vec3(0., .33, .67))); }
vec3 shade(Hit h, vec3 behind, vec2 uv, float kind, float t){
  vec3 n = h.n; float ndv = clamp(n.z, 0., 1.);
  vec3 r = reflect(vec3(0., 0., -1.), n);
  float F = .04 + .96 * pow(1. - ndv, 4.);
  float edge = smoothstep(.15, .95, 1. - ndv);
  if (kind > 1.5) {
    // Wine-red liquid: deep absorption, glossy white reflections.
    vec3 thru = bg(uv + n.xy * .06) * exp(-h.th * vec3(.9, 9., 7.));
    vec3 body = mix(vec3(.55, .02, .05), vec3(.95, .12, .16), pow(max(dot(n, normalize(vec3(.5, .6, .6))), 0.), 1.4));
    body *= .25 + .9 * smoothstep(-.9, .5, n.y + .3 * n.x);
    vec3 col = mix(thru * 1.4, body, smoothstep(.02, .35, h.th));
    vec3 e = env(r, 0.);
    col += F * e * .9 + vec3(1., .85, .85) * pow(max(e.r - 1., 0.), 1.5) * .25;
    col = mix(col, vec3(.08, .0, .01), edge * .45 * smoothstep(.3, .1, h.th + .2 * ndv));
    return col;
  }
  if (kind > .5) {
    // Polished gold: the studio reflected through a warm tint, with deep brown where it faces the dark flags.
    vec3 e = env(r, 1.);
    vec3 gold = vec3(1., .74, .36);
    vec3 col = mix(vec3(.24, .13, .04), gold * 1.15, smoothstep(.2, 1.05, e.r)) + vec3(1., .93, .8) * pow(max(e.r - 1., 0.), 1.3) * .6;
    return col;
  }
  // Clear glass: refracted background with dispersion, dark lines where it curves, thin-film colour near the edges.
  vec2 off = n.xy * (.07 + .12 * h.th);
  vec3 thru = vec3(bg(uv + off * 1.08).r, bg(uv + off).g, bg(uv + off * .92).b);
  vec3 inner = env(vec3(-n.x, -n.y * .8, n.z), 0.) * .9;
  float ir = uMode < .5 ? 1. : (uMode > 2.5 ? .75 : .35);
  vec3 film = irid(h.s * .55 + ndv * 1.3 + h.th * .9 + t * .015);
  inner = mix(inner, inner * film * 1.8, ir * smoothstep(.05, .6, edge + .3 * abs(h.s)));
  vec3 col = mix(thru, inner, .25 + .6 * edge);
  vec3 e = env(r, kind);
  col = mix(col, e, F * .85);
  col += vec3(1.) * pow(max(e.g - 1., 0.), 1.2) * .5;
  return col;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float t = uTime;
  float sp = t * (.05 + .05 * uHover);
  vec3 col = bg(uv);
  float zb = -1e4;
  vec2 p = uv;
  #define LAYER(H, KIND) { Hit h = H; if (h.z > -1e4) { col = shade(h, col, uv, KIND, t); } }
  if (uMode < .5) {
    // GEO: one broad iridescent glass band twisting diagonally across the frame, a thin strand behind it.
    LAYER(tube(p, vec2(.0, .02), .62, .16, 2.3, 1.2 + sp * 1.3, .07, .03, 2.1 + sp, 2.6, -.2), 0.)
    LAYER(tube(p, vec2(.05, -.02), .55, .12, 1.9, -.4 + sp, .24, .07, -.5 + sp * 1.7, 2.9, 0.), 0.)
  } else if (uMode < 1.5) {
    // 品牌安全: a heavy wine-red fold rising from the lower left and curling over at the right.
    LAYER(tube(p, vec2(.08, -.34), -.38, .18, 1.6, .5 + sp, .62, .16, 1.15 + .15 * sin(sp * 2.), .55, -.3), 2.)
    LAYER(tube(p, vec2(.13, -.2), -.25, .14, 1.9, 2. + sp * 1.2, .34, .1, .9 + .2 * sin(sp * 1.6 + 1.), .9, 0.), 2.)
  } else if (uMode < 2.5) {
    // Pollux: clear glass ribbons wound around polished gold.
    LAYER(tube(p, vec2(.05, .0), 1.25, .22, 2.5, .3 + sp, .16, .045, .4 + sp, 3.1, -.3), 0.)
    LAYER(tube(p, vec2(.0, .05), 1.05, .26, 2.1, 2.2 - sp, .11, .035, 2. - sp * 1.3, 3.6, -.1), 1.)
    LAYER(tube(p, vec2(-.05, -.05), 1.4, .18, 2.8, 4. + sp * .8, .09, .03, 1. + sp, -3.4, 0.), 1.)
  } else {
    // 研究团队: one wide clear glass sweep over a pink-to-lavender studio.
    LAYER(tube(p, vec2(.0, .0), 1.0, .3, 1.7, .8 + sp, .2, .06, .7 + sp, 1.8, -.2), 0.)
    LAYER(tube(p, vec2(.25, -.1), .85, .22, 2.2, 2.6 + sp * .8, .1, .035, 2.2 - sp, 2.4, 0.), 0.)
  }
  col *= 1. - .18 * dot(uv * vec2(.7, 1.), uv * vec2(.7, 1.));
  col = col / (1. + .12 * col);
  col *= 1.08;
  col += (hash(gl_FragCoord.xy + fract(t * 7.3) * 50.) - .5) * .018;
  gl_FragColor = vec4(col, 1.);
}`;

  // ---------- 3. Glossy rainbow arc: a huge ellipse rim, crisp on the outside, glowing inwards ----------
  const ARC = COMMON + `
uniform float uLift;
void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  float asp = uRes.x / uRes.y;
  float W = uRes.x;
  // A wide dome: its top sits near the top of the section, its legs leave through the sides.
  vec2 R = asp > 1. ? vec2(W * .64, W * .6) : vec2(W * .74, W * .95);
  float yTop = uRes.y * (.8 + .08 * uLift);
  vec2 c = vec2(uRes.x * .5, yTop - R.y);
  vec2 d = (px - c) / R;
  d.y = max(d.y, 0.);                              // below the centre the legs run straight down, so the rim never curls back into frame
  float rr = length(d);
  float sd = (rr - 1.) * min(R.x, R.y);           // pixels from the rim, negative inside
  float ang = atan(d.y, d.x);                      // pi/2 at the top, pi on the left
  float t = uTime * .06;
  float a = (ang - 1.5708) + .12 * sin(t * 3.);   // 0 at the top, + to the left, - to the right
  vec3 blue = vec3(.22, .42, .86), ink = vec3(.05, .05, .06), red = vec3(.92, .27, .17), orange = vec3(.96, .55, .18), amber = vec3(.98, .78, .35);
  vec3 band = mix(ink, blue, smoothstep(.55, 1.2, a));
  band = mix(band, red, smoothstep(-.05, -.45, a));
  band = mix(band, orange, smoothstep(-.45, -.9, a));
  band = mix(band, amber, smoothstep(-.95, -1.3, a));
  float glowW = 70. + 40. * sin(t * 2. + a);
  float rim = smoothstep(2.5, -1.5, sd) * exp(sd / glowW);          // crisp outside, soft fall-off inside
  float core = smoothstep(2.5, -1.5, sd) * exp(sd / (glowW * .32));
  vec3 inside = vec3(.925, .925, .93), outside = vec3(.93, .955, .965);
  vec3 col = sd > 0. ? mix(outside, vec3(.97), smoothstep(0., 400., sd)) : inside;
  col = mix(col, band * .85 + .1, rim * .85);
  col = mix(col, band, core * .9);
  // A thin specular line riding just inside the rim.
  col += vec3(1.) * exp(-pow((sd + 9.) / 3.5, 2.)) * .35 * smoothstep(.9, .1, abs(a + .3));
  col += (hash(px + fract(uTime * 9.1) * 40.) - .5) * .035;
  gl_FragColor = vec4(col, 1.);
}`;

  const SRC = { mesh: MESH, glass: GLASS, arc: ARC };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

  function boot(canvas) {
    const kind = canvas.dataset.fx;
    const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true, alpha: false });
    if (!gl) { canvas.classList.add('no-gl'); return; }
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = kind + ': ' + gl.getShaderInfoLog(s); console.error(log); root.dataset.glError = log; }
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, SRC[kind]));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { root.dataset.glError = kind + ' link: ' + gl.getProgramInfoLog(prog); canvas.classList.add('no-gl'); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uRes', 'uTime', 'uMouse', 'uHover', 'uFade', 'uSeed', 'uMode', 'uLift'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
    const scale = parseFloat(canvas.dataset.scale || '1');
    const t0 = parseFloat(canvas.dataset.t0 || '0');
    const mode = parseFloat(canvas.dataset.mode || '0');
    const host = canvas.closest('[data-fx-host]') || canvas.parentElement;
    const mouse = [.5, .5], target = [.5, .5];
    let hover = 0, hoverTarget = kind === 'mesh' ? 1 : 0, lift = 0;
    if (fine) {
      host.addEventListener('pointermove', e => { const b = canvas.getBoundingClientRect(); target[0] = (e.clientX - b.left) / b.width; target[1] = 1 - (e.clientY - b.top) / b.height; if (kind !== 'mesh') hoverTarget = 1; kick(); }, { passive: true });
      host.addEventListener('pointerleave', () => { if (kind !== 'mesh') hoverTarget = 0; target[0] = .5; target[1] = .5; });
    }
    let running = false, visible = true;
    const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.5) * scale;
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w === canvas.width && h === canvas.height) return;
      canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); kick();
    };
    size(); new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '120px' }).observe(canvas);
    const start = performance.now();
    function frame(now) {
      mouse[0] += (target[0] - mouse[0]) * .06; mouse[1] += (target[1] - mouse[1]) * .06;
      hover += (hoverTarget - hover) * .05;
      if (kind === 'arc') { const b = canvas.getBoundingClientRect(); lift = Math.min(1, Math.max(0, 1 - (b.top + b.height * .2) / innerHeight)); if (reduce || root.classList.contains('static')) lift = .7; }
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, t0 + (reduce ? 0 : (now - start) / 1000));
      gl.uniform2f(U.uMouse, mouse[0] - (kind === 'glass' ? .5 : 0), mouse[1] - (kind === 'glass' ? .5 : 0));
      gl.uniform1f(U.uHover, kind === 'mesh' && !fine ? 0 : hover);
      gl.uniform1f(U.uFade, parseFloat(canvas.dataset.fade || '0'));
      gl.uniform1f(U.uSeed, parseFloat(canvas.dataset.seed || '0'));
      gl.uniform1f(U.uMode, mode);
      gl.uniform1f(U.uLift, lift);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduce && visible) requestAnimationFrame(frame); else running = false;
    }
    if (kind === 'arc') addEventListener('scroll', kick, { passive: true });
    kick();
  }
  document.querySelectorAll('canvas[data-fx]').forEach(boot);
})();
