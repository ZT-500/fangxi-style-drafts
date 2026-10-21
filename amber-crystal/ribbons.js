// Dim drifting light ribbons (amber / magenta / violet strands) behind a section,
// plus glossy liquid colour that floods whichever [data-liquid] element in that section is hovered.
// The hovered element turns its own background transparent, and this canvas paints the liquid inside its rounded rect.
(() => {
  const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;
uniform vec4 uHov; uniform float uHovR; uniform float uHovA; uniform float uHue; uniform vec2 uHovP;
uniform float uMode;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// one bundle of fine parallel strands that swoops along a drifting curve and twists where its width pinches
vec3 bundle(vec2 p, float t, float yc, float amp, float f, float ph, float spread, float n, vec3 cA, vec3 cB, float pix){
  float c = yc + amp * sin(p.x * f + t * .21 + ph) + amp * .42 * sin(p.x * f * 2.13 - t * .16 + ph * 1.9);
  float tw = sin(p.x * f * .74 + t * .13 + ph * .7);
  float w = spread * (.1 + .9 * abs(tw));
  float d = (p.y - c) / w;
  float env = exp(-d * d * .9);
  float k = abs(fract(d * n * .5) - .5) * 2.;
  float aa = pix * n / w;
  float line = smoothstep(.16 + aa, 0., k) * mix(1., .3, clamp(aa * 1.5, 0., 1.));
  vec3 col = mix(cA, cB, smoothstep(.2, 2.8, p.x + .3 * sin(t * .1 + ph)));
  return col * env * (line * .9 + .22);
}

float fld(vec2 p, float t){
  for (int i = 0; i < 5; i++){
    float fi = float(i);
    p += .42 * vec2(sin(p.y * 1.6 + t * .55 + fi * 1.3), cos(p.x * 1.3 - t * .45 + fi * 2.1));
  }
  return .5 + .5 * sin(p.x * 1.1 + p.y * .9);
}
vec3 pal(float v, float h){
  vec3 a = vec3(.16, .01, .03), b = vec3(.85, .12, .1), c = vec3(1., .74, .32);
  if (h > .5){ a = vec3(.09, .02, .2); b = vec3(.78, .14, .5); c = vec3(1., .62, .32); }
  if (h > 1.5){ a = vec3(.02, .03, .2); b = vec3(.42, .2, .92); c = vec3(1., .46, .7); }
  if (h > 2.5){ a = vec3(.01, .05, .16); b = vec3(.14, .38, .95); c = vec3(.96, .32, .62); }
  if (h > 3.5){ a = vec3(.03, .03, .12); b = vec3(.25, .4, .95); c = vec3(1., .66, .34); }
  return v < .5 ? mix(a, b, v * 2.) : mix(b, c, (v - .5) * 2.);
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  float S = 3. / uRes.x;
  vec2 p = fc * S;
  float H = uRes.y * S;
  float t = uTime;
  vec3 col = vec3(.02);
  vec3 amber = vec3(1., .55, .14), red = vec3(.95, .2, .16), mag = vec3(.92, .14, .46), vio = vec3(.46, .26, 1.), ice = vec3(.45, .7, 1.);
  float pix = S;
  if (uMode < .5){
    col += bundle(p, t, H * .8, .32, 1.15, 0., .34, 16., amber, mag, pix) * smoothstep(3.1, .6, p.x) * .5;
    col += bundle(p, t * 1.1, H * .55, .42, .9, 2.4, .42, 18., mag, vio, pix) * smoothstep(-.2, 1.6, p.x) * .42;
    col += bundle(p, t * .9, H * .22, .3, 1.3, 4.1, .3, 14., vio, ice, pix) * .26;
  } else {
    col += bundle(p, t, H * .7, .36, 1., 1.2, .4, 16., amber, mag, pix) * smoothstep(3.2, .4, p.x) * .45;
    col += bundle(p, t * .9, H * .42, .4, .85, 3.3, .38, 18., vio, mag, pix) * smoothstep(0., 2., p.x) * .36;
  }
  // sparse twinkles riding on the light
  vec2 g = floor(fc / 34.), f = fract(fc / 34.) - .5;
  float h = hash(g);
  vec2 o = vec2(hash(g + 7.1), hash(g + 3.3)) - .5;
  float tw = .5 + .5 * sin(t * (1. + h * 2.) + h * 40.);
  col += vec3(1., .85, .7) * step(.965, h) * exp(-dot(f - o * .6, f - o * .6) * 260.) * tw * .5 * smoothstep(.0, .12, dot(col, vec3(.33)));
  col = col / (1. + col * .6);

  // liquid inside the hovered card / pill / circle
  if (uHovA > .001){
    vec2 hc = uHov.xy + uHov.zw * .5;
    vec2 hd = abs(fc - hc) - uHov.zw * .5 + uHovR;
    float sd = length(max(hd, 0.)) + min(max(hd.x, hd.y), 0.) - uHovR;
    float m = smoothstep(1.2, -1.2, sd);
    if (m > 0.){
      float sc = 1.7 / max(uHov.w, uHov.z * .55);
      vec2 lp = (fc - uHov.xy) * sc;
      vec2 mp = (uHovP - uHov.xy) * sc;
      vec2 dd = lp - mp;
      lp -= dd * exp(-dot(dd, dd) * 1.6) * .35;
      float tt = t * .8 + uHue * 7.;
      float e = .012;
      float v = fld(lp, tt), vx = fld(lp + vec2(e, 0.), tt), vy = fld(lp + vec2(0., e), tt);
      vec3 n = normalize(vec3((v - vx) / e * .1, (v - vy) / e * .1, 1.));
      vec3 L = normalize(vec3(-.4, .6, .7));
      float dif = max(dot(n, L), 0.);
      float sp = pow(max(dot(reflect(-L, n), vec3(0., 0., 1.)), 0.), 28.);
      vec3 liq = pal(smoothstep(.05, .95, v), uHue) * (.3 + .8 * dif) + vec3(1., .92, .82) * sp * .75;
      // the reveal sweeps in from the cursor
      float r = length(fc - uHovP) / max(uHov.z, uHov.w);
      float sweep = smoothstep(uHovA * 1.6, uHovA * 1.6 - .35, r);
      col = mix(col, liq * .9, m * sweep * smoothstep(0., .25, uHovA));
    }
  }
  gl_FragColor = vec4(col, 1.);
}`;
  if (!window.FX) return;
  document.querySelectorAll('canvas[data-ribbons]').forEach(canvas => {
    const scope = canvas.parentElement;
    const mode = +canvas.dataset.ribbons || 0;
    const els = [...scope.querySelectorAll('[data-liquid]')];
    let cur = null, amt = 0, target = 0;
    let v = null;
    const enter = el => () => { if (cur !== el) { cur = el; amt = 0; } target = 1; if (FX.reduce) amt = 1; if (v) v.kick(); };
    const leave = () => { target = 0; if (FX.reduce) amt = 0; if (v) v.kick(); };
    els.forEach(el => {
      el.addEventListener('pointerenter', enter(el));
      el.addEventListener('pointerleave', leave);
      el.addEventListener('focusin', enter(el));
      el.addEventListener('focusout', leave);
    });
    v = FX.mount(canvas, FRAG, {
      name: 'ribbons', t0: 6, scale: .6, phoneScale: .75,
      update(v) {
        const gl = v.gl;
        gl.uniform1f(v.U('uMode'), mode);
        amt += (target - amt) * (target > amt ? .035 : .07);
        if (cur && amt > .001) {
          const [x, y, w, h] = FX.rectIn(v, cur);
          const k = v.canvas.width / Math.max(1, v.canvas.getBoundingClientRect().width);
          const br = Math.min(parseFloat(getComputedStyle(cur).borderTopLeftRadius) || 0, Math.min(w, h) / k / 2);
          gl.uniform4f(v.U('uHov'), x, y, w, h);
          gl.uniform1f(v.U('uHovR'), br * k);
          gl.uniform1f(v.U('uHue'), +cur.dataset.hue || 0);
          const c = v.canvas.getBoundingClientRect();
          let mx = (FX.mouse.cx - c.left) * k, my = (c.bottom - FX.mouse.cy) * k;
          if (FX.mouse.cx < -1e3 || !cur.matches(':hover')) { mx = x + w * .3; my = y + h * .7; }
          gl.uniform2f(v.U('uHovP'), mx, my);
        }
        gl.uniform1f(v.U('uHovA'), cur ? amt : 0);
      }
    });
  });
})();
