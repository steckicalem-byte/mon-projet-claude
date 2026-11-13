// Exécuté dans Chromium. Charge l'épisode (story.js + words.json) et expose window.renderFrame(f).
import * as THREE from 'three';
import * as kit from './kit.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const q = new URLSearchParams(location.search);
const W = +q.get('w') || 1080, H = +q.get('h') || 1920, FPS = +q.get('fps') || 30;

try {
  await document.fonts.load('80px "Lilita One"');

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out);
  const ctx = out.getContext('2d');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 2500);
  // lumière d'appoint attachée à la caméra : les visages restent lisibles quel que soit l'angle
  const fill = new THREE.DirectionalLight('#dfe6ff', 0.9); fill.position.set(0.6, 0.6, 0); fill.target.position.set(0, 0, -1);
  camera.add(fill); camera.add(fill.target); scene.add(camera);

  // post-traitement : halo (bloom) sur les lumières, puis étalonnage + vignettage
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.45, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, vig: { value: 0.32 }, sat: { value: 1.12 }, lift: { value: new THREE.Vector3(0.012, 0.016, 0.03) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, sat; uniform vec3 lift; varying vec2 vUv;
      void main(){ vec3 c=texture2D(tDiffuse,vUv).rgb; float l=dot(c,vec3(.299,.587,.114)); c=mix(vec3(l),c,sat);
        c=c+lift*(1.-c); vec2 d=vUv-.5; d.x*=0.75; c*=1.-vig*smoothstep(.25,.85,length(d)*1.4); gl_FragColor=vec4(c,1.); }`,
  });
  composer.addPass(grade);

  const words = await (await fetch('/ep/words.json')).json();
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9':]/g, '');
  // at('exploded') = début du 1er mot "exploded" ; at('the', 3) = 3e occurrence ; at(12) = mot n°12
  const at = (w, n = 1, end = false) => {
    if (typeof w === 'number') return end ? words[w].e : words[w].s;
    let k = 0;
    for (const x of words) if (norm(x.w) === norm(w) && ++k === n) return end ? x.e : x.s;
    throw new Error(`mot introuvable dans words.json : "${w}" #${n}`);
  };
  const story = (await import('/ep/story.js')).default;
  const S = await story({ kit, THREE, scene, camera, renderer, words, at, W, H, FPS });
  const shots = S.shots.slice().sort((a, b) => a.t - b.t);
  const duration = S.duration || (words.at(-1).e + 1.5);

  const big = new Set((S.bigWords || []).map(norm));
  const hide = S.hideCaptions || []; // [[t0,t1], …]

  function shotAt(t) {
    let i = 0; while (i + 1 < shots.length && shots[i + 1].t <= t) i++;
    const s = shots[i], end = i + 1 < shots.length ? shots[i + 1].t : duration;
    return { s, i, u: kit.clamp((t - s.t) / Math.max(0.001, end - s.t)) };
  }

  window.renderFrame = (f, quality = 0.92) => {
    const t = f / FPS;
    const { s, i, u } = shotAt(t);
    // 1) le monde d'abord (les caméras peuvent viser des objets animés), 2) la caméra, 3) ce qui dépend de la caméra
    S.update(t, { shot: s, shotIndex: i, u, camera });
    scene.updateMatrixWorld(true);
    const c = s.cam(u, t);
    camera.position.set(...c.pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(...c.look);
    if (c.roll) camera.rotateZ(c.roll);
    const k = S.kick ? S.kick(t) : 0;
    if (k) { camera.rotateZ(k * 0.08); camera.rotateX(k * 0.04); }
    camera.fov = c.fov || 45; camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    if (S.late) S.late(t, camera);
    if (S.post) S.post(t, { bloom, grade });
    composer.render();
    ctx.drawImage(renderer.domElement, 0, 0);
    if (S.overlay) S.overlay(ctx, t, W, H);
    // sous-titre : le dernier mot commencé, tenu jusqu'au mot suivant (max 0,7 s après sa fin)
    if (!hide.some(([a, b]) => t >= a && t < b)) {
      let wi = -1; for (let j = 0; j < words.length && words[j].s <= t; j++) wi = j;
      if (wi >= 0) {
        const w = words[wi], next = words[wi + 1];
        const until = Math.min(next ? next.s : Infinity, w.e + 0.7);
        if (t < until) kit.drawCaption(ctx, W, H, w.w.replace(/^["“]|["”,.!?…]+$/g, ''), t - w.s, { big: big.has(norm(w.w)) });
      }
    }
    return out.toDataURL('image/jpeg', quality);
  };
  // repères pour la bande-son : temps nommés + niveau de musique échantillonné à 100 Hz
  const lv = []; if (S.musicLevel) for (let x = 0; x < duration; x += 0.01) lv.push(+S.musicLevel(x).toFixed(3));
  window.cues = { ...(S.cues || {}), musicLevel: lv, musicRate: 100, duration, shotStarts: shots.map((s) => +s.t.toFixed(3)) };
  window.meta = { duration, frames: Math.ceil(duration * FPS), shots: shots.map((s) => s.t), W, H, FPS };
  window.ready = true;
} catch (e) {
  window.loadError = String(e && e.stack || e);
}
