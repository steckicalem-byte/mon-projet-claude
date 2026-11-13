// Kit 3D "monde en blocs" pour histoires narrées verticales.
// Tout est déterministe : chaque état dépend uniquement du temps t (secondes).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export { THREE };

// ---------- utilitaires ----------
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (u) => { u = clamp(u); return u * u * u * (u * (u * 6 - 15) + 10); };
export const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
export const easeIn = (u) => Math.pow(clamp(u), 3);
export const ramp = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];

function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  if (opts.nearest) { t.magFilter = THREE.NearestFilter; }
  return t;
}
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...o });
function box(w, h, d, m, x = 0, y = 0, z = 0, parent) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
  if (parent) parent.add(me);
  return me;
}
// bloc aux arêtes arrondies (look « jouet ») ; r = rayon d'arrondi en mètres
const rgeoCache = {};
function rgeo(w, h, d, r) { const k = [w, h, d, r].map((x) => x.toFixed(3)).join(); return (rgeoCache[k] ||= new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.05, h / 2.05, d / 2.05))); }
export function rbox(w, h, d, m, x = 0, y = 0, z = 0, parent, r = 0.035) {
  const me = new THREE.Mesh(rgeo(w, h, d, r), m);
  me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
  if (parent) parent.add(me);
  return me;
}

// ---------- visages ----------
// Expressions : neutral, smile, smirk, worried, scared, shock, angry, shout, sad, closed, whisper
const faceCache = {};
export function faceTex(expr = 'neutral', skin = '#f2c79a') {
  const key = expr + skin;
  if (faceCache[key]) return faceCache[key];
  const t = canvasTex(256, 256, (g, w) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, w);
    const ink = '#1d1a1f';
    g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
    const eye = (x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
    const brow = (x1, y1, x2, y2, lw = 10) => { g.lineWidth = lw; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    const L = 92, R = 164, EY = 108;
    const wide = expr === 'scared' || expr === 'shock';
    if (expr === 'closed') { g.lineWidth = 9; g.beginPath(); g.arc(L, EY, 14, 0.2, Math.PI - 0.2); g.stroke(); g.beginPath(); g.arc(R, EY, 14, 0.2, Math.PI - 0.2); g.stroke(); }
    else if (wide) {
      g.fillStyle = '#fff'; eye(L, EY, 22, 26); eye(R, EY, 22, 26);
      g.lineWidth = 5; g.beginPath(); g.ellipse(L, EY, 22, 26, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(R, EY, 22, 26, 0, 0, 7); g.stroke();
      g.fillStyle = ink; eye(L, EY + 2, 8, 9); eye(R, EY + 2, 8, 9);
    } else {
      eye(L, EY, 13, 19); eye(R, EY, 13, 19);
      g.fillStyle = '#fff'; eye(L + 4, EY - 7, 4.5, 5.5); eye(R + 4, EY - 7, 4.5, 5.5); g.fillStyle = ink;
    }
    if (expr === 'neutral' || expr === 'smile' || expr === 'smirk' || expr === 'whisper' || expr === 'talk') { brow(L - 20, EY - 34, L + 16, EY - 36, 9); brow(R - 16, EY - 36, R + 20, EY - 34, 9); }
    if (expr === 'angry' || expr === 'shout') { brow(L - 26, EY - 42, L + 18, EY - 26, 13); brow(R + 26, EY - 42, R - 18, EY - 26, 13); }
    if (expr === 'worried' || expr === 'sad' || expr === 'scared') { brow(L - 22, EY - 26, L + 16, EY - 40, 8); brow(R + 22, EY - 26, R - 16, EY - 40, 8); }
    if (expr === 'shock') { brow(L - 20, EY - 46, L + 18, EY - 50, 8); brow(R + 20, EY - 46, R - 18, EY - 50, 8); }
    g.lineWidth = 9; const MY = 182;
    switch (expr) {
      case 'smile': g.beginPath(); g.arc(128, MY - 22, 34, 0.25, Math.PI - 0.25); g.stroke(); break;
      case 'smirk': g.beginPath(); g.moveTo(104, MY); g.quadraticCurveTo(140, MY + 8, 162, MY - 14); g.stroke(); break;
      case 'worried': case 'sad': g.beginPath(); g.arc(128, MY + 26, 26, Math.PI + 0.5, -0.5); g.stroke(); break;
      case 'scared': case 'shock': g.fillStyle = '#3a1418'; g.beginPath(); g.ellipse(128, MY, 18, 24, 0, 0, 7); g.fill(); break;
      case 'shout': g.fillStyle = '#3a1418'; g.beginPath(); g.ellipse(128, MY, 34, 26, 0, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.fillRect(100, MY - 22, 56, 9); break;
      case 'angry': g.fillStyle = '#fff'; g.fillRect(98, MY - 12, 60, 24); g.lineWidth = 5; g.strokeRect(98, MY - 12, 60, 24);
        for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(98 + i * 15, MY - 12); g.lineTo(98 + i * 15, MY + 12); g.stroke(); } break;
      case 'whisper': g.beginPath(); g.ellipse(128, MY, 10, 8, 0, 0, 7); g.fill(); break;
      case 'talk': g.fillStyle = '#3a1418'; g.beginPath(); g.ellipse(128, MY - 2, 20, 13, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(112, MY - 13, 32, 5); break;
      case 'closed': g.beginPath(); g.moveTo(108, MY); g.lineTo(148, MY); g.stroke(); break;
      default: g.beginPath(); g.moveTo(110, MY); g.quadraticCurveTo(128, MY + 10, 146, MY); g.stroke();
    }
  });
  faceCache[key] = t;
  return t;
}

// ---------- personnage en blocs ----------
// Unités : 1 "bloc" = 0,36 m. Hauteur totale ≈ 1,87 m.
const S = 0.36;
export function makeChar(o = {}) {
  const skin = o.skin || '#f2c79a';
  const shirtC = o.shirt || '#3b6fd8', pantsC = o.pants || '#2b3550';
  const shirt = mat(shirtC, { roughness: 0.85 });
  const pants = new THREE.MeshStandardMaterial({ map: pantsTex(pantsC), roughness: 0.85 });
  const skinM = mat(skin, { roughness: 0.6 });
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const R1 = 0.03;
  // jambes (pivot à la hanche)
  const legs = [-0.5, 0.5].map((sx) => {
    const p = new THREE.Group(); p.position.set(sx * S * 1.0, 2 * S, 0); body.add(p);
    rbox(S * 0.97, 2 * S, S * 0.97, pants, 0, -S, 0, p, R1);
    rbox(S * 1.0, S * 0.28, S * 1.08, mat(o.shoes || '#202128', { roughness: 0.5 }), 0, -2 * S + S * 0.14, S * 0.05, p, 0.025);
    return p;
  });
  // torse : face avant texturée (uniforme, sweat…)
  const front = new THREE.MeshStandardMaterial({ map: o.hoodie ? hoodieTex(shirtC, o.hoodie) : o.uniform ? uniformTex(shirtC, o) : shirtTex(shirtC), roughness: 0.85 });
  const back = new THREE.MeshStandardMaterial({ map: backTex(shirtC, !!o.hoodie), roughness: 0.85 });
  const torso = new THREE.Mesh(rgeo(2 * S, 2 * S, S, R1), [shirt, shirt, shirt, shirt, front, back]);
  torso.position.set(0, 3 * S, 0); torso.castShadow = true; torso.receiveShadow = true; body.add(torso);
  if (o.walkie) { const w = rbox(0.1, 0.17, 0.05, mat('#1c1c20', { roughness: 0.4 }), 0.4 * S, 3.45 * S, S / 2 + 0.03, body, 0.01); box(0.015, 0.12, 0.015, mat('#111'), 0.03, 0.13, 0, w); box(0.05, 0.02, 0.005, new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff3b2e', emissiveIntensity: 2 }), 0, 0.045, 0.026, w); }
  if (o.hood) rbox(1.7 * S, 0.5 * S, 0.6 * S, shirt, 0, 3.95 * S, -0.35 * S, body, 0.05);
  // bras (pivot épaule)
  const sleeve = o.sleeves === false ? skinM : shirt;
  const arms = [-1, 1].map((sx) => {
    const p = new THREE.Group(); p.position.set(sx * 1.5 * S, 3.85 * S, 0); body.add(p);
    rbox(S * 0.96, 1.45 * S, S * 0.96, sleeve, 0, -0.58 * S, 0, p, R1);
    if (o.hoodie) rbox(S * 0.99, 0.2 * S, S * 0.99, mat(o.hoodie), 0, -1.2 * S, 0, p, 0.015);
    rbox(S * 0.92, 0.6 * S, S * 0.92, skinM, 0, -1.55 * S, 0, p, 0.05);
    const hand = new THREE.Group(); hand.position.set(0, -1.85 * S, 0); p.add(hand);
    p.userData.hand = hand;
    return p;
  });
  // tête arrondie
  const neck = new THREE.Group(); neck.position.set(0, 4 * S, 0); body.add(neck);
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex(o.expr || 'neutral', skin), roughness: 0.6 });
  const head = new THREE.Mesh(rgeo(1.22 * S, 1.2 * S, 1.2 * S, 0.075), [skinM, skinM, skinM, skinM, faceMat, skinM]);
  head.position.y = 0.62 * S; head.castShadow = true; neck.add(head);
  if (o.hair) {
    const hm = mat(o.hair, { roughness: 0.9 });
    rbox(1.32 * S, 0.42 * S, 1.32 * S, hm, 0, 1.18 * S, -0.02 * S, neck, 0.06);
    rbox(1.32 * S, 0.8 * S, 0.34 * S, hm, 0, 0.88 * S, -0.52 * S, neck, 0.05);
    [-1, 1].forEach((sx) => rbox(0.18 * S, 0.5 * S, 1.0 * S, hm, sx * 0.62 * S, 1.0 * S, -0.12 * S, neck, 0.03));
    // mèche avant
    const fr = rbox(1.0 * S, 0.28 * S, 0.4 * S, hm, 0.1 * S, 1.2 * S, 0.5 * S, neck, 0.05); fr.rotation.z = -0.12;
    if (o.hairStyle === 'fluffy') for (let i = 0; i < 6; i++) rbox(0.42 * S, 0.34 * S, 0.42 * S, hm, (i - 2.5) * 0.24 * S, 1.42 * S, ((i % 3) - 1) * 0.25 * S, neck, 0.06);
  }
  if (o.hat === 'police' || o.hat === 'cap') {
    const hc = mat(o.hatColor || '#1f2a4a', { roughness: 0.7 });
    rbox(1.34 * S, 0.5 * S, 1.34 * S, hc, 0, 1.32 * S, 0, neck, 0.06);
    const brim = rbox(1.3 * S, 0.08 * S, 0.62 * S, mat('#121722', { roughness: 0.4 }), 0, 1.1 * S, 0.86 * S, neck, 0.02); brim.rotation.x = 0.12;
    if (o.hat === 'police') { rbox(1.52 * S, 0.16 * S, 1.52 * S, hc, 0, 1.6 * S, 0.04 * S, neck, 0.05); rbox(0.24 * S, 0.24 * S, 0.04, mat('#f1c232', { metalness: 0.7, roughness: 0.3 }), 0, 1.38 * S, 0.68 * S, neck, 0.01); box(1.36 * S, 0.08 * S, 1.36 * S, mat('#0d1018'), 0, 1.14 * S, 0, neck); }
  }
  const ch = { root, body, legs, arms, neck, head, faceMat, skin, expr: o.expr || 'neutral' };
  root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return ch;
}

function shirtTex(base) {
  return canvasTex(128, 128, (g, w) => {
    g.fillStyle = base; g.fillRect(0, 0, w, w);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(44, 0); g.lineTo(64, 22); g.lineTo(84, 0); g.fill();
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, w, 8);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 118, w, 10);
  });
}
function backTex(base, hood) {
  return canvasTex(64, 64, (g, w) => { g.fillStyle = base; g.fillRect(0, 0, w, w); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 58, w, 6); if (hood) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(12, 0, 40, 14); } });
}
function pantsTex(base) {
  return canvasTex(64, 128, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(30, 0, 3, h); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, w, 10); });
}
// uniforme : col, boutons, deux poches à rabat, badge, ceinture
function uniformTex(base, o) {
  return canvasTex(256, 256, (g, w) => {
    g.fillStyle = base; g.fillRect(0, 0, w, w);
    const dk = 'rgba(0,0,0,.28)', lt = 'rgba(255,255,255,.12)';
    g.fillStyle = dk; g.beginPath(); g.moveTo(70, 0); g.lineTo(128, 52); g.lineTo(186, 0); g.fill();
    g.fillStyle = lt; g.beginPath(); g.moveTo(70, 0); g.lineTo(104, 40); g.lineTo(92, 0); g.fill(); g.beginPath(); g.moveTo(186, 0); g.lineTo(152, 40); g.lineTo(164, 0); g.fill();
    g.fillStyle = dk; g.fillRect(124, 52, 8, 160);
    g.fillStyle = '#d8d8d8'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(128, 74 + i * 36, 5, 0, 7); g.fill(); }
    [[36, 70], [150, 70]].forEach(([x, y]) => { g.fillStyle = dk; g.fillRect(x, y, 70, 56); g.fillStyle = lt; g.fillRect(x, y, 70, 14); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, y + 14, 70, 3); });
    if (o.badge !== false) { g.fillStyle = '#f1c232'; g.beginPath(); g.moveTo(58, 46); g.lineTo(80, 40); g.lineTo(84, 64); g.lineTo(70, 74); g.lineTo(56, 64); g.fill(); }
    g.fillStyle = '#c33'; g.fillRect(156, 50, 18, 6); g.fillStyle = '#eee'; g.fillRect(174, 50, 18, 6);
    g.fillStyle = '#15171d'; g.fillRect(0, 218, w, 26); g.fillStyle = '#b9b9b9'; g.fillRect(112, 220, 32, 22); g.fillStyle = '#15171d'; g.fillRect(118, 225, 20, 12);
  });
}

