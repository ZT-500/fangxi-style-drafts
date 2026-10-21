// 深海光雾 · small Canvas2D accents for section headings and cards.
// A thin stream of blue smoke enters from the left (the question) and fans out into gold sparks on the right (answers and sources).
// Usage: <canvas class="spark" data-spark="head|wide"></canvas>
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seed = 1234567;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  document.querySelectorAll('canvas.spark').forEach(cv => {
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const wide = cv.dataset.spark === 'wide';
    const N = wide ? 320 : 170;
    const P = Array.from({ length: N }, () => ({ u: rnd(), lane: rnd() * 2 - 1, sp: .025 + rnd() * .05, sz: .5 + rnd() * rnd() * 2.4, ph: rnd() * 6.283 }));
    const S = Array.from({ length: 16 }, () => ({ lane: rnd() * 2 - 1, ph: rnd() * 6.283, a: .03 + rnd() * .05 }));
    let W = 0, H = 0, dpr = 1, vis = true, run = false, last = 0, T = 8 + rnd() * 20;

    const spread = u => .03 + .42 * Math.pow(u, 1.6);
    const at = (u, lane, t) => {
      const x = u * W;
      const y = H * (.55 + .12 * Math.sin(u * 3.1 + t * .22) + .05 * Math.sin(u * 7.3 - t * .31) + lane * spread(u) - .18 * u);
      return [x, y];
    };

    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      // Smoke: soft puffs along the left half.
      for (let i = 0; i < 9; i++) {
        const u = (i + .5) / 9 * .75;
        const [x, y] = at(u, Math.sin(i * 2.1 + t * .1) * .5, t);
        const r = H * (.16 + .22 * u);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(70,130,240,.10)');
        g.addColorStop(1, 'rgba(20,50,140,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      // Smoke strands.
      ctx.lineWidth = 1;
      for (const s of S) {
        ctx.strokeStyle = `rgba(150,200,255,${s.a})`;
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) {
          const u = k / 40 * .85;
          const [x, y] = at(u, s.lane * .6 + .08 * Math.sin(u * 9 + s.ph + t * .4), t);
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      // Two gold filaments.
      for (let f = 0; f < 2; f++) {
        const lane = f ? .35 : -.25;
        for (const [w, a] of [[5, .06], [1.1, .55]]) {
          ctx.lineWidth = w; ctx.strokeStyle = `rgba(255,170,60,${a})`;
          ctx.beginPath();
          for (let k = 0; k <= 50; k++) {
            const u = .08 + k / 50 * .9;
            const [x, y] = at(u, lane + .1 * Math.sin(u * 6 + f * 2 + t * .3), t);
            k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      }
      // Sparks drift along the flow and spread out to the right.
      for (const p of P) {
        const u = (p.u + t * p.sp) % 1;
        const [x, y] = at(u, p.lane, t);
        const tw = .5 + .5 * Math.sin(t * 2.2 + p.ph * 7);
        const fade = Math.min(1, u * 5) * Math.min(1, (1 - u) * 6);
        const a = fade * (.25 + .75 * tw) * (.35 + .65 * u);
        const r = p.sz * (.7 + .5 * tw);
        ctx.fillStyle = `rgba(255,${Math.round(150 + 70 * tw)},${Math.round(70 + 60 * tw)},${a})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
        if (p.sz > 2.2) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
          g.addColorStop(0, `rgba(255,150,50,${a * .35})`); g.addColorStop(1, 'rgba(255,120,20,0)');
          ctx.fillStyle = g; ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
        }
      }
    }

    function frame(now) {
      const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
      if (!reduce && !(window.mist && window.mist.paused)) T += dt;
      draw(T);
      if (vis && !reduce) requestAnimationFrame(frame); else { run = false; last = 0; }
    }
    const kick = () => { if (!run) { run = true; requestAnimationFrame(frame); } };
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.5);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
      kick();
    };
    new ResizeObserver(size).observe(cv);
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) kick(); }).observe(cv);
    document.addEventListener('mist:play', kick);
  });
})();
