import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('ready');

/* ---------- smooth scroll (optional) ---------- */
let lenis = null;
if (!reduce) {
  import('./vendor/lenis.mjs')
    .then(({ default: Lenis }) => { lenis = new Lenis({ lerp: 0.12, autoRaf: false }); })
    .catch(() => {});
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || !lenis) return;
  const id = a.getAttribute('href');
  const t = id.length > 1 && document.querySelector(id);
  if (t) { e.preventDefault(); lenis.scrollTo(t); }
});

/* ---------- small UI ---------- */
const nav = $('#nav');
const rows = $$('.row');

$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const label = $('.label', b);
  try { await navigator.clipboard.writeText(b.dataset.copy); b.dataset.state = 'copied'; label.textContent = 'Copied'; }
  catch { b.dataset.state = 'failed'; label.textContent = 'Copy failed'; }
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.dataset.state = ''; label.textContent = 'Copy'; }, 1800);
}));

const wish = $('#wishlist');
wish.addEventListener('click', () => {
  const label = $('.label', wish);
  wish.classList.remove('on'); void wish.offsetWidth; wish.classList.add('on');
  label.textContent = 'Not live yet';
  clearTimeout(wish._t);
  wish._t = setTimeout(() => { label.textContent = 'Wishlist soon'; }, 1600);
});

function updateRows() {
  const vc = innerHeight * 0.5;
  let best = null, bd = Infinity;
  for (const r of rows) {
    const b = r.getBoundingClientRect();
    const d = Math.abs(b.top + b.height / 2 - vc);
    if (d < bd) { bd = d; best = r; }
  }
  for (const r of rows) r.classList.toggle('is-on', r === best);
}

const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', (e) => {
  mouse.tx = (e.clientX / innerWidth) * 2 - 1;
  mouse.ty = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

/* ---------- textures ---------- */
function makeBallMaps(renderer) {
  const W = 1024, H = 512;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const c = mk(), b = mk();
  const cx = c.getContext('2d'), bx = b.getContext('2d');
  const ci = cx.createImageData(W, H), bi = bx.createImageData(W, H);
  const w = 0.019, f = 0.016;
  for (let y = 0; y < H; y++) {
    const th = ((y + 0.5) / H) * Math.PI, st = Math.sin(th), dy = Math.cos(th);
    for (let x = 0; x < W; x++) {
      const ph = ((x + 0.5) / W) * Math.PI * 2;
      const dx = -Math.cos(ph) * st, dz = Math.sin(ph) * st;
      const d = Math.min(Math.abs(dx), Math.abs(dy), Math.abs(Math.abs(dz) - 0.7) * 1.25);
      const s = d < w ? 1 : d < w + f ? 1 - (d - w) / f : 0;
      const n = Math.random(), i = (y * W + x) * 4, sh = 0.9 + n * 0.14;
      ci.data[i] = 226 * sh * (1 - s) + 24 * s;
      ci.data[i + 1] = 92 * sh * (1 - s) + 14 * s;
      ci.data[i + 2] = 26 * sh * (1 - s) + 12 * s;
      ci.data[i + 3] = 255;
      const h = (1 - s) * (150 + n * 90) + s * 10;
      bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = h; bi.data[i + 3] = 255;
    }
  }
  cx.putImageData(ci, 0, 0); bx.putImageData(bi, 0, 0);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const bump = new THREE.CanvasTexture(b);
  return { map, bump };
}