function hoodieTex(base, stripe) {
  return canvasTex(256, 256, (g, w) => {
    g.fillStyle = base; g.fillRect(0, 0, w, w);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(128, 0, 70, 34, 0, 0, 7); g.fill();
    g.fillStyle = stripe; g.fillRect(0, 150, w, 16); g.fillRect(0, 182, w, 16);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(70, 196, 116, 46);
    g.fillStyle = base; g.fillRect(74, 200, 108, 42);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(74, 200, 108, 5);
    g.fillStyle = '#2b2b30'; g.fillRect(125, 20, 6, 236); g.fillStyle = '#bdbdbd'; g.fillRect(122, 30, 12, 18);
    g.strokeStyle = '#eeeeee'; g.lineWidth = 5; g.lineCap = 'round';
    [[100, 22], [156, 22]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 62); g.stroke(); g.fillStyle = '#ddd'; g.fillRect(x - 3, y + 62, 10, 12); });
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, w, 10);
  });
}

// Pose d'un personnage. Les couches d'animation s'additionnent à la pose de base :
// a = { walk, walkAmt, armL:[x,z], armR:[x,z], headYaw, headPitch, headRoll, expr, lean, bob, crouch, yaw,
//       time: t (secondes), phase: décalage propre au perso,
//       idle: 0..1   balancement, respiration, regard qui se promène (jamais de statue),
//       talk: 0..1   bouche qui bouge + gestes des bras + tête qui accompagne,
//       nod: 0..1    hochement de tête (ex. beat(t) quand la musique joue),
//       flinch: 0..1 sursaut (accroupi, recul, bras qui protègent le visage) }
const noise1 = (x) => Math.sin(x) * 0.6 + Math.sin(x * 2.13 + 1.7) * 0.3 + Math.sin(x * 4.37 + 0.4) * 0.1;
export function pose(ch, a = {}) {
  const t = a.time || 0, ph = a.phase || 0;
  const w = a.walk || 0, amt = a.walkAmt ?? (a.walk ? 1 : 0);
  const sw = Math.sin(w * Math.PI * 2) * 0.7 * amt;
  let al = [...(a.armL || [0, 0])], ar = [...(a.armR || [0, 0])];
  let hp = a.headPitch || 0, hy = a.headYaw || 0, hr = a.headRoll || 0;
  let lean = a.lean || 0, roll = 0, bob = a.bob || 0, crouch = a.crouch || 0;
  const idle = a.idle ?? 0;
  if (idle) {
    roll += Math.sin(t * 1.1 + ph) * 0.03 * idle;
    bob += Math.sin(t * 2.2 + ph) * 0.008 * idle;
    hy += noise1(t * 0.45 + ph * 3) * 0.22 * idle; hp += noise1(t * 0.31 + ph) * 0.06 * idle;
    al[0] += Math.sin(t * 1.1 + ph) * 0.06 * idle; ar[0] -= Math.sin(t * 1.1 + ph + 0.5) * 0.06 * idle;
    al[1] += 0.05 * idle; ar[1] += 0.05 * idle;
  }
  const nod = a.nod || 0;
  if (nod) { hp += 0.16 * nod; bob -= 0.02 * nod; roll += Math.sin(t * 3.1 + ph) * 0.02; }
  const talk = a.talk || 0;
  if (talk) {
    const g1 = Math.abs(noise1(t * 2.3 + ph)), g2 = Math.abs(noise1(t * 1.9 + ph + 2));
    ar[0] += (-0.45 - 0.35 * g1) * talk; ar[1] += 0.15 * g1 * talk;
    al[0] += (-0.25 - 0.3 * g2) * talk * 0.7;
    hp += noise1(t * 3.3 + ph) * 0.07 * talk; hy += noise1(t * 1.4 + ph) * 0.1 * talk;
  }
  const fl = a.flinch || 0;
  if (fl) {
    crouch += 0.1 * fl; lean -= 0.18 * fl; hp += 0.2 * fl;
    al = [al[0] + (-2.2 - al[0]) * fl, al[1] + (0.5 - al[1]) * fl];
    ar = [ar[0] + (-2.2 - ar[0]) * fl, ar[1] + (0.5 - ar[1]) * fl];
  }
  ch.legs[0].rotation.x = sw; ch.legs[1].rotation.x = -sw;
  ch.arms[0].rotation.set(al[0] - sw * 0.9, 0, -(al[1] || 0));
  ch.arms[1].rotation.set(ar[0] + sw * 0.9, 0, ar[1] || 0);
  ch.neck.rotation.set(hp, hy, hr);
  ch.body.rotation.set(lean, 0, roll);
  ch.body.position.y = Math.abs(Math.sin(w * Math.PI * 2)) * 0.05 * amt + bob - crouch;
  if (a.yaw !== undefined) ch.root.rotation.y = a.yaw;
  // bouche qui parle : alterne l'expression de base et une bouche ouverte
  let expr = a.expr || ch.baseExpr || ch.expr;
  if (talk && (noise1(t * 9 + ph) + 0.25 * Math.sin(t * 23)) > 0.05) expr = expr === 'whisper' ? 'talk' : expr === 'shout' ? 'shout' : 'talk';
  if (expr !== ch.expr) { ch.expr = expr; ch.faceMat.map = faceTex(expr, ch.skin); ch.faceMat.needsUpdate = true; }
}

