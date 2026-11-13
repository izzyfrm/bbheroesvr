/* Basketball Heroes: site behaviour.
   Plain ES module, no framework and no build step. Everything degrades cleanly:
   without JS the page is fully readable, without Lenis the browser scrolls natively. */

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

let lenis = null;

/* ---------- hero entrance: wait for the display font so nothing jumps ---------- */
const settle = (promise, ms) => Promise.race([promise.catch(() => {}), new Promise((resolve) => setTimeout(resolve, ms))]);
const heroImg = $('.hero-media img');
const waits = [];
if (document.fonts && document.fonts.load) waits.push(document.fonts.load('900 1em Archivo'));
if (heroImg && heroImg.decode) waits.push(heroImg.decode());
settle(Promise.all(waits), 1400).then(() => requestAnimationFrame(() => root.classList.add('is-ready')));

/* ---------- smooth scrolling (mouse devices only) ---------- */
const header = $('[data-header]');
const headerHeight = () => (header ? header.offsetHeight : 0);

if (finePointer && !reduced) {
  import('/js/vendor/lenis.mjs')
    .then(({ default: Lenis }) => {
      lenis = new Lenis({ autoRaf: true, lerp: 0.1, wheelMultiplier: 1 });
    })
    .catch(() => { /* native scrolling is fine */ });
}

const scrollToTarget = (target) => {
  if (lenis) lenis.scrollTo(target, { offset: -headerHeight() + 1, duration: 1.3, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
};

$$('a[href^="#"], a[href^="/#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const hash = link.getAttribute('href').replace(/^\//, '');
    if (link.getAttribute('href').startsWith('/#') && location.pathname !== '/') return;
    const target = hash.length > 1 ? $(hash) : null;
    if (!target) return;
    event.preventDefault();
    closeMenu();
    scrollToTarget(target);
    history.pushState(null, '', hash);
  });
});

$$('a.brand').forEach((brand) => {
  brand.addEventListener('click', (event) => {
    if (location.pathname !== '/') return;
    event.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    if (location.hash) history.pushState(null, '', '/');
  });
});

/* ---------- mobile menu ---------- */
const toggle = $('[data-menu-toggle]');
const inertTargets = $$('main, .site-footer');

function setMenu(open) {
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
  if (header) header.classList.toggle('menu-open', open);
  inertTargets.forEach((el) => { el.inert = open; });
  if (lenis) (open ? lenis.stop() : lenis.start());
}
function closeMenu() { if (toggle && toggle.getAttribute('aria-expanded') === 'true') setMenu(false); }

if (toggle) {
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); }
  });
  matchMedia('(min-width: 861px)').addEventListener('change', (event) => { if (event.matches) closeMenu(); });
}

/* ---------- header state + hero parallax (one rAF-throttled listener) ---------- */
const parallaxImg = $('.hero-media img');
const hero = $('[data-hero]');
let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-stuck', y > 24);
    if (parallaxImg && hero && !reduced && y < hero.offsetHeight) {
      const progress = y / hero.offsetHeight;
      parallaxImg.style.setProperty('--shift', (y * 0.22).toFixed(1));
      parallaxImg.style.setProperty('--zoom', (progress * 0.05).toFixed(4));
    }
    ticking = false;
  });
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- active section in the nav ---------- */
const navLinks = $$('a[data-nav]');
if (navLinks.length && 'IntersectionObserver' in window) {
  const byId = new Map(navLinks.map((link) => [link.getAttribute('href').replace(/^\/?#/, ''), link]));
  // observe every section, so sections without a nav link (hero, details, community) clear the highlight
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => link.classList.remove('is-active'));
      const link = byId.get(entry.target.id);
      if (link) link.classList.add('is-active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section').forEach((section) => sectionObserver.observe(section));
}

/* ---------- reveal on scroll ---------- */
const reveals = $$('[data-reveal]');
if (reveals.length) {
  const counts = new Map();
  reveals.forEach((el) => {
    const n = counts.get(el.parentElement) || 0;
    counts.set(el.parentElement, n + 1);
    el.style.setProperty('--i', Math.min(n, 4));
  });
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => revealObserver.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }
}

/* ---------- time of day ---------- */
const tod = $('[data-tod]');
if (tod) {
  const images = $$('.tod-img', tod);
  const controls = $('[data-tod-controls]', tod);
  const inputs = $$('input', controls);

  const placeThumb = () => {
    const checked = inputs.find((input) => input.checked);
    if (!checked) return;
    const label = checked.closest('label');
    controls.style.setProperty('--x', `${label.offsetLeft}px`);
    controls.style.setProperty('--w', `${label.offsetWidth}px`);
  };
  inputs.forEach((input) => input.addEventListener('change', () => {
    images.forEach((img) => img.classList.toggle('is-active', img.dataset.time === input.value));
    placeThumb();
  }));
  addEventListener('resize', placeThumb);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeThumb);
  placeThumb();
}

/* ---------- copy email ---------- */
$$('[data-copy]').forEach((button) => {
  const label = $('span', button);
  const icon = $('use', button);
  const original = label.textContent;
  let timer;
  button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(button.dataset.copy); } catch { return; }
    button.classList.add('is-done');
    label.textContent = 'Copied';
    icon.setAttribute('href', '#i-check');
    clearTimeout(timer);
    timer = setTimeout(() => {
      button.classList.remove('is-done');
      label.textContent = original;
      icon.setAttribute('href', '#i-copy');
    }, 1800);
  });
});

/* ---------- footer year ---------- */
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
