// Hero signature: a rotating amber glass ball made of Voronoi cells.
// Each cell is a concave lens framed by a raised rim; light refracts through the ball, picks up amber by path length,
// and shows the lattice on the far side. The canvas covers the hero; the ball sits where the .orb element is.
(() => {
  const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;
uniform vec2 uC; uniform float uR; uniform vec2 uSpin;
#define NC 44
const float GA = 2.39996323;

mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }

vec3 cellC(float fi){
  float y = 1. - (fi + .5) * (2. / float(NC));
  float r = sqrt(max(0., 1. - y * y));
  float ph = fi * GA;
  vec3 j = fract(vec3(fi * .7548777, fi * .5698403, fi * .4370357)) - .5;
  return normalize(vec3(cos(ph) * r, y, sin(ph) * r) + j * .07);
}
// Nearest cell centre, distance to its nearest edge, and the tangent direction pointing into the cell across that edge.
void vor(vec3 p, out vec3 c1, out float e, out vec3 g){
  float b1 = -2., b2 = -2., b3 = -2.; vec3 v1 = vec3(0., 1., 0.), v2 = v1, v3 = v1;
  for (int i = 0; i < NC; i++){
    vec3 c = cellC(float(i)); float d = dot(p, c);
    if (d > b1){ b3 = b2; v3 = v2; b2 = b1; v2 = v1; b1 = d; v1 = c; }
    else if (d > b2){ b3 = b2; v3 = v2; b2 = d; v2 = c; }
    else if (d > b3){ b3 = d; v3 = c; }
  }
  vec3 n2 = normalize(v1 - v2), n3 = normalize(v1 - v3);
  float e2 = dot(p, n2), e3 = dot(p, n3);
  // soft corner where two edges meet, so rims round off instead of making spikes
  float k = .018, hm = clamp(.5 + .5 * (e3 - e2) / k, 0., 1.);
  e = mix(e3, e2, hm) - k * hm * (1. - hm);
  g = normalize(mix(n3, n2, hm));
  g = normalize(g - p * dot(p, g) + 1e-5);
  c1 = v1;
}
vec3 keyDir(){ return normalize(vec3(-.55 + uMouse.x * .3, .62 + uMouse.y * .22, .58)); }
// A dark studio: big warm key softbox upper left, a strip light on the right, a hot rim light behind.
vec3 env(vec3 r){
  vec3 col = vec3(.006, .004, .003);
  float k1 = max(dot(r, keyDir()), 0.);
  col += vec3(1., .9, .74) * (pow(k1, 40.) * 4.5 + pow(k1, 5.) * .45);
  float k4 = max(dot(r, normalize(vec3(.35, .85, .4))), 0.);
  col += vec3(1., .95, .85) * pow(k4, 60.) * 2.6;
  float k2 = max(dot(r, normalize(vec3(.92, .1, .3))), 0.);
  col += vec3(1., .72, .4) * pow(k2, 40.) * 2.2;
  col += vec3(.85, .6, .35) * smoothstep(.6, 1., r.y) * .3;
  float k3 = max(dot(r, normalize(vec3(.45, .3, -.84))), 0.);
  col += vec3(1., .55, .2) * pow(k3, 8.) * 1.6;
  return col;
}
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }

void main(){
  vec2 q = (gl_FragCoord.xy - uC) / uR;
  if (dot(q, q) > 2.6){ gl_FragColor = vec4(0.); return; }
  vec3 ro = vec3(0., 0., 7.);
  vec3 rd = normalize(vec3(q * .1443, -1.));
  float b = dot(ro, rd);
  float d2 = dot(ro, ro) - b * b;
  float dm = sqrt(max(d2, 0.));
  float px = 1.4 / uR;
  float cover = smoothstep(1. + px * .5, 1. - px, dm);
  // faint warm halo hugging the ball
  float halo = exp(-max(dm - 1., 0.) * 9.) * .2 * (1. - cover);
  vec3 col = vec3(0.);
  if (dm < 1. + px){
    float t = -b - sqrt(max(1. - d2, 0.));
    vec3 P = ro + rd * t;
    P = normalize(P);
    float ay = uTime * .24 + uSpin.x;
    float ax = .38 + uSpin.y + .07 * sin(uTime * .31);
    mat3 Rm = rotX(ax) * rotY(ay);
    vec3 L = keyDir();
    vec3 V = -rd;

    // front surface
    vec3 Po = Rm * P, c1, g; float e;
    vor(Po, c1, e, g);
    vec3 qo = Po - c1 * dot(Po, c1);
    float rimW = .048;
    float slope = 2.1 * (1. - smoothstep(0., rimW, e))
                - 1.25 * smoothstep(rimW * .7, rimW * 1.5, e) * (1. - smoothstep(rimW * 1.5, rimW * 3.4, e));
    vec3 No = normalize(Po - g * slope * .55 - qo * 1.35);
    vec3 N = No * Rm;                       // back to world space (transpose of a rotation)
    float cosi = clamp(dot(N, V), 0., 1.);
    float F = .05 + .95 * pow(1. - cosi, 5.);
    vec3 refl = env(reflect(rd, N));

    // through the glass to the far side
    vec3 T = refract(rd, N, 1. / 1.5);
    float tb = max(-2. * dot(P, T), 0.);
    vec3 Pb = P + T * tb;
    vec3 cb, gb; float eb;
    vor(Rm * Pb, cb, eb, gb);
    vec3 nb = normalize(Pb);
    vec3 To = refract(T, -nb, 1.5);
    vec3 back = dot(To, To) < .01 ? env(reflect(T, -nb)) * .5 : env(To);
    vec3 absorb = exp(-vec3(.26, .82, 2.5) * tb);
    float dc = length(cross(T, P));            // how close the inner ray passes the core
    float core = exp(-dc * dc * 2.6);
    float dif = .45 + .55 * max(dot(P, L) * .5 + .5, 0.);
    vec3 inner = back * 1.2 + vec3(1., .52, .12) * core * 1.35 + vec3(.9, .42, .1) * .14 * dif;
    float backLine = 1. - smoothstep(.004, .022, eb);
    inner *= 1. - .6 * backLine;
    inner += vec3(1., .72, .32) * exp(-abs(eb - .034) / .01) * .6 * dif;  // far rims glint through
    inner *= absorb;

    // a focused caustic inside each lens, offset toward the key light, plus a soft lens glow
    vec3 Lo = Rm * L;
    vec3 off = (Lo - c1 * dot(Lo, c1)) * .085;
    vec3 dq = qo + off;
    float caust = exp(-dot(dq, dq) / .0022) + .12 * exp(-dot(qo, qo) / .012);
    float facing = smoothstep(-.2, .6, dot(c1 * Rm, V));

    col = mix(inner, refl, F);
    col += vec3(1., .74, .34) * caust * .28 * facing * dif;
    // rim tops catch the key light hard
    float rimTop = exp(-pow((e - rimW * .9) / (rimW * .45), 2.));
    col += vec3(1., .84, .55) * rimTop * pow(max(dot(reflect(rd, N), L), 0.), 6.) * 1.2;
    // the groove between cells is a dark seam
    float groove = 1. - smoothstep(.003, .014, e);
    col = mix(col, vec3(.05, .016, .0), groove * .9);
    // silhouette: amber glow and a sharp specular edge
    float fr = 1. - max(dot(P, V), 0.);
    col += vec3(1., .5, .14) * pow(fr, 2.6) * .55;
    col += vec3(1., .9, .72) * pow(fr, 14.) * 1.6 * (.4 + .6 * smoothstep(-.4, .6, dot(P, L)));
    col *= .85 + .3 * dif;
    col = aces(col * 1.05);
    col = pow(col, vec3(.96, 1.06, 1.3));   // honey grade: pale gold highlights, brown shadows
  }
  vec3 hc = vec3(1., .46, .1) * halo;
  gl_FragColor = vec4(col * cover + hc, cover + halo * .9);
}`;
  const canvas = document.querySelector('canvas[data-crystal]');
  const orb = document.querySelector('.orb');
  if (!canvas || !orb || !window.FX) return;
  const spin = [0, 0];
  let lastT = null;
  FX.mount(canvas, FRAG, {
    name: 'crystal', t0: 4.2,
    update(v, t) {
      const [x, y, w, h] = FX.rectIn(v, orb);
      v.gl.uniform2f(v.U('uC'), x + w / 2, y + h / 2);
      v.gl.uniform1f(v.U('uR'), w / 2);
      // the ball leans toward the cursor
      spin[0] += (FX.mouse.x * .7 - spin[0]) * .04; spin[1] += (-FX.mouse.y * .45 - spin[1]) * .04;
      v.gl.uniform2f(v.U('uSpin'), spin[0], spin[1]);
    }
  });
})();
