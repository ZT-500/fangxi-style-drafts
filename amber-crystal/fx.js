// Shared WebGL helper: one full-screen fragment shader per canvas.
// Handles sizing (ResizeObserver on the canvas), offscreen pausing, reduced motion, eased cursor and GL errors.
window.FX = (() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, cx: -1e4, cy: -1e4 };
  addEventListener('pointermove', e => {
    mouse.tx = e.clientX / innerWidth * 2 - 1; mouse.ty = 1 - e.clientY / innerHeight * 2;
    mouse.cx = e.clientX; mouse.cy = e.clientY;
  }, { passive: true });
  const err = msg => { console.error(msg); const d = document.documentElement.dataset; d.glError = (d.glError ? d.glError + ' | ' : '') + msg; };
  const all = [];
  let ticking = false;
  // One rAF loop drives every canvas, so eased values are shared and frames stay in step.
  function tick(now) {
    ticking = false;
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
    let again = false;
    for (const v of all) if (v.want) { v.draw(now); if (!reduce && v.visible) again = true; else v.want = false; }
    if (again) { ticking = true; requestAnimationFrame(tick); }
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } };

  function mount(canvas, frag, opts = {}) {
    const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: true, alpha: true });
    if (!gl) { canvas.classList.add('no-gl'); return null; }
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) err((opts.name || 'shader') + ': ' + gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { err('link ' + (opts.name || '') + ': ' + gl.getProgramInfoLog(prog)); canvas.classList.add('no-gl'); return null; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const cache = {};
    const U = n => (n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(prog, n)));
    const start = performance.now();
    const v = {
      canvas, gl, U, visible: true, want: false, dpr: 1,
      kick() { v.want = true; request(); },
      draw(now) {
        if (!canvas.width) return;
        const t = (opts.t0 || 10) + (reduce ? 0 : (now - start) / 1000);
        gl.uniform2f(U('uRes'), canvas.width, canvas.height);
        gl.uniform1f(U('uTime'), t);
        gl.uniform2f(U('uMouse'), mouse.x, mouse.y);
        if (opts.update) opts.update(v, t);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    };
    const size = () => {
      const phone = innerWidth < 700;
      v.dpr = Math.min(devicePixelRatio || 1, phone ? 1 : (opts.maxDpr || 1.5)) * (phone ? (opts.phoneScale || opts.scale || 1) : (opts.scale || 1));
      const w = Math.max(1, Math.round(canvas.clientWidth * v.dpr)), h = Math.max(1, Math.round(canvas.clientHeight * v.dpr));
      if (w === canvas.width && h === canvas.height) return;
      canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); v.kick();
    };
    size(); new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(es => { v.visible = es[es.length - 1].isIntersecting; if (v.visible) v.kick(); }, { rootMargin: '120px 0px' }).observe(canvas);
    all.push(v); v.kick();
    return v;
  }
  // Position of an element relative to a canvas, in the canvas's device pixels with a bottom-left origin (what gl_FragCoord uses).
  function rectIn(v, el) {
    const c = v.canvas.getBoundingClientRect(), r = el.getBoundingClientRect(), k = v.canvas.width / Math.max(1, c.width);
    return [(r.left - c.left) * k, (c.bottom - r.bottom) * k, r.width * k, r.height * k];
  }
  return { mount, mouse, reduce, rectIn, request };
})();
