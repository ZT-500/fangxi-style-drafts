// Four small code-rendered scenes for the "what we look at" cards, one canvas each (paused offscreen by FX).
// 0 回答对比: six glass prisms around a hot core   1 品牌安全: obsidian crystal with a glowing flaw
// 2 Pollux: a sphere sliced into drifting pastel layers on taupe   3 六个平台: six glass orbs orbiting a core on steel blue
(() => {
  const BODY = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uHov;
mat2 r2(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float mid;
vec3 P0;
const float SEC = 1.0471976;

float map(vec3 p){
  float t = uTime * (1. + uHov * .8);
#if KIND == 0
  p.xz *= r2(.4 * sin(t * .21) + uMouse.x * .35);
  p.yz *= r2(.5 + uMouse.y * .2);
  p.xy *= r2(t * .12);
  P0 = p;
  float a = atan(p.y, p.x);
  float id = floor(a / SEC + .5);
  vec2 q = r2(id * SEC) * p.xy;
  vec3 pp = vec3(q.x - 1.02, q.y, p.z);
  pp.yz *= r2(.785);
  float arm = sdBox(pp, vec3(.6, .15, .15)) - .02;
  float core = length(p) - .24;
  mid = arm < core ? 0. : 1.;
  return min(arm, core);
#elif KIND == 1
  p *= 1.45;
  p.xz *= r2(t * .17 + uMouse.x * .4);
  p.xy *= r2(.22 + uMouse.y * .15);
  P0 = p;
  float d = -1.;
  for (int i = 0; i < 6; i++){
    float a = float(i) * SEC;
    vec3 n1 = normalize(vec3(cos(a), .42, sin(a)));
    vec3 n2 = normalize(vec3(cos(a + .52), -.5, sin(a + .52)));
    d = max(d, dot(p, n1) - .78);
    d = max(d, dot(p, n2) - .74);
  }
  d = max(d, abs(p.y) - 1.25);
  mid = 0.;
  return d / 1.45;
#elif KIND == 2
  p *= 1.3;
  p.yz *= r2(.18);
  p.xz *= r2(t * .14 + uMouse.x * .5);
  float h = .27;
  float id = clamp(floor(p.y / h + .5), -3., 3.);
  vec3 q = p;
  q.x -= .2 * sin(id * 1.3 + t * .6);
  q.z -= .12 * cos(id * 1.7 + t * .5);
  float sph = length(q) - 1.02;
  float slab = abs(p.y - id * h) - h * .4;
  mid = id;
  P0 = p;
  return max(sph, slab) * .8 / 1.3;
#else
  P0 = p;
  float core = length(p) - .4;
  vec3 o = p; o.yz *= r2(.42 + uMouse.y * .2); o.xy *= r2(.18);
  float a = atan(o.z, o.x) - t * .3;
  float id = floor(a / SEC + .5);
  float ang = id * SEC + t * .3;
  float orb = length(o - vec3(cos(ang), 0., sin(ang)) * 1.12) - .22;
  mid = orb < core ? 0. : 1.;
  return min(orb, core);
#endif
}
vec3 nrm(vec3 p){
  vec2 e = vec2(.0015, -.0015);
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}
vec3 env(vec3 r){
  float k = max(dot(r, normalize(vec3(-.5, .7, .55))), 0.);
  float s = max(dot(r, normalize(vec3(.85, .15, .4))), 0.);
  return vec3(1.) * (pow(k, 30.) * 2.2 + pow(k, 4.) * .15) + vec3(1., .95, .9) * pow(s, 60.) * 1.6 + vec3(.5) * pow(max(r.y, 0.), 2.) * .2;
}
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }

void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec2 sv = gl_FragCoord.xy / uRes;
  vec3 ro = vec3(0., -.22, 4.4 - uHov * .25);
  vec3 rd = normalize(vec3(uv, -1.75));
  vec3 bg;
#if KIND == 0
  bg = mix(vec3(.01, .005, .02), vec3(.13, .04, .2), exp(-length(uv - vec2(0., .1)) * 2.2));
#elif KIND == 1
  bg = mix(vec3(.012, .006, .005), vec3(.2, .05, .02), exp(-length(uv - vec2(.05, .12)) * 2.6));
#elif KIND == 2
  bg = mix(vec3(.3, .25, .22), vec3(.6, .53, .48), sv.y) + vec3(.08, .05, .04) * exp(-length(uv) * 2.);
#else
  bg = mix(vec3(.1, .18, .26), vec3(.5, .63, .74), sv.y) + vec3(.1, .08, .04) * exp(-length(uv - vec2(0., .1)) * 2.5);
#endif
  vec3 col = bg;
  float glow = 0.;
  // bounding sphere first, so empty pixels skip the march
  float b = dot(ro, rd), c = dot(ro, ro) - 4.;
  float disc = b * b - c;
  if (disc > 0.){
    float t = max(-b - sqrt(disc), 0.), tEnd = -b + sqrt(disc);
    bool hit = false;
    for (int i = 0; i < 60; i++){
      vec3 p = ro + rd * t;
      float d = map(p);
#if KIND == 0 || KIND == 3
      float gc = length(p) - (KIND == 0 ? .24 : .4);
      glow += .006 / (.004 + gc * gc * 6.);
#elif KIND == 1
      float cr = abs(dot(P0, normalize(vec3(.62, .35, -.7))) + .07 * sin(P0.y * 7. + P0.x * 4.));
      glow += .004 / (.003 + cr * cr * 40. + max(d, 0.) * max(d, 0.) * 30.);
#endif
      if (d < .001 * t){ hit = true; break; }
      t += d;
      if (t > tEnd) break;
    }
    if (hit){
      vec3 p = ro + rd * t;
      float m = mid;
      vec3 n = nrm(p);
      vec3 V = -rd;
      float F = .04 + .96 * pow(1. - max(dot(n, V), 0.), 5.);
      vec3 R = env(reflect(rd, n));
      float r = length(p);
#if KIND == 0
      vec3 inner;
      if (m > .5) inner = vec3(1., .82, .4) * 2.2;
      else {
        inner = mix(vec3(1., .62, .14) * 1.8, vec3(.95, .16, .45), smoothstep(.35, 1.05, r));
        inner = mix(inner, vec3(.38, .22, 1.) * .9, smoothstep(1., 1.6, r));
        float fac = max(dot(n, V), 0.);
        inner *= .18 + .5 * pow(1. - fac, 1.5) + .35 * smoothstep(.8, .2, r);
      }
      col = inner * (1. - F) + R * F * 1.4 + vec3(1., .55, .85) * pow(1. - max(dot(n, V), 0.), 3.) * .5;
#elif KIND == 1
      float cr = abs(dot(P0, normalize(vec3(.62, .35, -.7))) + .07 * sin(P0.y * 7. + P0.x * 4.));
      vec3 base = vec3(.012, .01, .012) + vec3(.08, .03, .02) * max(dot(n, normalize(vec3(.6, -.2, .7))), 0.);
      col = base + R * (F * 1.4 + .08) + vec3(1., .42, .1) * exp(-cr * 70.) * 1.6 + vec3(1., .2, .05) * exp(-cr * 18.) * .25;
#elif KIND == 2
      float k = m + 3.;
      vec3 pc = k < .5 ? vec3(.98, .6, .62) : k < 1.5 ? vec3(.8, .66, .98) : k < 2.5 ? vec3(.6, .8, .98) : k < 3.5 ? vec3(.98, .84, .66)
              : k < 4.5 ? vec3(.66, .92, .8) : k < 5.5 ? vec3(.98, .62, .82) : vec3(.95, .9, .64);
      vec3 L = normalize(vec3(-.4, .8, .5));
      float dif = max(dot(n, L) * .6 + .4, 0.);
      float sp = pow(max(dot(reflect(-L, n), V), 0.), 40.);
      col = pc * dif * .95 + sp * .5 + F * R * .4 + pc * smoothstep(.2, 1., abs(n.y)) * .12;
#else
      if (m > .5){
        col = mix(vec3(1., .35, .12), vec3(1., .75, .4), pow(max(dot(n, V), 0.), 2.)) * 1.3 + F * R;
      } else {
        float tow = max(dot(n, -normalize(p)), 0.);
        col = bg * 1.15 * (1. - F) + R * F * 1.4 + vec3(1., .42, .16) * pow(tow, 3.) * .9 + vec3(1.) * pow(1. - max(dot(n, V), 0.), 4.) * .3;
      }
#endif
    }
  }
#if KIND == 0
  col += vec3(1., .55, .2) * glow * .09;
#elif KIND == 1
  col += vec3(1., .35, .08) * glow * .05;
#elif KIND == 3
  col += vec3(1., .5, .25) * glow * .06;
#endif
  col = aces(col);
  float vig = smoothstep(1.25, .35, length(uv));
  gl_FragColor = vec4(col * (.75 + .25 * vig), 1.);
}`;
  if (!window.FX) return;
  document.querySelectorAll('canvas[data-work]').forEach(canvas => {
    const k = +canvas.dataset.work;
    const card = canvas.closest('.work');
    let hov = 0, target = 0;
    if (card) {
      card.addEventListener('pointerenter', () => { target = 1; });
      card.addEventListener('pointerleave', () => { target = 0; });
    }
    FX.mount(canvas, '#define KIND ' + k + '\n' + BODY, {
      name: 'work' + k, t0: 3 + k * 2, scale: .85, phoneScale: 1,
      update(v) { hov += (target - hov) * .05; v.gl.uniform1f(v.U('uHov'), hov); }
    });
  });
})();