// ---------- accessoires ----------
export function boombox(color = '#2b2f3a') {
  const g = new THREE.Group();
  box(0.42, 0.24, 0.14, mat(color), 0, 0, 0, g);
  box(0.3, 0.03, 0.03, mat('#888', { metalness: 0.7 }), 0, 0.17, 0, g);
  box(0.02, 0.06, 0.02, mat('#888'), -0.14, 0.14, 0, g); box(0.02, 0.06, 0.02, mat('#888'), 0.14, 0.14, 0, g);
  const cones = [-0.11, 0.11].map((x) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 20), mat('#111', { roughness: 0.4 }));
    c.rotation.x = Math.PI / 2; c.position.set(x, -0.01, 0.075); g.add(c); return c;
  });
  const led = box(0.05, 0.025, 0.01, new THREE.MeshStandardMaterial({ color: '#000', emissive: '#37ff6b', emissiveIntensity: 2 }), 0, 0.075, 0.072, g);
  g.userData = { cones, led };
  return g;
}
export function walkie() {
  const g = new THREE.Group();
  box(0.07, 0.15, 0.04, mat('#1d1d22'), 0, 0, 0, g);
  box(0.012, 0.1, 0.012, mat('#111'), 0.02, 0.12, 0, g);
  box(0.04, 0.02, 0.005, new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff3b2e', emissiveIntensity: 2 }), 0, 0.05, 0.022, g);
  return g;
}
// Écran (horloge, téléphone…) avec texte, ex. "3:07" / "AM"
export function screenProp(lines, o = {}) {
  const g = new THREE.Group();
  const w = o.w || 0.5, h = o.h || 0.75;
  box(w, h, 0.06, mat(o.frame || '#15161b', { roughness: 0.4 }), 0, 0, 0, g);
  const tex = canvasTex(256, Math.round(256 * h / w), (c, W, H) => {
    const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, o.bg1 || '#3a4a78'); grd.addColorStop(1, o.bg2 || '#1b2340');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((l, i) => { c.font = `${l.size || 60}px "Lilita One", sans-serif`; c.fillStyle = l.color || '#fff'; c.fillText(l.text, W / 2, H * (l.y ?? 0.5)); });
  });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.88, h * 0.88), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  scr.position.z = 0.031; g.add(scr);
  return g;
}

// ---------- ciel, brouillard, lumières de nuit ----------
export function nightSky(scene, o = {}) {
  const top = new THREE.Color(o.top || '#0e1530'), hor = new THREE.Color(o.horizon || '#34406b');
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: top }, hor: { value: hor }, flash: { value: 0 } },
    vertexShader: 'varying vec3 vp; void main(){ vp=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top,hor; uniform float flash; varying vec3 vp; void main(){ float u=clamp(vp.y*1.6,0.,1.); vec3 c=mix(hor,top,pow(u,.7)); c=mix(c,vec3(.85,.9,1.),flash); gl_FragColor=vec4(c,1.); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), m);
  sky.renderOrder = -1; scene.add(sky);
  scene.fog = new THREE.Fog(o.fog || '#2a3458', o.fogNear ?? 40, o.fogFar ?? 320);
  const hemi = new THREE.HemisphereLight(o.hemiSky || '#9db3ff', o.hemiGround || '#30364f', o.hemi ?? 1.35);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(o.moon || '#b7c6ff', o.moonI ?? 1.2);
  moon.position.set(-60, 90, 40); moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  const sc = moon.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 10; sc.far = 250;
  moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.03;
  scene.add(moon); scene.add(moon.target);
  return { sky, hemi, moon, uniforms: m.uniforms, base: { hemi: hemi.intensity, moon: moon.intensity } };
}

// halo lumineux (sprite additif) — remplace un bloom coûteux
let glowTexCache;
export function glow(color = '#ffd28a', size = 2, opacity = 0.9) {
  glowTexCache ||= canvasTex(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexCache, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1);
  return s;
}
// cône de lumière volumétrique (faux)
export function lightCone(len = 20, radius = 5, color = '#fff2c8', opacity = 0.12) {
  const geo = new THREE.ConeGeometry(radius, len, 32, 1, true); geo.translate(0, -len / 2, 0); geo.rotateX(-Math.PI / 2);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { color: { value: new THREE.Color(color) }, op: { value: opacity }, len: { value: len } },
    vertexShader: 'varying float d; varying float cz; varying vec3 n; varying vec3 vv; void main(){ d=-position.z; vec4 mv=modelViewMatrix*vec4(position,1.); cz=-mv.z; vv=normalize(-mv.xyz); n=normalize(normalMatrix*normal); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 color; uniform float op,len; varying float d; varying float cz; varying vec3 n; varying vec3 vv; void main(){ float f=1.-clamp(d/len,0.,1.); float e=pow(abs(dot(n,vv)),1.5); float near=smoothstep(8.,26.,cz); gl_FragColor=vec4(color*op*f*e*near,1.); }',
  });
  return new THREE.Mesh(geo, m);
}

// ---------- ville ----------
function windowTex(seed, litRatio, cols = 8, rows = 16) {
  const r = rng(seed);
  const lit = [];
  const tex = canvasTex(256, 512, (g, W, H) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    const cw = W / cols, rh = H / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const on = r() < litRatio;
      g.fillStyle = on ? (r() < 0.8 ? '#ffd98a' : '#bfe3ff') : '#1d2234';
      g.fillRect(x * cw + cw * 0.22, y * rh + rh * 0.2, cw * 0.56, rh * 0.55);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x * cw + cw * 0.22, y * rh + rh * 0.68, cw * 0.56, rh * 0.07);
    }
  }, { repeat: true });
  const emi = canvasTex(256, 512, (g, W, H) => {
    const r2 = rng(seed);
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const cw = W / cols, rh = H / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const on = r2() < litRatio; const warm = r2() < 0.8;
      if (on) { g.fillStyle = warm ? '#ffcf70' : '#a9d8ff'; g.fillRect(x * cw + cw * 0.22, y * rh + rh * 0.2, cw * 0.56, rh * 0.55); lit.push([x, y]); }
    }
  }, { repeat: true });
  return { tex, emi };
}

