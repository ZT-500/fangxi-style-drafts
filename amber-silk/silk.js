// Liquid silk: a glossy height-field sheet, warm key light from the right, cool steel fill from the left.
// Usage: <canvas data-silk data-tone="amber|iris" data-gain="1"></canvas>
(() => {
  const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uGain; uniform float uTone; uniform vec2 uShift;
uniform vec4 uK; // normal strength, strip intensity, strip width, bounce
uniform vec4 uK2; uniform float uScale; uniform float uLift; uniform float uDrop; // warm intensity, fine fold amount, warm hue shift, cool intensity
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Height of the sheet: long swells, a diagonal fold, and fine ripples, slowly drifting.
float H(vec2 p, float t){
  p += uShift;
  // Folds run along a diagonal, like a sheet of silk pulled corner to corner.
  vec2 d = normalize(vec2(1., .62));
  float u = dot(p, d), v = dot(p, vec2(-d.y, d.x));
  v += .35 * sin(u * 1.2 + t * .09) + .12 * sin(u * 3.1 - t * .13);
  float h = 1.05 * sin(v * 1.85 + t * .12);
  h += .22 * sin(v * 3.6 + 1.2 * sin(u * .8 + t * .07) - t * .1);
  h += .12 * uK2.y * sin(v * 7.8 + u * 1.5 + t * .2);
  h += .05 * uK2.y * sin(v * 15.3 - u * 2.2 - t * .25);
  float c = sin(v * 1.3 - u * .35 + t * .05);
  h -= .45 * sqrt(c * c + .04);   // a soft crease, never a hard seam
  return h;
}
float edge(float x, float t){ return -.02 + .36 * x + .14 * sin(x * 2.1 + t * .1) + .04 * sin(x * 4.7 - t * .14); }
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / min(uRes.y, uRes.x / 1.1);
  vec2 p = uv * uScale + uMouse * .04;
  float t = uTime;
  float e = .0015;
  float h = H(p, t);
  float hx = (H(p + vec2(e, 0.), t) - h) / e;
  float hy = (H(p + vec2(0., e), t) - h) / e;
  vec3 n = normalize(vec3(-hx * uK.x, -hy * uK.x, 1.));
  vec3 hot = vec3(1., .44 + uK2.z, .05 + uK2.z * .3), gold = vec3(1., .62, .32), cool = vec3(.36, .46, .66), deep = vec3(.42, .1, .02);
  if (uTone > .5) {
    vec2 dd = normalize(vec2(1., .62)); float vv = dot(p + uShift, vec2(-dd.y, dd.x));
    float tt = .55 * abs(fract(vv * .45 + h * .12) * 2. - 1.); vec3 pal = .5 + .5 * cos(6.2832 * (tt + vec3(0., .25, .5)));   // orange-red-magenta-violet-blue-cyan, no green
    hot = mix(vec3(.95, .18, .5), pal * 1.1, .65); gold = vec3(.85, .9, 1.); cool = vec3(.25, .38, 1.); deep = vec3(.35, .04, .3);
  }
  // A studio around the silk: what each point reflects decides how it looks.
  vec3 r = reflect(vec3(0., 0., -1.), n);
  vec3 col = vec3(.003);
  float side = smoothstep(-.9, .6, uv.x + .2 * uv.y);                                           // the right of the frame faces the warm light
  col += hot * smoothstep(-.35, .45, r.x + .15 * r.y) * (.55 + .45 * smoothstep(-.6, .4, r.y)) * uK2.x * (.45 + .75 * side);      // warm softbox, right
  col += gold * exp(-abs(r.y - .22 - .25 * r.x) * uK.z) * smoothstep(-.5, .45, r.x) * uK.y;       // white-gold strip light
  col += cool * smoothstep(-.3, -.9, r.x) * smoothstep(-.6, .3, r.y) * uK2.w * (1.15 - side);                    // steel fill, left
  col += deep * smoothstep(-.15, -.85, r.y) * uK.w;                                                // warm bounce from below
  float lit = max(dot(n, normalize(vec3(.6, .4, .7))), 0.);
  col += mix(deep, hot, .45) * lit * .32 * (.4 + .8 * side);
  col *= .3 + .7 * smoothstep(-1.5, .5, h);                                                     // troughs fall into shadow
  // Clip to the sheet, with a lit lip along its edge.
  float y = uv.y - edge(uv.x, t) - uLift + uDrop;
  float sheet = 1. - smoothstep(-.015, .02, y);
  float lip = exp(-abs(y) * 60.) * (.35 + .65 * lit);
  col = col * sheet + hot * lip * .55 * smoothstep(.3, -.2, uv.x - .4);
  col *= uGain;
  col *= 1. - .35 * dot(uv * vec2(.6, .9), uv * vec2(.6, .9));
  col = (col * (2.51 * col + .03)) / (col * (2.43 * col + .59) + .14);   // ACES-style tonemap keeps highlights saturated
  col += (hash(gl_FragCoord.xy + fract(t)) - .5) * .025;
  gl_FragColor = vec4(max(col, 0.), 1.);
}`;
  const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('canvas[data-silk]').forEach(canvas => {
    const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
    if (!gl) { canvas.classList.add('no-gl'); return; }
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); document.documentElement.dataset.glError = gl.getShaderInfoLog(s); } return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) document.documentElement.dataset.glError = "link: " + gl.getProgramInfoLog(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(prog, n);
    const tone = canvas.dataset.tone === 'iris' ? 1 : 0;
    const gain = parseFloat(canvas.dataset.gain || '1');
    const K = (canvas.dataset.k || '1.9,2.6,9,.06').split(',').map(Number);
    const K2 = (canvas.dataset.k2 || '1.6,2.2,-.09,1.0').split(',').map(Number);
    const K2P = canvas.dataset.k2p ? canvas.dataset.k2p.split(',').map(Number) : K2;   // a narrow portrait sheet catches too much of the cool fill
    const shift = (canvas.dataset.shift || '0,0').split(',').map(Number);
    const mouse = [0, 0], target = [0, 0];
    addEventListener('pointermove', e => { target[0] = e.clientX / innerWidth - .5; target[1] = .5 - e.clientY / innerHeight; }, { passive: true });
    let running = false, visible = true;
    const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
    const size = () => {
      const dpr = Math.min(devicePixelRatio, innerWidth < 600 ? 1 : 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w === canvas.width && h === canvas.height) return;
      canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); kick();
    };
    size(); new ResizeObserver(size).observe(canvas);   // the box can change without a window resize (layout shifts, fonts, address bar)
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
    const start = performance.now();
    function frame(now) {
      mouse[0] += (target[0] - mouse[0]) * .03; mouse[1] += (target[1] - mouse[1]) * .03;
      gl.uniform2f(U('uRes'), canvas.width, canvas.height);
      gl.uniform1f(U('uTime'), 12 + (reduce ? 0 : (now - start) / 1000));
      gl.uniform2f(U('uMouse'), mouse[0], mouse[1]);
      const portrait = canvas.clientHeight > canvas.clientWidth;
      gl.uniform4fv(U('uK'), K); gl.uniform4fv(U('uK2'), portrait ? K2P : K2);
      gl.uniform1f(U('uGain'), gain); gl.uniform1f(U('uScale'), parseFloat(canvas.dataset.scale || '1.25')); gl.uniform1f(U('uLift'), parseFloat(canvas.dataset.lift || '0')); gl.uniform1f(U('uDrop'), canvas.dataset.drop && portrait ? parseFloat(canvas.dataset.drop) : 0); gl.uniform1f(U('uTone'), tone); gl.uniform2f(U('uShift'), shift[0], shift[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduce && visible) requestAnimationFrame(frame); else running = false;
    }
    kick();
  });
})();