function makeHoop() {
  const g = new THREE.Group();
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xff4a14, metalness: 0.5, roughness: 0.35, emissive: 0x3a0e00 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 16, 96), rimMat);
  rim.rotation.x = Math.PI / 2; g.add(rim);
  const brace = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.3), rimMat);
  brace.position.set(0, 0, -1.1); g.add(brace);

  const boardGeo = new THREE.BoxGeometry(3.6, 2.3, 0.04);
  const board = new THREE.Mesh(boardGeo, new THREE.MeshPhysicalMaterial({ color: 0xbfc8ff, transparent: true, opacity: 0.1, roughness: 0.15, depthWrite: false }));
  board.position.set(0, 0.95, -1.27); g.add(board);
  const lm = new THREE.LineBasicMaterial({ color: 0xf4f1ff, transparent: true, opacity: 0.85 });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boardGeo), lm);
  edges.position.copy(board.position); g.add(edges);
  const sq = [[-0.6, 0.14], [0.6, 0.14], [0.6, 1.0], [-0.6, 1.0]], sqPts = [];
  for (let i = 0; i < 4; i++) { const a = sq[i], b = sq[(i + 1) % 4]; sqPts.push(a[0], a[1], -1.245, b[0], b[1], -1.245); }
  const sqGeo = new THREE.BufferGeometry();
  sqGeo.setAttribute('position', new THREE.Float32BufferAttribute(sqPts, 3));
  g.add(new THREE.LineSegments(sqGeo, new THREE.LineBasicMaterial({ color: 0xff6b1a })));

  const N = 16, R = 6, pts = [];
  const node = (r, i) => {
    const t = r / (R - 1), rad = lerp(0.97, 0.56, t), a = ((i + (r % 2) * 0.5) / N) * Math.PI * 2;
    return [Math.cos(a) * rad, -t * 1.5, Math.sin(a) * rad];
  };
  for (let r = 0; r < R - 1; r++) for (let i = 0; i < N; i++) {
    const j = r % 2 ? (i + 1) % N : (i - 1 + N) % N;
    pts.push(...node(r, i), ...node(r + 1, i), ...node(r, i), ...node(r + 1, j));
  }
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const net = new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: 0xf4f1ff, transparent: true, opacity: 0.6 }));
  g.add(net);
  g.rotation.set(0.32, -0.3, 0);
  return { group: g, net };
}