function tileTex(base = '#b7bac4', line = '#8e929e', n = 8) {
  return canvasTex(512, 512, (g, W) => {
    g.fillStyle = base; g.fillRect(0, 0, W, W);
    const r = rng(7);
    const c = W / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const k = (r() - 0.5) * 14; g.fillStyle = `rgba(${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${Math.abs(k) / 100})`; g.fillRect(x * c, y * c, c, c); }
    g.strokeStyle = line; g.lineWidth = 3;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * c, 0); g.lineTo(i * c, W); g.stroke(); g.beginPath(); g.moveTo(0, i * c); g.lineTo(W, i * c); g.stroke(); }
  }, { repeat: true });
}

const FACADES = ['#8a93b8', '#c9b79c', '#b98c86', '#7fa3a8', '#a7a0c7', '#d2c6b0', '#8c9db0', '#c4a26f'];

// Construit une place carrée entourée de routes et d'immeubles.
// Retourne { group, windows: [materials], setWindowLight(k) }
export function city(scene, o = {}) {
  const r = rng(o.seed || 3);
  const G = new THREE.Group(); scene.add(G);
  const half = o.plaza || 22; // demi-côté de la place
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat('#3a3e4b', { roughness: o.wet ? 0.35 : 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
  const tt = tileTex(); tt.repeat.set(half / 3, half / 3);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), mat('#c3c6cf', { map: tt, roughness: 0.8 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; plaza.receiveShadow = true; G.add(plaza);
  // trottoirs + marquages de route
  const curbM = mat('#9a9eab');
  [[0, half + 1, half * 2 + 4, 2], [0, -half - 1, half * 2 + 4, 2], [half + 1, 0, 2, half * 2], [-half - 1, 0, 2, half * 2]].forEach(([x, z, w, d]) => box(w, 0.18, d, curbM, x, 0.09, z, G));
  const roadW = 10, ro = half + 2 + roadW / 2;
  const dashM = new THREE.MeshStandardMaterial({ color: '#e8e2c8', roughness: 0.6 });
  for (let i = -12; i <= 12; i++) {
    [[i * 5, ro, 2.2, 0.25], [i * 5, -ro, 2.2, 0.25], [ro, i * 5, 0.25, 2.2], [-ro, i * 5, 0.25, 2.2]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), dashM); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); G.add(m); });
  }
  // passages piétons
  for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 6), dashM); m.rotation.x = -Math.PI / 2; m.position.set(-3 + k * 1.2, 0.03, half + 2 + 5); G.add(m); }
  // immeubles autour
  const winMats = [];
  const variants = [0, 1, 2, 3, 4, 5].map((i) => windowTex(10 + i, 0.45 + 0.08 * i));
  const awnM = ['#c94a4a', '#3d8fd1', '#e0a63a', '#4fa36a', '#9a5ad1'].map((c) => mat(c, { roughness: 0.7 }));
  const shopM = new THREE.MeshStandardMaterial({ color: '#222', emissive: '#ffe2b0', emissiveIntensity: 1.4 });
  const antennas = [];
  const ring = (dist, count, hmin, hmax, detail = false) => {
    for (let side = 0; side < 4; side++) {
      let s = -dist - 10;
      while (s < dist + 10) {
        const w = 10 + r() * 10, d = 12 + r() * 8, h = hmin + r() * (hmax - hmin);
        const along = s + w / 2; s += w + 0.6;
        const across = dist + d / 2;
        let x, z, rw = w, rd = d;
        if (side === 0) { x = along; z = -across; } else if (side === 1) { x = along; z = across; } else if (side === 2) { x = across; z = along; rw = d; rd = w; } else { x = -across; z = along; rw = d; rd = w; }
        const vi = Math.floor(r() * variants.length); const v = variants[vi];
        const col = FACADES[Math.floor(r() * FACADES.length)];
        const tex = v.tex.clone(); const emi = v.emi.clone(); tex.needsUpdate = emi.needsUpdate = true;
        const rep = [Math.max(1, Math.round(Math.max(rw, rd) / 12)), Math.max(1, Math.round(h / 24))];
        tex.repeat.set(rep[0], rep[1]); emi.repeat.set(rep[0], rep[1]);
        const m = new THREE.MeshStandardMaterial({ color: col, map: tex, emissive: '#ffffff', emissiveMap: emi, emissiveIntensity: 1, roughness: 0.85 });
        winMats.push(m);
        const roof = mat(new THREE.Color(col).multiplyScalar(0.6));
        const b = new THREE.Mesh(new THREE.BoxGeometry(rw, h, rd), [m, m, roof, roof, m, m]);
        b.position.set(x, h / 2, z); b.castShadow = true; b.receiveShadow = true; G.add(b);
        box(rw + 0.3, 0.5, rd + 0.3, roof, x, h + 0.25, z, G);
        if (r() < 0.5) box(2 + r() * 2, 2 + r() * 3, 2 + r() * 2, roof, x + (r() - 0.5) * rw * 0.5, h + 1.5, z + (r() - 0.5) * rd * 0.5, G);
        if (h > 70) { box(0.4, 10, 0.4, roof, x, h + 5, z, G); const a = glow('#ff3030', 3, 0.9); a.position.set(x, h + 10.2, z); G.add(a); antennas.push(a); }
        if (detail) {
          // corniches tous les 2 étages + auvent et vitrine éclairée côté place
          const ledge = mat(new THREE.Color(col).multiplyScalar(0.78), { roughness: 0.8 });
          for (let y = 6.4; y < h - 1; y += 6.4) box(rw + 0.35, 0.28, rd + 0.35, ledge, x, y, z, G);
          const nx = side === 2 ? -1 : side === 3 ? 1 : 0, nz = side === 0 ? 1 : side === 1 ? -1 : 0;
          const fx = x + nx * (rw / 2 + 0.02), fz = z + nz * (rd / 2 + 0.02), along2 = nx ? rd : rw;
          const shop = box(nx ? 0.06 : along2 * 0.8, 2.2, nz ? 0.06 : along2 * 0.8, shopM, fx, 1.5, fz, G); shop.castShadow = false;
          const aw = box(nx ? 1.6 : along2 * 0.85, 0.18, nz ? 1.6 : along2 * 0.85, awnM[Math.floor(r() * awnM.length)], fx + nx * 0.8, 3.0, fz + nz * 0.8, G);
          aw.rotation.set(nz * 0.28, 0, -nx * 0.28);
        }
      }
    }
  };
  ring(half + 2 + roadW + 3, 0, 14, 34, true);
  ring(half + 2 + roadW + 32, 0, 30, 90);
  ring(half + 2 + roadW + 75, 0, 50, 150);
  ring(half + 2 + roadW + 130, 0, 70, 200);
  // lampadaires
  const lampM = mat('#2a2d36');
  const bulbM = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffe1a6', emissiveIntensity: 3 });
  const lamps = [];
  for (let i = -2; i <= 2; i++) for (const [sx, sz, rot] of [[1, 0, 0], [-1, 0, 0], [0, 1, 1], [0, -1, 1]]) {
    const p = i * (half * 0.45);
    const x = sx ? sx * (half + 1.2) : p, z = sz ? sz * (half + 1.2) : p;
    const g = new THREE.Group(); g.position.set(x, 0, z); G.add(g);
    box(0.18, 6, 0.18, lampM, 0, 3, 0, g);
    box(0.8, 0.25, 0.4, lampM, 0, 6, 0, g);
    box(0.6, 0.06, 0.3, bulbM, 0, 5.86, 0, g);
    const gl = glow('#ffd79a', 1.7, 0.45); gl.position.set(0, 5.7, 0); g.add(gl);
    lamps.push({ g, gl });
  }
  // arbres
  const leaf = mat('#4e9a3f'), trunk = mat('#6b4a2e');
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3, rr = half + 4.5 + roadW + 1.2;
    const x = Math.cos(a) * rr * 0.98, z = Math.sin(a) * rr * 0.98;
    if (Math.abs(x) < half + 13 && Math.abs(z) < half + 13 && (Math.abs(x) > half + 12.5 || Math.abs(z) > half + 12.5)) {
      box(0.5, 3, 0.5, trunk, x, 1.5, z, G); box(2.6, 2.4, 2.6, leaf, x, 3.8, z, G); box(1.6, 1.2, 1.6, leaf, x, 5.5, z, G);
    }
  }
  let envTex = null;
  return {
    group: G, ground, lamps, winMats, half, antennas,
    setWindowLight(k) { winMats.forEach((m) => { m.emissiveIntensity = 0.8 * k; }); },
    // sol mouillé : reflets de la ville (capturés une fois) + rugosité basse ; k = 0 sec … 1 trempé
    setWet(k, renderer, scene2) {
      if (k > 0 && !envTex && renderer) {
        const rt = new THREE.WebGLCubeRenderTarget(256); const cc = new THREE.CubeCamera(1, 1500, rt);
        cc.position.set(0, 1.5, 0); ground.visible = plaza.visible = false; cc.update(renderer, scene2); ground.visible = plaza.visible = true;
        envTex = new THREE.PMREMGenerator(renderer).fromCubemap(rt.texture).texture;
        [ground.material, plaza.material].forEach((m) => { m.envMap = envTex; m.needsUpdate = true; });
      }
      [ground.material, plaza.material].forEach((m, i) => { m.roughness = lerp(i ? 0.8 : 0.9, i ? 0.22 : 0.15, k); m.metalness = lerp(0.05, 0.35, k); m.envMapIntensity = 1.4 * k; });
    },
  };
}

