// Pearl-white renders. One WebGL1 context per <canvas data-scene="hero|foot|fold|fan|slab">.
// Every scene is a full-screen fragment shader; nothing is loaded from the network.
(() => {
  const COMMON = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uHover; uniform float uScroll; uniform vec4 uP;
float px;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
// Thin-film interference (soap / pearl / oil): film thickness in nm, cosine of the view angle.
vec3 film(float th, float ct){
  float c2 = sqrt(max(1. - (1. - ct * ct) / 1.8, 0.));
  float d = 2.68 * th * c2;
  return .5 + .5 * cos(6.2832 * d / vec3(650., 540., 455.));
}
// Highlights roll off instead of clipping; mid-tones untouched so whites on the page stay white.
vec3 shoulder(vec3 x){ vec3 k = .82 + .18 * (1. - exp(-(x - .82) * 5.5)); return mix(x, k, step(.82, x)); }
float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
vec3 dither(vec3 c){ return c + (hash(gl_FragCoord.xy + fract(uTime)) - .5) / 255.; }
`;

  // ---------- Pearl ribbons (hero + footer) ----------
  const RIBBON = `
uniform float uPortrait;
// White studio seen in the ribbon: bright overhead softbox, pale walls, grey floor, one dark flag for contrast.
vec3 studio(vec3 r){
  vec3 c = mix(vec3(.70, .72, .77), vec3(1.0), smoothstep(-.2, .6, r.y));
  c = mix(c, vec3(.40, .42, .49), smoothstep(-.05, -.6, r.y));
  c += vec3(1.3) * smoothstep(.55, .9, r.y) * smoothstep(.8, .2, abs(r.x + .15));
  c += vec3(1., .97, .94) * .8 * exp(-pow((r.x + .7) / .14, 2.)) * smoothstep(-.4, .25, r.y);
  c *= 1. - .55 * smoothstep(.35, .8, r.x) * smoothstep(.6, -.1, r.y);
  return c;
}
// Pearl sheen: pink, lilac, teal and gold, never green.
vec3 pal(float ph){
  ph = fract(ph);
  vec3 pink = vec3(1., .78, .88), lil = vec3(.83, .80, 1.), teal = vec3(.72, .93, .96), gold = vec3(1., .88, .70);
  vec3 c = mix(pink, lil, smoothstep(0., .18, ph));
  c = mix(c, teal, smoothstep(.18, .36, ph));
  c = mix(c, lil, smoothstep(.36, .52, ph));
  c = mix(c, pink, smoothstep(.52, .68, ph));
  c = mix(c, gold, smoothstep(.68, .84, ph));
  return mix(c, pink, smoothstep(.84, 1., ph));
}
// One ribbon: centre curve y(x) (a cubic plus a slow wave), twist angle th(x), curled cross-section.
// A = cubic coefficients  B = (waveAmp, waveFreq, phase, speed)  C = (twist0, twist per x, twistAmp, twistFreq)  D = (halfWidth, sheenShift, shadowDrop, curl)
void ribbon(vec2 p, float t, vec4 A, vec4 B, vec4 C, vec4 D,
            out float cov, out vec3 n, out float s, out float side, out float dist, out float hh){
  float x = p.x;
  float ph = B.y * x + B.z + B.w * t;
  float yc = A.x + x * (A.y + x * (A.z + x * A.w)) + B.x * sin(ph) + .4 * B.x * sin(1.9 * ph + 1.);
  float dy = A.y + x * (2. * A.z + 3. * A.w * x) + B.x * B.y * (cos(ph) + .76 * cos(1.9 * ph + 1.));
  float th = C.x + C.y * x + C.z * sin(C.w * x + t * .11 + B.z) + uScroll * .7;
  float hw = D.x * (1. + .18 * sin(1.3 * x + t * .07 + B.z * 2.));
  float cs = cos(th);
  hh = hw * abs(cs) + .003;
  dist = p.y - yc;
  float sl = sqrt(1. + dy * dy);
  hh *= sl;                                      // keep the true width constant where the ribbon climbs
  cov = smoothstep(hh + px, hh - px, abs(dist));
  s = clamp(dist / hh, -1., 1.) * sign(cs);
  float a = th + D.w * s;
  vec3 T = vec3(1., dy, 0.) / sl;
  vec3 nn = vec3(0., -sin(a), cos(a));
  nn = normalize(nn - dot(nn, T) * T);
  side = step(nn.z, 0.);
  n = nn * (1. - 2. * side);
}
vec3 pearl(vec3 n, float s, float x, float side, float t, float fs){
  float nv = clamp(n.z, 0., 1.), g = 1. - nv;
  vec3 r = reflect(vec3(0., 0., -1.), n);
  vec3 env = studio(r);
  float F = .05 + .95 * pow(g, 4.);
  vec3 L = normalize(vec3(-.45 + uMouse.x * .7, .72 + uMouse.y * .4, .55));
  float dif = .5 + .5 * dot(n, L);
  vec3 tint = pal(1.15 * g + .22 * x + .3 * s + .025 * t + side * .45 + fs);
  vec3 body = vec3(.95, .945, .955) * mix(vec3(1.), tint, .45) * (.52 + .52 * dif);
  vec3 refl = env * mix(vec3(1.), tint * tint, .30 + .65 * g);
  vec3 col = mix(body, refl, .45 + .5 * F);
  vec3 H = normalize(L + vec3(0., 0., 1.));
  col += vec3(1.) * pow(max(dot(n, H), 0.), 80.) * .8;
  col *= 1. - .08 * smoothstep(.85, 1., abs(s));
  return col;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float sc = uP.x;
  px = 1.4 / uRes.y * sc;
  float t = uTime;
  vec2 p = uv * sc + uP.yz + uMouse * vec2(.02, .012);
  // Wide layout: the front ribbon dips under the buttons and climbs out of the top right; the back one runs low.
  // Tall layout: both ribbons stay in the lower half, under the text.
  vec4 A0 = mix(vec4(-.25, .32, .45, .20), vec4(-.30, .55, .9, 1.4), uPortrait);
  vec4 B0 = mix(vec4(.025, 3.1, .6, .16), vec4(.02, 6., .6, .16), uPortrait);
  vec4 C0 = mix(vec4(.5, 2.4, .8, 1.7), vec4(.5, 4.8, .8, 3.), uPortrait);
  vec4 D0 = mix(vec4(.115, 0., .06, 1.0), vec4(.075, 0., .05, 1.), uPortrait);
  vec4 A1 = mix(vec4(-.40, .22, .18, .05), vec4(-.40, .35, .6, .4), uPortrait);
  vec4 B1 = mix(vec4(.03, 2.6, 2.4, -.12), vec4(.02, 5.2, 2.4, -.12), uPortrait);
  vec4 C1 = mix(vec4(2.1, -2.0, 1.0, 2.1), vec4(2.1, -4.0, 1.0, 4.), uPortrait);
  vec4 D1 = mix(vec4(.06, .35, .045, .8), vec4(.045, .35, .04, .8), uPortrait);
  float c0, s0, sd0, dd0, h0; vec3 n0;
  float c1, s1, sd1, dd1, h1; vec3 n1;
  ribbon(p, t, A0, B0, C0, D0, c0, n0, s0, sd0, dd0, h0);
  ribbon(p, t, A1, B1, C1, D1, c1, n1, s1, sd1, dd1, h1);
  // Backdrop: white, a soft contact shadow under each ribbon, and a faint pastel bounce of the sheen.
  vec3 bg = vec3(1.);
  float g0 = max(abs(dd0 + D0.z) - h0 * .6, 0.), g1 = max(abs(dd1 + D1.z) - h1 * .6, 0.);
  float shd = .13 * exp(-g0 * g0 / .005) + .10 * exp(-g1 * g1 / .003);
  bg -= vec3(.52, .54, .48) * shd;
  float bl = exp(-max(abs(dd0) - h0, 0.) / .08);
  bg = mix(bg, pal(.1 + p.x * .3 + t * .02), .22 * bl);
  vec3 col = bg;
  vec3 r1 = shoulder(pearl(n1, s1, p.x, sd1, t, D1.y));
  col = mix(col, r1, c1);
  float on1 = c1 * exp(-pow(max(abs(dd0 + .025) - h0, 0.), 2.) / .0015);
  col *= 1. - .25 * on1 * (1. - c0);
  vec3 r0 = shoulder(pearl(n0, s0, p.x, sd0, t, D0.y));
  col = mix(col, r0, c0);
  gl_FragColor = vec4(dither(clamp(col, 0., 1.)), 1.);
}`;

  // ---------- Orange-gold fold: two bevelled slabs at a diagonal ----------
  const FOLD = `
vec3 warmEnv(vec3 r){
  vec3 c = mix(vec3(.30, .26, .26), vec3(.95, .90, .86), smoothstep(-.6, .7, r.y + .35 * r.x));
  c += vec3(1.6, 1.2, .7) * smoothstep(.35, .9, r.x * .7 + r.y * .7);
  c *= 1. - .6 * smoothstep(.2, .9, -r.x * .8 - r.y * .3);
  return c;
}
// Bevel normal from a rounded-rect SDF: flat top, a round shoulder of width bw at the edge.
vec3 bevel(vec2 q, vec2 b, float r, float bw, out float d){
  d = sdBox(q, b, r);
  vec2 e = vec2(.002, 0.);
  vec2 g = normalize(vec2(sdBox(q + e.xy, b, r) - sdBox(q - e.xy, b, r), sdBox(q + e.yx, b, r) - sdBox(q - e.yx, b, r)) + 1e-6);
  float k = clamp(-d / bw, 0., 1.);
  float u = 1. - k;
  float sl = u / sqrt(max(1. - u * u, .02));
  return normalize(vec3(g * sl, 1.));
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  px = 1.5 / uRes.y;
  float t = uTime;
  vec2 m = uMouse * uHover;
  vec2 p = rot(.70 + .025 * sin(t * .21)) * (uv * (1. - .04 * uHover));
  float br = .012 * sin(t * .33);
  vec2 qa = p - vec2(-.20 + .03 * sin(t * .17), .52 + br);
  vec2 qb = p - vec2(.34 - .02 * sin(t * .17), -.36 - br);
  float da, db;
  vec3 na = bevel(qa, vec2(.78, .44), .19, .075, da);
  vec3 nb = bevel(qb, vec2(.80, .42), .21, .055, db);
  vec3 L = normalize(vec3(.55 + m.x, .55 + m.y, .6));
  // Backdrop: warm grey, lighter to the top right, contact shadow hugging both slabs.
  vec3 col = mix(vec3(.60, .58, .60), vec3(.86, .84, .84), smoothstep(-.6, .7, uv.x * .5 + uv.y));
  float ao = exp(-max(min(da, db), 0.) / .05);
  col *= 1. - .35 * ao;
  col = mix(col, vec3(1., .72, .38), .18 * exp(-max(db, 0.) / .07) * smoothstep(-.4, .5, uv.x));
  // Red slab: grooved, glossy orange rim facing the gap.
  {
    vec2 lp = qa;
    float gr = sin(lp.x * 210. + lp.y * 30. + sin(lp.y * 6.) * 3.);
    float inner = smoothstep(-.05, -.12, da);
    vec3 n = normalize(na + vec3(.22 * gr * inner, .05 * gr * inner, 0.));
    vec3 r = reflect(vec3(0., 0., -1.), n);
    float nv = clamp(n.z, 0., 1.);
    float F = .04 + .96 * pow(1. - nv, 5.);
    float dif = max(dot(n, L), 0.);
    vec3 alb = mix(vec3(.36, .03, .01), vec3(.85, .22, .03), smoothstep(-.9, .4, lp.x * .3 - lp.y * .9 - .2));
    vec3 c = alb * (.35 + .9 * dif) + warmEnv(r) * vec3(1., .55, .25) * (.15 + .7 * F);
    c += vec3(1., .6, .2) * pow(max(dot(n, normalize(L + vec3(0, 0, 1))), 0.), 40.) * .7;
    c *= .75 + .25 * (.5 + .5 * gr) * inner + .25 * (1. - inner);
    float a = smoothstep(px, -px, da);
    col = mix(col, shoulder(c), a);
  }
  // Gold slab: cream body, glowing yellow edge band, clear outer shell.
  {
    float shell = smoothstep(px, -px, db + .018) ;
    float outer = smoothstep(px, -px, db);
    vec3 n = nb;
    vec3 r = reflect(vec3(0., 0., -1.), n);
    float nv = clamp(n.z, 0., 1.);
    float F = .04 + .96 * pow(1. - nv, 5.);
    float dif = max(dot(n, L), 0.);
    float lit = smoothstep(.9, -.5, qb.x * .45 + qb.y * .75);
    vec3 alb = mix(vec3(.62, .55, .56), vec3(1., .88, .58), lit);
    vec3 c = alb * (.55 + .5 * dif) + warmEnv(r) * vec3(1., .85, .6) * (.08 + .6 * F);
    float band = exp(-pow((db + .045) / .022, 2.)) * (.4 + .8 * lit);
    c += vec3(1., .62, .08) * band * 1.2;
    c += vec3(1., .95, .7) * exp(-pow((db + .02) / .004, 2.)) * .6 * lit;
    // clear shell between the outer edge and the body: mostly background, a little warm refraction
    vec3 sh = mix(col, vec3(1., .86, .6), .25) + vec3(1., .9, .7) * exp(-pow(db / .003, 2.)) * .5;
    col = mix(col, sh, outer);
    col = mix(col, shoulder(c), shell);
  }
  col *= 1. - .12 * dot(uv, uv);
  gl_FragColor = vec4(dither(clamp(col, 0., 1.)), 1.);
}`;

  // ---------- Pink-teal glass fan: thin sheets hinged off-frame ----------
  const FAN = `
vec3 sheetCol(float i, float along){
  // along: 0 near the hinge, 1 at the far end
  vec3 hot = mix(vec3(.93, .18, .16), vec3(.98, .55, .16), smoothstep(5., 0., i));
  vec3 pink = vec3(.95, .62, .76);
  vec3 pale = vec3(.93, .90, .94);
  vec3 teal = mix(vec3(.25, .48, .56), vec3(.55, .72, .78), smoothstep(0., 8., i));
  vec3 c = mix(hot, pink, smoothstep(.05, .45, along + i * .03));
  c = mix(c, pale, smoothstep(.45, .75, along + i * .02));
  c = mix(c, teal, smoothstep(.72, 1., along - i * .015));
  return c;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  px = 1.5 / uRes.y;
  float t = uTime;
  vec2 hinge = vec2(.66, .92);
  vec2 q0 = uv - hinge;
  float rr = length(q0);
  vec3 col = mix(vec3(.985), vec3(.94, .945, .955), smoothstep(.2, -.6, uv.x));
  float spread = .118 + .012 * sin(t * .31) + .02 * uHover;
  float prevD = 1.;
  for (int k = 0; k < 10; k++) {
    float i = float(k);
    float bend = .35 + .65 * smoothstep(.15, 1.5, rr);
    float ang = -2.35 + .05 * sin(t * .23) - i * spread * bend + uMouse.x * .04 * uHover;
    vec2 q = rot(-ang) * q0;
    // sheet runs from the hinge outwards along +x in its own frame
    float L = 1.9, W = .36;
    float d = sdBox(q - vec2(L * .5 + .05, -.02 * i), vec2(L * .5, W), .16);
    float along = clamp(q.x / 1.55, 0., 1.);
    float cross = clamp(.5 + q.y / (2. * W), 0., 1.);
    vec3 c = sheetCol(i, along);
    c *= .86 + .22 * cross;                             // lit towards its leading edge
    c = mix(c, vec3(1.), .25 * smoothstep(.55, 1., cross) * smoothstep(.3, .8, along));
    float a = smoothstep(px, -px, d);
    // dark hairline edge (the sheet seen side-on) and a bright bevel just inside it
    float edge = exp(-pow(d / (px * 1.1), 2.));
    float bev = exp(-pow((d + px * 3.) / (px * 2.), 2.));
    vec3 under = col;
    vec3 glass = mix(under, c, .78);
    glass = mix(glass, glass * .55, .35 * exp(-max(-d, 0.) / .03));   // edge thickness darkens a little
    col = mix(col, glass, a);
    col = mix(col, col * .45 + vec3(.05, .05, .1) * .2, edge * .75 * step(-.002, -abs(d) + .004));
    col += vec3(1.) * bev * .35 * a;
    // soft shadow this sheet throws on the backdrop beyond its edge
    col *= 1. - .05 * exp(-max(d, 0.) / .02) * (1. - a);
  }
  col *= 1. - .06 * dot(uv, uv);
  gl_FragColor = vec4(dither(clamp(col, 0., 1.)), 1.);
}`;

  // ---------- Violet glass slab: analytic ray tracing ----------
  const SLAB = `
vec3 violetEnv(vec3 r, float t){
  float az = atan(r.x, -r.z);
  vec3 c = mix(vec3(.10, .03, .45), vec3(.38, .22, .95), smoothstep(-.4, .8, r.y));
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float a0 = -1.1 + fk * 1.05 + .18 * sin(t * .19 + fk * 2.);
    c += vec3(.78, .70, 1.) * (1.1 - .3 * fk) * exp(-pow((az - a0) / (.07 + .05 * fk), 2.)) * smoothstep(-.6, .2, r.y);
  }
  c += vec3(.9, .85, 1.) * smoothstep(.6, .95, r.y);
  return c;
}
// Ray vs. axis-aligned box in its own frame. Returns near/far distances and the near normal.
vec2 boxHit(vec3 ro, vec3 rd, vec3 b, out vec3 nrm){
  vec3 m = 1. / rd; vec3 n = m * ro; vec3 k = abs(m) * b;
  vec3 t1 = -n - k, t2 = -n + k;
  float tn = max(max(t1.x, t1.y), t1.z), tf = min(min(t2.x, t2.y), t2.z);
  nrm = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
  return vec2(tn, tf);
}
float edgeDist(vec3 lp, vec3 b, vec3 n){
  vec3 e = b - abs(lp);
  e += step(.5, abs(n)) * 10.;      // ignore the axis we are facing
  return min(min(e.x, e.y), e.z);
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float t = uTime;
  vec2 m = uMouse * uHover;
  vec3 ro = vec3(-.85 + m.x * .25, 1.05 + m.y * .15, 3.1);
  vec3 ta = vec3(.25, .72, 0.);
  vec3 ww = normalize(ta - ro), uu = normalize(cross(ww, vec3(0., 1., 0.))), vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.25 * ww);
  float yaw = .62 + .12 * sin(t * .16);
  mat2 R = rot(yaw);
  vec3 bc = vec3(.32, .0, -.05);
  vec3 bs = vec3(.42, 1.55, .17);
  // Wall (paper) at z = -1.6, floor slab top at y = 0 reaching back to z = -1.0, with a 0.14 lip.
  vec3 col;
  float tWall = (-1.6 - ro.z) / rd.z;
  vec3 pw = ro + rd * tWall;
  float paper = hash(floor(pw.xy * 900.)) * .025 + hash(floor(pw.xy * 160.)) * .015;
  col = vec3(.945, .935, .915) - paper - .06 * smoothstep(.6, -.2, pw.y);
  // floor slab as a box
  vec3 fn; vec2 fh = boxHit(ro - vec3(0., -.7, .6), rd, vec3(4., .7, 1.6), fn);
  float tHit = 1e9;
  if (fh.x > 0. && fh.x < fh.y) {
    tHit = fh.x;
    vec3 pp = ro + rd * fh.x;
    vec3 r = reflect(rd, fn);
    float F = .04 + .96 * pow(1. - max(dot(-rd, fn), 0.), 5.);
    vec3 base = mix(vec3(.17, .06, .70), vec3(.55, .42, 1.), smoothstep(.4, -1., pp.z));
    vec3 c = base * (.55 + .45 * fn.y) + violetEnv(r, t) * (.10 + .5 * F);
    if (fn.z > .5) c = mix(vec3(.12, .03, .52), vec3(.34, .18, .9), smoothstep(-.14, 0., pp.y)) + violetEnv(r, t) * .1;
    // the block's reflection in the glossy top
    if (fn.y > .5) {
      vec3 bro = pp - bc; bro.xz = R * bro.xz; vec3 brd = r; brd.xz = R * brd.xz;
      vec3 bn; vec2 bh = boxHit(bro, brd, bs, bn);
      if (bh.x > 0. && bh.x < bh.y) c = mix(c, vec3(.22, .08, .78) + violetEnv(reflect(brd, bn), t) * .15, .55 * exp(-bh.x * .8));
      c += vec3(.5, .4, 1.) * .25 * exp(-pow((pp.z + 1.) / .02, 2.));
    }
    float lip = exp(-pow((pp.y) / .008, 2.)) * step(.5, fn.z);
    c += vec3(.8, .75, 1.) * lip * .8;
    col = c;
  }
  // the block
  vec3 lro = ro - bc; lro.xz = R * lro.xz; vec3 lrd = rd; lrd.xz = R * lrd.xz;
  vec3 bn; vec2 bh = boxHit(lro - vec3(0., bs.y, 0.), lrd, bs, bn);
  if (bh.x > 0. && bh.x < bh.y && bh.x < tHit) {
    vec3 lp = lro - vec3(0., bs.y, 0.) + lrd * bh.x;
    vec3 r = reflect(lrd, bn);
    float nv = max(dot(-lrd, bn), 0.);
    float F = .04 + .96 * pow(1. - nv, 5.);
    float face = bn.x > .5 ? 1. : (bn.z > .5 ? .55 : .8);
    vec3 body = mix(vec3(.13, .03, .62), vec3(.36, .18, .98), face * (.5 + .5 * smoothstep(-1.4, 1.4, lp.y)));
    // fake transmission: what the ray sees after crossing the block
    vec3 rt = refract(lrd, bn, .67);
    vec3 trans = violetEnv(rt, t) * vec3(.45, .35, 1.) * .55;
    vec3 c = body * .55 + trans * .55 + violetEnv(r, t) * (.10 + .75 * F);
    float ed = edgeDist(lp, bs, bn);
    c += vec3(.85, .78, 1.) * exp(-ed / .010) * .9;
    c -= vec3(.06, .03, .12) * exp(-ed / .05);
    col = c;
  }
  col = shoulder(col);
  col *= 1. - .1 * dot(uv, uv);
  gl_FragColor = vec4(dither(clamp(col, 0., 1.)), 1.);
}`;

  const SCENES = { hero: RIBBON, foot: RIBBON, fold: FOLD, fan: FAN, slab: SLAB };
  const T0 = { hero: 14, foot: 31, fold: 6, fan: 9, slab: 4 };
  const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  const q = new URLSearchParams(location.search);
  const fixedT = q.has('t') ? parseFloat(q.get('t')) : null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scrollY0 = scrollY;
  addEventListener('scroll', () => { scrollY0 = scrollY; }, { passive: true });
  const fail = msg => { console.error(msg); document.documentElement.dataset.glError = (document.documentElement.dataset.glError || '') + msg; };

  document.querySelectorAll('canvas[data-scene]').forEach(canvas => {
    const scene = canvas.dataset.scene;
    const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true, alpha: false });
    if (!gl || !SCENES[scene]) { canvas.classList.add('no-gl'); return; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) fail(scene + ': ' + gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, COMMON + SCENES[scene]));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { fail(scene + ' link: ' + gl.getProgramInfoLog(prog)); canvas.classList.add('no-gl'); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uRes', 'uTime', 'uMouse', 'uHover', 'uScroll', 'uP', 'uPortrait'].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });
    const SPEED = parseFloat(canvas.dataset.speed) || 1;
    const P = (canvas.dataset.p || '1,0,0,0').split(',').map(Number);
    const PP = canvas.dataset.pp ? canvas.dataset.pp.split(',').map(Number) : P;   // params for a tall (phone) canvas
    const host = canvas.closest('[data-hover]') || canvas;
    const mouse = [0, 0], target = [0, 0]; let hover = 0, hoverT = 0;
    const global = scene === 'hero' || scene === 'foot';
    if (global) addEventListener('pointermove', e => { target[0] = e.clientX / innerWidth - .5; target[1] = .5 - e.clientY / innerHeight; }, { passive: true });
    else {
      host.addEventListener('pointermove', e => { const b = canvas.getBoundingClientRect(); target[0] = (e.clientX - b.left) / b.width - .5; target[1] = .5 - (e.clientY - b.top) / b.height; hoverT = 1; kick(); });
      host.addEventListener('pointerleave', () => { hoverT = 0; target[0] = target[1] = 0; });
    }
    let running = false, visible = true;
    const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.5) * (parseFloat(canvas.dataset.res) || 1);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w === canvas.width && h === canvas.height) return;
      canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); kick();
    };
    size(); new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
    const start = performance.now();
    function frame(now) {
      mouse[0] += (target[0] - mouse[0]) * .04; mouse[1] += (target[1] - mouse[1]) * .04;
      hover += (hoverT - hover) * .05;
      const el = (reduce ? 0 : (now - start) / 1000);
      const tt = fixedT !== null ? fixedT : T0[scene] + el * SPEED;
      const b = canvas.getBoundingClientRect();
      const portrait = canvas.clientHeight > canvas.clientWidth * 1.1;
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, tt);
      gl.uniform2f(U.uMouse, mouse[0], mouse[1]);
      gl.uniform1f(U.uHover, hover);
      gl.uniform1f(U.uScroll, global && !reduce ? Math.max(-1, Math.min(1, -b.top / Math.max(1, b.height))) : 0);
      gl.uniform4fv(U.uP, portrait ? PP : P);
      if (U.uPortrait) gl.uniform1f(U.uPortrait, portrait ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduce && visible && fixedT === null) requestAnimationFrame(frame); else running = false;
    }
    kick();
  });
})();