/* ---------- 3D scene ---------- */
function initScene(renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  camera.position.set(0, 0, 20);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  const key = new THREE.DirectionalLight(0xfff0e0, 2.6); key.position.set(-5, 8, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0x6278ff, 7); rim.position.set(6, 3, -8); scene.add(rim);
  const under = new THREE.DirectionalLight(0xff7a2a, 0.8); under.position.set(0, -6, 4); scene.add(under);
  scene.add(new THREE.HemisphereLight(0x6a5cff, 0x0d0b26, 0.35));

  // background: arena spotlight + comic halftone
  const bgScene = new THREE.Scene();
  const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uBall: { value: new THREE.Vector2(0.7, 0.5) }, uDpr: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: `
      precision highp float;
      uniform vec2 uRes; uniform float uTime; uniform vec2 uBall; uniform float uDpr;
      varying vec2 vUv;
      void main(){
        vec2 uv = vUv; float asp = uRes.x / uRes.y;
        vec3 night = vec3(.051,.043,.149);
        vec3 haze = vec3(.17,.12,.42);
        vec2 lp = vec2(.5 + .1*sin(uTime*.12), 1.3);
        float spot = smoothstep(1.6, .05, length((uv - lp) * vec2(asp*.7, 1.)));
        float glow = smoothstep(.6, 0., length((uv - uBall) * vec2(asp, 1.)));
        float tone = clamp(spot*.8 + glow*.55, 0., 1.);
        vec2 p = gl_FragCoord.xy / (7. * uDpr);
        p = mat2(.7071, -.7071, .7071, .7071) * p;
        float r = .56 * sqrt(tone);
        float dots = smoothstep(r, r - .09, length(fract(p) - .5));
        vec3 col = mix(night, haze, spot*.55);
        col = mix(col, vec3(.55,.2,.08), glow*.28);
        col += dots * mix(vec3(.31,.42,1.), vec3(1.,.45,.12), glow) * (.08 + .14*tone);
        float vig = smoothstep(1.35, .35, length((uv - .5) * vec2(asp*.8, 1.)));
        col *= .6 + .4*vig;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

  // ball
  const maps = makeBallMaps(renderer);
  const ball = new THREE.Group(); scene.add(ball);
  const spin = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 64),
    new THREE.MeshPhysicalMaterial({ map: maps.map, bumpMap: maps.bump, bumpScale: 3, roughness: 0.62, clearcoat: 0.2, clearcoatRoughness: 0.45, sheen: 0.5, sheenColor: new THREE.Color(0xff9a5a), sheenRoughness: 0.6 })
  );
  spin.rotation.set(0.5, 0.3, 0.25);
  ball.add(spin);

  // hoop
  const hoop = makeHoop(); scene.add(hoop.group);

  const anchors = $$('[data-ball]');
  const hoopAnchor = $('#hoop-anchor');
  let W = innerWidth, H = innerHeight, wpp = 1;
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    wpp = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z) / H;
    const pr = renderer.getPixelRatio();
    bgMat.uniforms.uRes.value.set(W * pr, H * pr);
    bgMat.uniforms.uDpr.value = pr;
  }
  resize(); addEventListener('resize', resize);
  const toWorld = (x, y, out) => out.set((x - W / 2) * wpp, -(y - H / 2) * wpp, 0);

  function ballTarget() {
    const vc = H * 0.5;
    const pts = anchors.map((a) => { const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width }; });
    if (vc <= pts[0].y) return pts[0];
    const L = pts[pts.length - 1];
    if (vc >= L.y) return L;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (vc >= a.y && vc <= b.y) {
        const t = (vc - a.y) / (b.y - a.y || 1), e = t * t * (3 - 2 * t);
        return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) - Math.sin(t * Math.PI) * H * 0.08, s: lerp(a.s, b.s, e) };
      }
    }
    return L;
  }

  // shooting
  const shootBtn = $('#shoot'), fill = $('#meter-fill'), result = $('#shot-result'), makesEl = $('#makes');
  let charging = false, chargeT = 0, shot = null, netT = 9, makes = 0, streak = 0, hoopVisible = false;
  const power = () => { const c = (chargeT / 1.3) % 2; return c <= 1 ? c : 2 - c; };
  const startCharge = () => { if (shot || charging || !hoopVisible) return; charging = true; chargeT = 0; shootBtn.classList.add('is-charging'); };
  const release = () => {
    if (!charging) return;
    charging = false; shootBtn.classList.remove('is-charging');
    fire(power());
  };
  shootBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); shootBtn.setPointerCapture?.(e.pointerId); startCharge(); });
  shootBtn.addEventListener('pointerup', release);
  shootBtn.addEventListener('pointercancel', release);
  shootBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  shootBtn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startCharge(); } });
  shootBtn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } });

  const pos = new THREE.Vector3(), tmp = new THREE.Vector3();
  let radius = 1, first = true, introT = reduce ? 1 : 0;
  const introStart = performance.now();
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const plans = {
    make: [[P(0, 0.95, 0), 2.3, 0.85], [P(0, -1.7, 0), 0, 0.38, 'swish'], [P(0.3, -3.4, 0.5), 0.35, 0.32]],
    short: [[P(0, 0.12, 1.0), 2.0, 0.8], [P(0.5, -2.8, 2.4), 0.6, 0.55]],
    long: [[P(0, 1.35, -1.0), 2.4, 0.9], [P(-0.8, -0.1, 0.95), 0.5, 0.35], [P(-1.8, -3, 2.2), 0.5, 0.45]],
  };

  function fire(p) {
    const zone = p >= 0.62 && p <= 0.86 ? 'make' : p < 0.62 ? 'short' : 'long';
    hoop.group.updateMatrixWorld();
    let from = hoop.group.worldToLocal(pos.clone());
    const segs = plans[zone].map(([to, h, dur, ev]) => { const s = { from, to, h, dur, ev }; from = to; return s; });
    shot = { segs, i: 0, t: 0, zone, rb: radius / hoop.group.scale.x };
    result.textContent = '';
  }
  function announce(zone) {
    if (zone === 'make') {
      makes++; streak++;
      result.textContent = streak > 1 ? `Swish. That's ${streak} in a row.` : 'Swish.';
      makesEl.textContent = `${makes} made`;
    } else {
      streak = 0;
      result.textContent = zone === 'short' ? 'Short. Let go a little later.' : 'Off the back iron. Let go a little sooner.';
    }
  }
  function stepShot(dt) {
    const seg = shot.segs[shot.i];
    shot.t += dt / seg.dur;
    const t = Math.min(shot.t, 1);
    const p = seg.from.clone().lerp(seg.to, t);
    p.y += seg.h * 4 * t * (1 - t);
    pos.copy(hoop.group.localToWorld(p));
    radius = shot.rb * hoop.group.scale.x;
    spin.rotateOnWorldAxis(AX, -dt * 9);
    if (shot.t >= 1) {
      if (shot.i === 0) announce(shot.zone);
      shot.i++; shot.t = 0;
      const nx = shot.segs[shot.i];
      if (!nx) { shot = null; return; }
      if (nx.ev === 'swish') netT = 0;
    }
  }
  const bounce = (t) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  };

  let time = 0;
  return function update(dt, scrollVel) {
    time += dt;
    mouse.x = lerp(mouse.x, mouse.tx, 1 - Math.exp(-dt * 4));
    mouse.y = lerp(mouse.y, mouse.ty, 1 - Math.exp(-dt * 4));

    // hoop follows its anchor
    const hr = hoopAnchor.getBoundingClientRect();
    hoopVisible = hr.bottom > -H * 0.3 && hr.top < H * 1.3;
    hoop.group.visible = hoopVisible;
    if (hoopVisible) {
      toWorld(hr.left + hr.width / 2, hr.top + hr.height / 2, hoop.group.position);
      hoop.group.scale.setScalar((hr.width / 2) * wpp);
      hoop.group.rotation.y = -0.3 + mouse.x * 0.08;
    }
    hoop.group.updateMatrixWorld();
    netT += dt;
    const wob = Math.sin(netT * 16) * Math.exp(-netT * 4);
    hoop.net.scale.set(1 - wob * 0.08, 1 + wob * 0.3, 1 - wob * 0.08);

    // ball
    if (shot) stepShot(dt);
    else {
      const tg = ballTarget();
      let tx = tg.x + mouse.x * 14, ty = tg.y + mouse.y * 10;
      if (introT < 1) { introT = Math.min(1, (performance.now() - introStart) / 1500); ty -= (1 - bounce(introT)) * H * 0.9; }
      toWorld(tx, ty, tmp);
      const k = first || introT < 1 ? 1 : 1 - Math.exp(-dt * 9);
      pos.lerp(tmp, k);
      radius = lerp(radius, (tg.s / 2) * wpp, k);
      first = false;
      spin.rotateOnWorldAxis(AX, scrollVel * 0.003);
      if (!reduce) spin.rotateOnWorldAxis(AY, dt * 0.35);
    }
    ball.position.copy(pos);
    ball.scale.setScalar(Math.max(radius, 0.001));

    if (charging) { chargeT += dt; fill.style.width = `${power() * 100}%`; }
    else if (!shot) fill.style.width = '0%';

    bgMat.uniforms.uTime.value = time;
    bgMat.uniforms.uBall.value.set(pos.x / wpp / W + 0.5, pos.y / wpp / H + 0.5);

    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.clearDepth();
    renderer.render(scene, camera);
  };
}

let update3d = null;
try {
  const renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: true, powerPreference: 'high-performance' });
  update3d = initScene(renderer);
} catch (err) {
  console.warn('3D disabled:', err);
  document.documentElement.classList.add('no-gl');
}

/* ---------- loop ---------- */
let last = performance.now(), lastY = scrollY;
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  lenis?.raf(now);
  const y = scrollY, vel = y - lastY; lastY = y;
  nav.classList.toggle('stuck', y > 20);
  updateRows();
  update3d?.(dt, vel);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