// barrière jaune et noire en cercle
export function barrierRing(scene, radius = 9, n = 18) {
  const g = new THREE.Group(); scene.add(g);
  const stripe = canvasTex(256, 32, (c, W, H) => { c.fillStyle = '#f2c21a'; c.fillRect(0, 0, W, H); c.fillStyle = '#16161a'; for (let i = -1; i < 9; i++) { c.beginPath(); c.moveTo(i * 32, H); c.lineTo(i * 32 + 16, 0); c.lineTo(i * 32 + 32, 0); c.lineTo(i * 32 + 16, H); c.fill(); } });
  const pole = mat('#ccd0d8', { metalness: 0.5, roughness: 0.4 });
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    const x0 = Math.cos(a0) * radius, z0 = Math.sin(a0) * radius, x1 = Math.cos(a1) * radius, z1 = Math.sin(a1) * radius;
    box(0.12, 1.1, 0.12, pole, x0, 0.55, z0, g);
    const len = Math.hypot(x1 - x0, z1 - z0);
    const bar = box(len, 0.22, 0.06, new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.6 }), (x0 + x1) / 2, 0.85, (z0 + z1) / 2, g);
    bar.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    const bar2 = bar.clone(); bar2.position.y = 0.35; g.add(bar2);
  }
  return g;
}

// ---------- tour d'enceinte avec générateur ----------
export function speakerTower(scene, pos, target, o = {}) {
  const g = new THREE.Group(); g.position.copy(pos); scene.add(g);
  const H = o.height || 13;
  const steel = mat('#2c2f38', { metalness: 0.6, roughness: 0.45 });
  const b = 1.6, t = 0.7;
  // 4 pieds
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  corners.forEach(([sx, sz]) => {
    const leg = box(0.16, H, 0.16, steel, 0, H / 2, 0, g);
    const dx = (b - t) * sx, dz = (b - t) * sz;
    leg.position.set(sx * (b + t) / 2, H / 2, sz * (b + t) / 2);
    leg.rotation.z = Math.atan2(dx, H); leg.rotation.x = -Math.atan2(dz, H);
  });
  // croisillons
  const levels = 7;
  for (let i = 0; i <= levels; i++) {
    const y = (i / levels) * H, w = lerp(b, t, i / levels) * 2;
    [[0, w / 2, w, 0.08], [0, -w / 2, w, 0.08], [w / 2, 0, 0.08, w], [-w / 2, 0, 0.08, w]].forEach(([x, z, ww, dd]) => box(ww, 0.08, dd, steel, x, y, z, g));
    if (i < levels) {
      const y2 = ((i + 1) / levels) * H, w2 = lerp(b, t, (i + 1) / levels) * 2;
      for (const s of [1, -1]) {
        const d = box(0.07, Math.hypot(y2 - y, (w + w2) / 2), 0.07, steel, 0, (y + y2) / 2, s * (w + w2) / 4, g);
        d.rotation.x = 0; d.rotation.z = Math.atan2((w + w2) / 2, y2 - y) * (i % 2 ? 1 : -1);
      }
    }
  }
  // plateforme + enceinte orientée vers la cible
  const head = new THREE.Group(); head.position.y = H + 0.2; g.add(head);
  box(2.6, 0.18, 2.6, steel, 0, 0, 0, head);
  const cab = new THREE.Group(); cab.position.y = 1.6; head.add(cab);
  box(2.2, 2.8, 1.5, mat('#1b1d24', { roughness: 0.6 }), 0, 0, 0, cab);
  const coneM = mat('#0c0c10', { roughness: 0.35 }), rimM = mat('#555a66', { metalness: 0.7, roughness: 0.3 });
  const cones = [[0, 0.55, 0.62], [0, -0.75, 0.42]].map(([x, y, r]) => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 8, 28), rimM); rim.position.set(x, y, 0.77); cab.add(rim);
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * 0.95, 0.3, 28, 1, true), coneM); c.rotation.x = -Math.PI / 2; c.position.set(x, y, 0.66); cab.add(c);
    const dust = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 16, 8), rimM); dust.position.set(x, y, 0.62); dust.scale.z = 0.5; cab.add(dust);
    return c;
  });
  // projecteur sous l'enceinte
  const lampM = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d6', emissiveIntensity: 4, map: canvasTex(128, 48, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#9a9a9a'; for (let i = 1; i < 4; i++) c.fillRect(i * w / 4 - 2, 0, 4, h); c.fillRect(0, h / 2 - 2, w, 4); }) });
  const lamp = box(1.4, 0.5, 0.2, lampM, 0, -0.5, 1.0, head);
  box(1.6, 0.7, 0.5, mat('#222'), 0, -0.5, 0.8, head);
  const lg = glow('#fff1cf', 5, 0.6); lg.position.set(0, -0.5, 1.4); head.add(lg);
  const cone = lightCone(Math.max(10, pos.distanceTo(target) + 6), 7.5, '#fff0cf', 0.07); cone.position.set(0, -0.5, 1.1); head.add(cone);
  const spot = new THREE.SpotLight('#ffe9c4', o.spotI ?? 450, 80, 0.42, 0.55, 1.8);
  spot.position.set(0, H - 0.3, 0); g.add(spot); g.add(spot.target);
  const tl = target.clone().sub(pos); spot.target.position.copy(tl);
  head.rotation.y = Math.atan2(tl.x, tl.z);
  // générateur
  const gen = new THREE.Group(); gen.position.set(2.6, 0, 0); g.add(gen);
  box(2.0, 1.5, 1.2, mat('#7b8494', { metalness: 0.3 }), 0, 0.75, 0, gen);
  box(2.1, 0.12, 1.3, mat('#f2c21a'), 0, 1.52, 0, gen);
  const ledOn = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#38ff6a', emissiveIntensity: 1.1 });
  const ledRed = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2b2b', emissiveIntensity: 1.4 });
  const leds = [0, 1, 2, 3].map((i) => box(0.18, 0.18, 0.04, ledOn, -0.4 + i * 0.27, 1.05, 0.61, gen));
  const tower = {
    group: g, head, cab, cones, spot, cone, lamp, lampM, lg, gen, leds, ledOn, ledRed, H,
    // k = 1 allumée/joue, 0 éteinte ; beat = 0..1 impulsion de musique ; fail = 0..1 voyants rouges
    set(k, beat = 0, fail = 0) {
      spot.intensity = (o.spotI ?? 450) * k; cone.material.uniforms.op.value = 0.07 * k; lampM.emissiveIntensity = 4 * k; lg.material.opacity = 0.6 * k;
      cones.forEach((c) => { c.position.z = 0.66 + beat * 0.07 * k; });
      leds.forEach((l, i) => { l.material = i < Math.round((1 - fail) * 4) ? ledOn : ledRed; });
    },
  };
  return tower;
}

