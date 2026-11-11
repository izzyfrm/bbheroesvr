/* Basketball Heroes — site behaviour. Vanilla JS, no build step.
   Lenis (smooth scroll) is loaded from a CDN and is optional: if it fails, native scrolling is used. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  } else {
    document.documentElement.style.scrollBehavior = 'smooth';
  }

  /* anchor links */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id.length > 1 ? $(id) : document.body;
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { offset: -40, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- nav ---------- */
  const nav = $('#nav'), burger = $('#burger'), links = $('#navlinks');
  function closeMenu() {
    if (!links.classList.contains('open')) return;
    links.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    lenis && lenis.start();
  }
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- reveal on scroll ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));

  /* ---------- word-by-word statement ---------- */
  const lede = $('#lede');
  let words = [];
  if (lede) {
    const split = (node, hot) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span');
            s.className = 'w' + (hot ? ' hot' : '');
            s.textContent = part;
            frag.appendChild(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) split(n, hot || n.classList.contains('hot'));
      });
    };
    split(lede, false);
    words = $$('.w', lede);
  }
  function scrubLede() {
    if (!words.length) return;
    const r = lede.getBoundingClientRect(), vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.18)));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }

  /* ---------- scroll handlers (one rAF-throttled listener) ---------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle('stuck', scrollY > 30);
      scrubLede();
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- hero: ember particles ---------- */
  const cv = $('#embers');
  if (cv && !reduced) {
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [], running = true, last = 0;
    const make = (initial) => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 20,
      r: 0.8 + Math.random() * 2.6,
      vy: 14 + Math.random() * 46,
      sway: Math.random() * Math.PI * 2,
      sp: 0.4 + Math.random() * 1.1,
      hot: Math.random() < 0.28,
    });
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, Math.max(28, w / 16)));
      parts = Array.from({ length: count }, () => make(true));
    };
    const frame = (t) => {
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.y -= p.vy * dt;
        p.sway += p.sp * dt;
        p.x += Math.sin(p.sway) * 14 * dt;
        if (p.y < -20) Object.assign(p, make(false));
        const life = Math.max(0, Math.min(1, p.y / h));
        const a = 0.15 + life * 0.75;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, p.hot ? `rgba(53,211,255,${a * 0.8})` : `rgba(255,140,60,${a})`);
        g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 5, 0, 6.2832); ctx.fill();
      }
      requestAnimationFrame(frame);
    };
    resize();
    addEventListener('resize', resize);
    // only animate while the hero is on screen and the tab is visible
    let visible = true;
    const sync = () => {
      const should = visible && !document.hidden;
      if (should && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      else if (!should) running = false;
    };
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; sync(); }).observe(cv.parentElement);
    document.addEventListener('visibilitychange', sync);
    requestAnimationFrame(frame);
  }

  /* ---------- hero art parallax ---------- */
  const art = $('#heroArt');
  if (art && finePointer && !reduced) {
    addEventListener('pointermove', (e) => {
      const x = (e.clientX / innerWidth - 0.5) * 2, y = (e.clientY / innerHeight - 0.5) * 2;
      art.style.transform = `translate3d(${x * -22}px, ${y * -16}px, 0) rotate(${x * 2}deg)`;
    }, { passive: true });
  }

  /* ---------- evil buttons: eyes follow the cursor ---------- */
  if (finePointer) {
    const evil = $$('.evil');
    addEventListener('pointermove', (e) => {
      evil.forEach((b) => {
        if (!b.matches(':hover')) return;
        $$('.eye', b).forEach((eye) => {
          const r = eye.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          const d = Math.hypot(dx, dy) || 1, k = Math.min(3.2, d / 18);
          eye.firstElementChild.style.setProperty('--px', `${(dx / d) * k}px`);
          eye.firstElementChild.style.setProperty('--py', `${(dy / d) * k}px`);
        });
      });
    }, { passive: true });
  }
  // keyboard activation gets the same tactile "press"
  $$('.btn').forEach((b) => {
    b.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') b.classList.add('is-down'); });
    b.addEventListener('keyup', () => b.classList.remove('is-down'));
    b.addEventListener('blur', () => b.classList.remove('is-down'));
  });

  /* ---------- feature cards: spotlight + tilt ---------- */
  if (finePointer && !reduced) {
    $$('.card').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.setProperty('--mx', `${px * 100}%`);
        c.style.setProperty('--my', `${py * 100}%`);
        c.style.setProperty('--ry', `${(px - 0.5) * 9}deg`);
        c.style.setProperty('--rx', `${(0.5 - py) * 9}deg`);
      });
      c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- copy email ---------- */
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const label = $('span', btn), use = $('use', btn), old = label.textContent;
      try { await navigator.clipboard.writeText(btn.dataset.copy); } catch { return; }
      btn.classList.add('done'); label.textContent = 'Copied'; use.setAttribute('href', '#i-check');
      setTimeout(() => { btn.classList.remove('done'); label.textContent = old; use.setAttribute('href', '#i-copy'); }, 1800);
    });
  });

  /* ---------- locked wishlist badge ---------- */
  const wish = $('#wish');
  if (wish) {
    const nope = () => { wish.classList.remove('shake'); void wish.offsetWidth; wish.classList.add('shake'); };
    wish.addEventListener('click', nope);
    wish.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nope(); } });
  }

  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
