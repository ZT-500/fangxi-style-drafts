// 流光白 · page behaviour: reveals, nav, menu, area details, principle slides, cursor ring.
(() => {
  const root = document.documentElement;
  const isStatic = root.classList.contains('static');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveals
  const reveals = document.querySelectorAll('.reveal');
  if (isStatic || reduce || !('IntersectionObserver' in window)) reveals.forEach(el => el.classList.add('in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  }

  // Nav background after the hero starts to scroll away
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Mobile menu
  const burger = nav.querySelector('.burger');
  const setMenu = open => { nav.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单'); };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  document.querySelectorAll('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // Focus-area details: the arrow opens a frosted panel over the render
  document.querySelectorAll('.area .arrow').forEach(btn => btn.addEventListener('click', () => {
    const area = btn.closest('.area'); const open = !area.classList.contains('show');
    area.classList.toggle('show', open); btn.setAttribute('aria-expanded', open);
  }));

  // Capability cards: the glow follows the pointer
  document.querySelectorAll('.card').forEach(c => c.addEventListener('pointermove', e => {
    const b = c.getBoundingClientRect();
    c.style.setProperty('--mx', ((e.clientX - b.left) / b.width * 100).toFixed(1) + '%');
    c.style.setProperty('--my', ((e.clientY - b.top) / b.height * 100).toFixed(1) + '%');
  }));

  // Principle slides
  const slides = [...document.querySelectorAll('.slide')], dots = [...document.querySelectorAll('.dots button')];
  let cur = 0, timer;
  const show = i => { cur = i; slides.forEach((s, k) => s.classList.toggle('on', k === i)); dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', k === i); }); };
  const auto = () => { clearInterval(timer); if (!isStatic && !reduce) timer = setInterval(() => show((cur + 1) % slides.length), 6500); };
  dots.forEach((d, i) => d.addEventListener('click', () => { show(i); auto(); }));
  auto();

  // Cursor ring (fine pointers only; hidden by CSS on touch and in static mode)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !isStatic) {
    const ring = document.querySelector('.cur'), dot = document.querySelector('.cur-dot');
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, on = false;
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      if (!on) { on = true; rx = x; ry = y; requestAnimationFrame(loop); }
      ring.classList.toggle('big', !!e.target.closest('a, button, summary, .area-vis'));
    }, { passive: true });
    document.addEventListener('pointerleave', () => { ring.style.opacity = dot.style.opacity = 0; });
    document.addEventListener('pointerenter', () => { ring.style.opacity = dot.style.opacity = 1; });
    function loop() {
      rx += (x - rx) * (reduce ? 1 : .18); ry += (y - ry) * (reduce ? 1 : .18);
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      if (Math.abs(x - rx) + Math.abs(y - ry) > .2) requestAnimationFrame(loop); else on = false;
    }
  }
})();