// ---------- monstre original : "le Muet" ----------
// Géant décharné en blocs gris, tête large à la bouche cousue, deux points rouges pour yeux.
export function monster(scene, o = {}) {
  const root = new THREE.Group(); scene.add(root);
  const s = o.scale || 1;
  const skin = mat('#55565e', { roughness: 0.9 }), bone = mat('#cfcac0', { roughness: 0.85 }), dark = mat('#1b1b20', { roughness: 0.9 });
  const body = new THREE.Group(); root.add(body);
  const legs = [-1, 1].map((sx) => {
    const hip = new THREE.Group(); hip.position.set(sx * 0.9 * s, 6.2 * s, 0); body.add(hip);
    box(0.55 * s, 3.4 * s, 0.55 * s, skin, 0, -1.7 * s, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -3.4 * s; hip.add(knee);
    box(0.5 * s, 3 * s, 0.5 * s, skin, 0, -1.5 * s, 0, knee);
    box(0.8 * s, 0.3 * s, 1.3 * s, dark, 0, -3 * s, 0.3 * s, knee);
    return { hip, knee };
  });
  // torse étroit avec côtes
  const torso = new THREE.Group(); torso.position.y = 6.2 * s; body.add(torso);
  box(1.4 * s, 4.2 * s, 0.9 * s, skin, 0, 2.1 * s, 0, torso);
  for (let i = 0; i < 6; i++) box(1.6 * s, 0.16 * s, 1.0 * s, bone, 0, (1.2 + i * 0.5) * s, 0, torso);
  // lambeaux de tissu
  const rag = mat('#3c3d44', { side: THREE.DoubleSide, roughness: 1 });
  for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.35 * s, (1.4 + (i % 3) * 0.6) * s), rag); p.position.set((i - 3) * 0.22 * s, 0.2 * s, 0.47 * s * (i % 2 ? 1 : -1)); torso.add(p); }
  // bras très longs (3 segments)
  const arms = [-1, 1].map((sx) => {
    const sh = new THREE.Group(); sh.position.set(sx * 1.0 * s, 4.1 * s, 0); torso.add(sh);
    box(0.4 * s, 3.2 * s, 0.4 * s, skin, 0, -1.6 * s, 0, sh);
    const el = new THREE.Group(); el.position.y = -3.2 * s; sh.add(el);
    box(0.36 * s, 3.0 * s, 0.36 * s, skin, 0, -1.5 * s, 0, el);
    const hand = new THREE.Group(); hand.position.y = -3.0 * s; el.add(hand);
    box(0.7 * s, 0.5 * s, 0.4 * s, skin, 0, -0.2 * s, 0, hand);
    const fingers = [-0.27, -0.09, 0.09, 0.27].map((fx) => { const f = new THREE.Group(); f.position.set(fx * s, -0.4 * s, 0); hand.add(f); box(0.1 * s, 1.3 * s, 0.1 * s, dark, 0, -0.65 * s, 0, f); return f; });
    return { sh, el, hand, fingers };
  });
  // cou + tête
  const neck = new THREE.Group(); neck.position.y = 4.2 * s; torso.add(neck);
  box(0.35 * s, 1.4 * s, 0.35 * s, skin, 0, 0.7 * s, 0, neck);
  const head = new THREE.Group(); head.position.y = 1.5 * s; neck.add(head);
  const ft = canvasTex(512, 320, (g, W, H) => {
    g.fillStyle = '#d8d3c8'; g.fillRect(0, 0, W, H);
    const r = rng(42); g.strokeStyle = 'rgba(40,36,34,.55)'; g.lineWidth = 3;
    for (let i = 0; i < 14; i++) { g.beginPath(); let x = r() * W, y = r() * H; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 80; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
    g.fillStyle = 'rgba(60,50,45,.25)'; for (let i = 0; i < 30; i++) g.fillRect(r() * W, r() * H, 6 + r() * 20, 4 + r() * 10);
    // bouche cousue
    g.strokeStyle = '#141215'; g.lineWidth = 14; g.lineCap = 'round';
    g.beginPath(); g.moveTo(70, 220); g.quadraticCurveTo(256, 250, 442, 220); g.stroke();
    g.lineWidth = 8;
    for (let i = 0; i < 11; i++) { const x = 90 + i * 33; const y = 222 + Math.sin((x - 70) / 372 * Math.PI) * 15; g.beginPath(); g.moveTo(x - 7, y - 26); g.lineTo(x + 7, y + 26); g.stroke(); }
    // orbites
    g.fillStyle = '#0c0b0d'; g.beginPath(); g.ellipse(170, 110, 46, 34, 0.15, 0, 7); g.fill(); g.beginPath(); g.ellipse(342, 110, 46, 34, -0.15, 0, 7); g.fill();
  });
  const fm = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.85 });
  const hb = new THREE.Mesh(new THREE.BoxGeometry(2.6 * s, 1.6 * s, 1.3 * s), [bone, bone, bone, bone, fm, bone]);
  hb.position.y = 0.8 * s; hb.castShadow = true; head.add(hb);
  for (let i = 0; i < 5; i++) { const sp = box(0.14 * s, (0.6 + (i % 2) * 0.5) * s, 0.14 * s, dark, (i - 2) * 0.5 * s, 1.75 * s, -0.1 * s, head); sp.rotation.z = (i - 2) * 0.25; }
  const eyeM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2a1a', emissiveIntensity: 0 });
  const eyes = [-0.66, 0.66].map((x) => box(0.16 * s, 0.16 * s, 0.05 * s, eyeM, x * s, 0.93 * s, 0.66 * s, head));
  const eg = [-0.66, 0.66].map((x) => { const gl = glow('#ff3a22', 1.4 * s, 0); gl.position.set(x * s, 0.93 * s, 0.75 * s); head.add(gl); return gl; });
  root.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  const M = {
    root, body, legs, arms, neck, head, eyeM, eg, torso,
    // a = { crouch, lean, armL:[sh,el], armR:[sh,el], headTilt, headYaw, eyes:0..1, twitch:t, reach }
    // a = { crouch, lean, armL:[sh,el], armR:[sh,el], headPitch, headYaw, headTilt, eyes, curl,
    //       walk: phase (pas lourds), breathe: t (respiration lente), jerk: t (saccades violentes), twitch: t }
    pose(a = {}) {
      const c = a.crouch || 0;
      let lean = (a.lean ?? 0.15) + 0.35 * c, roll = 0, bodyY = -1.3 * c * s, hp = a.headPitch ?? 0.25, hy = a.headYaw || 0, ht = a.headTilt || 0;
      const al = [...(a.armL || [0.1, -0.15])], ar = [...(a.armR || [0.1, -0.15])];
      let hipL = -0.5 * c, hipR = -0.5 * c, kneeL = 1.0 * c, kneeR = 1.0 * c;
      if (a.walk !== undefined) {
        const w = a.walk * Math.PI * 2, st = Math.sin(w);
        hipL += st * 0.45; hipR -= st * 0.45; kneeL += Math.max(0, -Math.cos(w)) * 0.7; kneeR += Math.max(0, Math.cos(w)) * 0.7;
        al[0] -= st * 0.35; ar[0] += st * 0.35; roll += Math.sin(w) * 0.06; bodyY += -Math.abs(Math.cos(w)) * 0.25 * s; hy += Math.sin(w * 0.5) * 0.15;
      }
      if (a.breathe !== undefined) {
        const b = Math.sin(a.breathe * 1.6);
        lean += b * 0.03; bodyY += b * 0.08 * s; hp += Math.sin(a.breathe * 0.7) * 0.06; ht += Math.sin(a.breathe * 0.45) * 0.12;
        al[0] += b * 0.04; ar[0] -= b * 0.03;
      }
      if (a.jerk !== undefined) {
        const j = a.jerk, k = Math.floor(j * 7), r = (n) => Math.sin(k * 12.9898 + n * 78.233) * 43758.5453 % 1;
        hy += r(1) * 0.6; ht += r(2) * 0.5; hp += r(3) * 0.3; lean += Math.abs(r(4)) * 0.25; roll += r(5) * 0.12;
        al[0] += r(6) * 0.7; ar[0] += r(7) * 0.7; al[1] += r(8) * 0.5; ar[1] += r(9) * 0.5; hipL += r(10) * 0.3; kneeR += Math.abs(r(11)) * 0.5;
      }
      legs[0].hip.rotation.x = hipL; legs[1].hip.rotation.x = hipR; legs[0].knee.rotation.x = kneeL; legs[1].knee.rotation.x = kneeR;
      body.position.y = bodyY; body.rotation.z = roll;
      torso.rotation.x = lean;
      arms[0].sh.rotation.set(al[0], 0, -0.12); arms[0].el.rotation.x = al[1];
      arms[1].sh.rotation.set(ar[0], 0, 0.12); arms[1].el.rotation.x = ar[1];
      const tw = a.twitch ? Math.sin(a.twitch * 47) * Math.sin(a.twitch * 13) * 0.08 : 0;
      neck.rotation.set(hp + tw, hy, ht + tw * 1.5);
      const curl = a.curl ?? 0.3, ct = a.breathe !== undefined ? Math.sin(a.breathe * 2.3) * 0.15 : 0;
      arms.forEach((ar2, side) => ar2.fingers.forEach((f, i) => { f.rotation.x = curl + i * 0.05 + ct * Math.sin(i + side); }));
      const e = a.eyes || 0; eyeM.emissiveIntensity = 4 * e; eg.forEach((g2) => { g2.material.opacity = 0.9 * e; });
    },
  };
  M.pose({});
  return M;
}

// ---------- voiture de police ----------
export function policeCar(scene, pos, yaw = 0) {
  const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = yaw; scene.add(g);
  const white = mat('#e9edf3', { roughness: 0.4, metalness: 0.2 }), black = mat('#16181e', { roughness: 0.4 });
  box(2.0, 0.7, 4.4, black, 0, 0.65, 0, g);
  box(2.02, 0.5, 1.8, white, 0, 0.75, 0, g);
  box(1.8, 0.65, 2.2, mat('#2a3550', { roughness: 0.15, metalness: 0.4 }), 0, 1.3, -0.2, g);
  box(1.84, 0.1, 2.0, white, 0, 1.65, -0.2, g);
  const red = new THREE.MeshStandardMaterial({ color: '#300', emissive: '#ff1e2d', emissiveIntensity: 0 });
  const blue = new THREE.MeshStandardMaterial({ color: '#003', emissive: '#2a5bff', emissiveIntensity: 0 });
  box(0.7, 0.18, 0.35, red, -0.4, 1.8, -0.2, g); box(0.7, 0.18, 0.35, blue, 0.4, 1.8, -0.2, g);
  const gr = glow('#ff2a3a', 3.2, 0), gb = glow('#3a66ff', 3.2, 0); gr.position.set(-0.4, 1.85, -0.2); gb.position.set(0.4, 1.85, -0.2); g.add(gr); g.add(gb);
  const head = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff6dd', emissiveIntensity: 3 });
  box(0.4, 0.18, 0.05, head, -0.65, 0.75, 2.21, g); box(0.4, 0.18, 0.05, head, 0.65, 0.75, 2.21, g);
  const hg = [-0.65, 0.65].map((x) => { const s = glow('#fff2d0', 1.6, 0.6); s.position.set(x, 0.75, 2.4); g.add(s); return s; });
  const tail = new THREE.MeshStandardMaterial({ color: '#400', emissive: '#ff2020', emissiveIntensity: 1.5 });
  box(0.4, 0.15, 0.05, tail, -0.7, 0.8, -2.21, g); box(0.4, 0.15, 0.05, tail, 0.7, 0.8, -2.21, g);
  [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16), black); w.rotation.z = Math.PI / 2; w.position.set(x * 0.95, 0.38, z); g.add(w); });
  const pl = new THREE.PointLight('#ff2a3a', 0, 14, 2);
  pl.position.set(0, 2.4, 0); g.add(pl);
  return {
    group: g,
    // sirène : on 0..1, t pour l'alternance ; head 0..1 phares
    set(on, t, headK = 1) {
      const ph = Math.floor(t * 6) % 2;
      red.emissiveIntensity = on * (ph ? 6 : 0.3); blue.emissiveIntensity = on * (ph ? 0.3 : 6);
      gr.material.opacity = on * (ph ? 0.95 : 0.1); gb.material.opacity = on * (ph ? 0.1 : 0.95);
      pl.color.set(ph ? '#ff2a3a' : '#3a66ff'); pl.intensity = on * 40;
      head.emissiveIntensity = 3 * headK; hg.forEach((s) => { s.material.opacity = 0.6 * headK; });
    },
  };
}

// ---------- pluie ----------
export function rain(scene, n = 2500) {
  const geo = new THREE.BoxGeometry(0.016, 0.95, 0.016);
  const m = new THREE.MeshBasicMaterial({ color: '#dfe7ff', transparent: true, opacity: 0, depthWrite: false, fog: false });
  const im = new THREE.InstancedMesh(geo, m, n); im.frustumCulled = false; scene.add(im);
  const r = rng(99); const seeds = Array.from({ length: n }, () => [r(), r(), r()]);
  const dummy = new THREE.Object3D();
  return {
    mesh: im,
    update(t, cam, k) {
      m.opacity = 0.6 * k; im.visible = k > 0.01;
      if (!im.visible) return;
      const c = cam.position, R = 16, H = 20;
      for (let i = 0; i < n; i++) {
        const [a, b, h] = seeds[i];
        const y = ((h * H - t * 22) % H + H) % H;
        dummy.position.set(c.x + (a - 0.5) * 2 * R, c.y - H / 2 + y, c.z + (b - 0.5) * 2 * R);
        dummy.rotation.set(0.12, 0, 0.05); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
    },
  };
}

// ---------- explosion / étincelles ----------
export function burst(scene, pos, o = {}) {
  const n = o.n || 160;
  const geo = new THREE.BufferGeometry(); const P = new Float32Array(n * 3); geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const pm = new THREE.PointsMaterial({ color: o.color || '#ffc35a', size: o.size || 0.25, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const pts = new THREE.Points(geo, pm); pts.frustumCulled = false; scene.add(pts);
  const r = rng(o.seed || 5); const vel = Array.from({ length: n }, () => { const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), sp = 4 + r() * 10; return [Math.sin(ph) * Math.cos(th) * sp, Math.abs(Math.cos(ph)) * sp * 0.9 + 2, Math.sin(ph) * Math.sin(th) * sp]; });
  const flash = glow('#ffe0a0', 1, 0); flash.position.copy(pos); if (o.flash !== false) scene.add(flash);
  const light = new THREE.PointLight('#ffb35a', 0, 60, 1.6); light.position.copy(pos); if (o.flash !== false) scene.add(light);
  const smokeM = mat('#3b3d44', { transparent: true, opacity: 0, roughness: 1 });
  const smoke = Array.from({ length: o.smoke === false ? 0 : 10 }, (_, i) => { const b = box(1, 1, 1, smokeM, pos.x, pos.y, pos.z, scene); b.castShadow = false; b.userData.v = [(r() - 0.5) * 2, 1 + r() * 2, (r() - 0.5) * 2]; return b; });
  return {
    update(t, t0) {
      const d = t - t0;
      const on = d >= 0 && d < 4;
      pts.visible = on;
      if (!on) { flash.material.opacity = 0; light.intensity = 0; smokeM.opacity = 0; return; }
      for (let i = 0; i < n; i++) { const v = vel[i]; P[i * 3] = pos.x + v[0] * d; P[i * 3 + 1] = pos.y + v[1] * d - 4.9 * d * d; P[i * 3 + 2] = pos.z + v[2] * d; }
      geo.attributes.position.needsUpdate = true;
      pm.opacity = clamp(1.2 - d / 2);
      const f = Math.exp(-d * 4); flash.material.opacity = f; flash.scale.setScalar(4 + 14 * (1 - Math.exp(-d * 8)));
      light.intensity = 900 * f;
      smokeM.opacity = 0.85 * clamp(1 - d / 4);
      smoke.forEach((b) => { const [vx, vy, vz] = b.userData.v; b.position.set(pos.x + vx * d, pos.y + vy * d, pos.z + vz * d); b.scale.setScalar(0.6 + d * 1.3); b.rotation.set(d * vx, d * vz, 0); });
    },
  };
}

// ---------- caméra ----------
// position monde d'un objet (+ décalage local optionnel)
export function wpos(obj, off) { const v = off ? new THREE.Vector3(...off) : new THREE.Vector3(); return obj.localToWorld(v); }
// caméra qui suit un objet animé : pos/look relatifs à sa position monde
export function follow(obj, offPos, offLook = [0, 0, 0], fov = 40, amt = 0.08) {
  return (u) => { const o = wpos(obj); const k = 1 - amt * smooth(u); return { pos: [o.x + offPos[0] * k, o.y + offPos[1] * k, o.z + offPos[2] * k], look: [o.x + offLook[0], o.y + offLook[1], o.z + offLook[2]], fov }; };
}
// Un "plan" renvoie {pos, look, fov, roll} pour u ∈ [0,1] (avancement dans le plan).
export function glide(p0, p1, l0, l1 = l0, f0 = 50, f1 = f0, ease = smooth) {
  return (u) => { const e = ease(u); return { pos: lerpV(p0, p1, e), look: lerpV(l0, l1, e), fov: lerp(f0, f1, e) }; };
}
// Plan fixe qui pousse lentement (aucun plan n'est jamais figé)
export function push(pos, look, fov = 45, amount = 0.06) {
  return (u) => { const k = amount * u; return { pos: lerpV(pos, look, k), look, fov }; };
}
export function orbit(center, radius, a0, a1, h, fov = 45, lookY = center[1]) {
  return (u) => { const a = lerp(a0, a1, smooth(u)); return { pos: [center[0] + Math.cos(a) * radius, h, center[2] + Math.sin(a) * radius], look: [center[0], lookY, center[2]], fov }; };
}
// tremblement d'impact : alterne de signe chaque image, décroît en 8 images
export function kick(t, t0, amp = 0.25, fps = 30) {
  const d = (t - t0) * fps; if (d < 0 || d > 10) return 0;
  return amp * Math.exp(-d / 3) * (Math.floor(d) % 2 ? -1 : 1);
}

// ---------- sous-titres mot par mot ----------
export function drawCaption(ctx, W, H, word, age, o = {}) {
  if (!word) return;
  const big = o.big;
  const size = Math.round(W * (big ? 0.105 : 0.072));
  const pop = 1 + 0.18 * Math.exp(-age * 18);
  ctx.save();
  ctx.translate(W / 2, H * (o.y ?? 0.72)); ctx.scale(pop, pop);
  ctx.font = `${size}px "Lilita One", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = size * 0.12; ctx.shadowOffsetY = size * 0.06;
  ctx.lineWidth = size * 0.2; ctx.strokeStyle = '#0d0d10'; ctx.strokeText(word, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = o.color || (big ? '#ffe81f' : '#f4f04a');
  ctx.fillText(word, 0, 0);
  ctx.restore();
}

// ---------- action ----------
// Position le long d'un chemin de points [[t, x, z], …] (interpolation douce entre points) ; renvoie {x, z, dir}
export function pathAt(pts, t) {
  if (t <= pts[0][0]) return { x: pts[0][1], z: pts[0][2], dir: Math.atan2(pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]), moving: false };
  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, x0, z0] = pts[i], [t1, x1, z1] = pts[i + 1];
    if (t <= t1) { const u = (t - t0) / Math.max(1e-6, t1 - t0); return { x: lerp(x0, x1, u), z: lerp(z0, z1, u), dir: Math.atan2(x1 - x0, z1 - z0), moving: true, seg: i, u }; }
  }
  const n = pts.length - 1; return { x: pts[n][1], z: pts[n][2], dir: Math.atan2(pts[n][1] - pts[n - 1][1], pts[n][2] - pts[n - 1][2]), moving: false };
}

// Camion de glaces avec gros haut-parleur et cornet géant sur le toit.
export function iceCreamTruck(scene, pos, yaw = 0) {
  const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = yaw; scene.add(g);
  const pink = mat('#f4a6c8', { roughness: 0.5 }), white = mat('#f6f3ee', { roughness: 0.5 }), dark = mat('#1a1c22', { roughness: 0.4 });
  const sideTex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#f6f3ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#f4a6c8'; c.fillRect(0, h * 0.62, w, h * 0.38);
    for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#7fd3f0' : '#f4a6c8'; c.beginPath(); c.arc(i * 24, h * 0.62, 12, 0, Math.PI); c.fill(); }
    c.fillStyle = '#3b2a5a'; c.font = 'bold 30px "Lilita One", sans-serif'; c.textAlign = 'center'; c.fillText('ICE CREAM', w / 2, 40);
  });
  const sideM = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.5 });
  const body = rbox(2.3, 2.3, 3.6, white, 0, 1.6, -0.6, g, 0.12); body.material = [sideM, sideM, white, white, white, white];
  rbox(2.25, 1.5, 1.8, pink, 0, 1.2, 2.0, g, 0.15);
  const glassM = new THREE.MeshStandardMaterial({ color: '#2a3550', roughness: 0.1, metalness: 0.5 });
  const wind = box(2.0, 0.8, 0.06, glassM, 0, 1.75, 2.9, g); wind.rotation.x = -0.25;
  const sideWin = box(0.06, 0.6, 0.9, glassM, 1.14, 1.65, 1.9, g); // vitre conducteur (côté droit) : on la casse
  box(0.06, 0.6, 0.9, glassM, -1.14, 1.65, 1.9, g);
  box(0.06, 0.9, 1.6, dark, 1.16, 1.9, -0.6, g); // trappe de service
  [[-1, 2.0], [1, 2.0], [-1, -1.5], [1, -1.5]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 18), dark); w.rotation.z = Math.PI / 2; w.position.set(x * 1.05, 0.42, z); g.add(w); });
  const headM = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff6dd', emissiveIntensity: 0 });
  box(0.4, 0.2, 0.05, headM, -0.75, 1.0, 2.92, g); box(0.4, 0.2, 0.05, headM, 0.75, 1.0, 2.92, g);
  const hg = [-0.75, 0.75].map((x) => { const s = glow('#fff2d0', 2.2, 0); s.position.set(x, 1.0, 3.1); g.add(s); return s; });
  // cornet géant + haut-parleur pavillon
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 8), mat('#d9a35a', { roughness: 0.8 })); cone.rotation.x = Math.PI; cone.position.set(0, 3.45, -1.2); g.add(cone);
  [['#f7c6d9', 0], ['#bfe7f5', 0.45]].forEach(([c, y]) => { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mat(c, { roughness: 0.6 })); sp.position.set(0, 4.2 + y, -1.2); g.add(sp); });
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 20, 1, true), mat('#d8dbe2', { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide }));
  horn.rotation.x = -Math.PI / 2; horn.position.set(0, 3.2, 0.6); g.add(horn);
  const notes = [0, 1, 2].map((i) => { const s = glow('#ffe36b', 0.5, 0); g.add(s); return s; });
  const winWorld = new THREE.Vector3(1.2, 1.65, 1.9).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(pos);
  const glass = burst(scene, winWorld, { n: 90, size: 0.06, seed: 77, color: '#cfe8ff', smoke: false, flash: false });
  return {
    group: g, sideWin, horn,
    // engine 0/1 (phares), song 0/1 (pavillon qui pulse + notes), beat 0..1, t
    set(engine, song, beat, t) {
      headM.emissiveIntensity = 3 * engine; hg.forEach((s) => { s.material.opacity = 0.7 * engine; });
      horn.scale.setScalar(1 + 0.12 * beat * song);
      notes.forEach((n, i) => { const k = ((t * 0.8 + i / 3) % 1); n.material.opacity = song * (1 - k) * 0.9; n.position.set(Math.sin(t * 2 + i * 2) * 0.6, 3.3 + k * 2.2, 1.3 + k * 0.4); });
      g.position.y = engine ? Math.sin(t * 40) * 0.008 : 0; // moteur qui tremble
    },
    smash(t, t0) { sideWin.visible = t < t0; glass.update(t, t0); },
  };
}

// Éclair : segments brisés du ciel jusqu'à un point, visible quelques images
export function lightning(scene, to, seed = 3) {
  const r = rng(seed); const pts = []; let p = to.clone().add(new THREE.Vector3((r() - 0.5) * 10, 90, (r() - 0.5) * 10));
  for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push(new THREE.Vector3(lerp(p.x, to.x, u) + (i && i < 14 ? (r() - 0.5) * 5 : 0), lerp(p.y, to.y, u), lerp(p.z, to.z, u) + (i && i < 14 ? (r() - 0.5) * 5 : 0))); }
  const g = new THREE.Group(); scene.add(g);
  const m = new THREE.MeshBasicMaterial({ color: '#eaf2ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const len = a.distanceTo(b); const seg = new THREE.Mesh(new THREE.BoxGeometry(0.35, len, 0.35), m); seg.position.copy(a).add(b).multiplyScalar(0.5); seg.lookAt(b); seg.rotateX(Math.PI / 2); g.add(seg); }
  const gl = glow('#cfe0ff', 14, 0); gl.position.copy(to); scene.add(gl);
  const pl = new THREE.PointLight('#cfe0ff', 0, 120, 1.5); pl.position.copy(to).add(new THREE.Vector3(0, 6, 0)); scene.add(pl);
  return { update(t, t0) { const d = t - t0; const on = d >= 0 && d < 0.35 ? (d < 0.1 || (d > 0.18 && d < 0.26) ? 1 : 0.25) : 0; m.opacity = on; gl.material.opacity = on * 0.9; pl.intensity = on * 3000; } };
}
