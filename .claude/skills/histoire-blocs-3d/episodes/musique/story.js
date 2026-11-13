// Épisode « La musique ne doit jamais s'arrêter » — plan de tournage.
// Tous les temps viennent de words.json via at('mot', occurrence). Changer la voix = re-caler automatiquement.
export default async function story({ kit, THREE, scene, camera, renderer, at }) {
  const { V, ramp, smooth, clamp, lerp, glide, push, orbit, kick, pose, follow } = kit;

  // ---------- repères du récit ----------
  const T = {
    flashback: at('three', 1), appeared: at('appeared'), disappeared: at('disappeared'),
    morning: at('next'), froze: at('froze'), present: at('so'), towers: at('towers', 1), generator: at('generator'),
    guards: at('twelve'), never: at('never', 1), moved: at('moved'), until: at('until', 1),
    dad: at('dad', 1), normal: at('everything'), clock: at('until', 2), explode: at('exploded'),
    relax: at('relax'), five: at('five'), radio: at('crackled'), failing: at('failing'), oneByOne: at('one', 4),
    silentTowers: at('silent', 1), scream: at('screamed'), police: at('police'), windows: at('windows', 1),
    safe: at('thought'), thunder: at('thunder'), rain: at('rain', 1), closed: at('closed'), sirensDied: at('died', 1),
    shorting: at('shorting'), mine: at('mine'), battery: at('battery'), died: at('died', 2, true), quiet: at('second', 2),
    creaking: at('creaking'), turned: at('turned'), notMiddle: at('wasn\'t'), behind: at('standing'),
    hand: at('raised'), whisper: at('whispered'), end: at('stop', 1, true),
  };
  const duration = T.end + 1.6;
  const isPresent = (t) => t < T.flashback || t >= T.present;
  const isDay = (t) => t >= T.morning && t < T.present;

  // ---------- décor ----------
  const sky = kit.nightSky(scene, {});
  const town = kit.city(scene, { seed: 4, plaza: 22, wet: false });
  const barrier = kit.barrierRing(scene, 9, 20);
  const M = kit.monster(scene, {});
  const center = V(0, 0, 0);
  const TOWER_R = 17;
  const towerAngles = [60, 120, 180, 240, 300, 0].map((d) => (d * Math.PI) / 180);
  const towers = towerAngles.map((a) => kit.speakerTower(scene, V(Math.cos(a) * TOWER_R, 0, Math.sin(a) * TOWER_R), V(0, 6, 0)));
  const towerHead = (i) => towers[i].group.position.clone().add(V(0, towers[i].H + 1.8, 0));
  const boom = kit.burst(scene, towerHead(0), { n: 220, size: 0.35, seed: 11 });

  // personnages
  const dad = kit.makeChar({ shirt: '#22305a', pants: '#1a2138', hat: 'police', hatColor: '#1c2748', badge: true, walkie: true, belt: true, skin: '#d9a477', expr: 'smirk', shoes: '#111', uniform: true });
  const kid = kit.makeChar({ shirt: '#3bb36a', hoodie: '#eef5ef', pants: '#2a3a66', hair: '#4a2c1a', hairStyle: 'fluffy', skin: '#f0c49b', expr: 'neutral', shoes: '#f2f2f2', hood: true });
  const DAD = V(2.4, 0, 13.4), KID = V(4.0, 0, 13.9);
  dad.root.position.copy(DAD); kid.root.position.copy(KID); scene.add(dad.root, kid.root);
  const dadBox = kit.boombox('#30343f'); dadBox.rotation.x = -Math.PI / 2; dadBox.position.set(0, -0.02, 0.12);
  dad.arms[1].userData.hand.add(dadBox);
  const kidBox = kit.boombox('#c23b3b'); kidBox.rotation.x = -Math.PI / 2; kidBox.position.set(0, -0.02, 0.12);
  kid.arms[1].userData.hand.add(kidBox);
  // inserts tenus en main : placés dans le monde devant papa, face caméra (plus fiable qu'attachés à la main)
  const DAD_YAW = Math.PI + 0.25;
  const FWD = V(Math.sin(DAD_YAW), 0, Math.cos(DAD_YAW)), RIGHT = V(Math.cos(DAD_YAW), 0, -Math.sin(DAD_YAW));
  const PHONE = DAD.clone().addScaledVector(FWD, 0.5).addScaledVector(RIGHT, 0.12).add(V(0, 1.28, 0));
  const RADIO = DAD.clone().addScaledVector(FWD, 0.38).addScaledVector(RIGHT, 0.1).add(V(0, 1.52, 0));
  const phone = kit.screenProp([{ text: '3:07', size: 104, y: 0.42 }, { text: 'AM', size: 46, y: 0.68 }], { w: 0.09, h: 0.16 });
  phone.position.copy(PHONE); phone.rotation.set(0, DAD_YAW, 0); phone.rotateX(-0.35); phone.visible = false; scene.add(phone);
  const radio = kit.walkie(); radio.scale.setScalar(1.3); radio.position.copy(RADIO); radio.rotation.set(0, DAD_YAW, 0); radio.visible = false; scene.add(radio);
  const radioLed = radio.children[2].material;
  const KID_YAW = Math.PI - 0.15, KFWD = V(Math.sin(KID_YAW), 0, Math.cos(KID_YAW));
  const BATT = KID.clone().addScaledVector(KFWD, 0.55).add(V(0, 1.35, 0));
  const battBox = kit.boombox('#c23b3b'); battBox.scale.setScalar(1.6); battBox.position.copy(BATT); battBox.rotation.y = KID_YAW; battBox.visible = false; scene.add(battBox);
  const batt1 = kit.screenProp([{ text: '1%', size: 120, y: 0.55, color: '#ff4b4b' }], { w: 0.2, h: 0.12, bg1: '#111', bg2: '#222' });
  const batt0 = kit.screenProp([{ text: '0%', size: 120, y: 0.55, color: '#661b1b' }], { w: 0.2, h: 0.12, bg1: '#050505', bg2: '#0a0a0a' });
  [batt1, batt0].forEach((b) => { b.position.copy(BATT).add(V(0, 0.32, 0)).addScaledVector(KFWD, 0.02); b.rotation.y = KID_YAW; b.visible = false; scene.add(b); });
  const insertCam = (P, dist, side = 0.04, up = 0.03, fov = 34) => cam(P.clone().addScaledVector(FWD, dist).addScaledVector(RIGHT, side).add(V(0, up, 0)).toArray(), P.toArray(), fov, 0.12);
  const GEN = (i) => towers[i].group.position.clone().add(V(2.6, 0.9, 0));
  const genCam = (i) => { const g = GEN(i); return cam(g.clone().add(V(1.6, 1.4, 5.2)).toArray(), g.clone().add(V(0, 1.0, 0)).toArray(), 46, 0.18); };

  // gardes (12) en cercle autour de la barrière
  const SHIRTS = ['#24304f', '#2b3a5c', '#1f2a44'];
  const guards = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.26;
    const p = V(Math.cos(a) * 12, 0, Math.sin(a) * 12);
    if (p.distanceTo(DAD) < 3 || p.distanceTo(KID) < 3) continue;
    const g = kit.makeChar({ shirt: SHIRTS[i % 3], pants: '#171c2c', hat: 'police', badge: true, belt: true, skin: ['#f0c49b', '#c98d5e', '#8d5a3b'][i % 3], expr: i % 2 ? 'neutral' : 'angry', uniform: true, walkie: i % 3 === 0 });
    g.root.position.copy(p); g.root.rotation.y = Math.atan2(-p.x, -p.z);
    const b = kit.boombox(['#2c2f3a', '#3a2c2c', '#2c3a33'][i % 3]); b.rotation.x = -Math.PI / 2; b.position.set(0, -0.02, 0.12);
    g.arms[1].userData.hand.add(b);
    scene.add(g.root); guards.push({ ch: g, box: b, a, sparks: null, i });
  }
  // étincelles des enceintes des gardes sous la pluie
  const shortGuards = [0, 3, 6, 8].filter((i) => guards[i]).map((i, k) => {
    const g = guards[i]; const wp = g.ch.root.position.clone().add(V(0, 1.2, 0)).add(V(-Math.sin(-g.ch.root.rotation.y), 0, Math.cos(g.ch.root.rotation.y)).multiplyScalar(0.35));
    return { g, sp: kit.burst(scene, wp, { n: 70, size: 0.1, seed: 30 + k, color: '#bfe6ff', smoke: false }), t0: T.shorting + k * 0.55 };
  });

  // civils (flashback)
  const civ = [];
  const CIV = ['#d94c4c', '#8b5cd6', '#3a9ad9', '#e08a2e', '#52b36a', '#d95da0'];
  for (let i = 0; i < 6; i++) {
    const c = kit.makeChar({ shirt: CIV[i], pants: ['#2b3550', '#5a4632', '#333'][i % 3], hair: ['#2a1a10', '#d9b35a', '#111'][i % 3], skin: ['#f0c49b', '#c98d5e', '#8d5a3b'][i % 3], expr: 'scared' });
    scene.add(c.root); civ.push(c);
  }
  const radioKid = kit.makeChar({ shirt: '#f2a33a', pants: '#2a3a66', hair: '#2a1a10', skin: '#c98d5e', expr: 'smile', shoes: '#fff' });
  const rkBox = kit.boombox('#2a6fd6'); rkBox.position.set(0, -0.05, 0); radioKid.arms[1].userData.hand.add(rkBox);
  scene.add(radioKid.root);
  // sac abandonné (les 9 disparus)
  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.3), new THREE.MeshStandardMaterial({ color: '#c73a3a', roughness: 0.7 }));
  bag.position.set(-1.5, 0.2, 26); bag.rotation.y = 0.5; bag.castShadow = true; scene.add(bag);
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.32), new THREE.MeshStandardMaterial({ color: '#eee' })); shoe.position.set(0.4, 0.06, 27); shoe.rotation.y = -0.4; scene.add(shoe);

  // voitures de police (arrivent par les routes)
  const carPlan = [
    { from: V(-45, 0, 29), to: V(-9, 0, 29), yaw: Math.PI / 2 },
    { from: V(45, 0, 29), to: V(10, 0, 29), yaw: -Math.PI / 2 },
    { from: V(29, 0, -45), to: V(29, 0, -6), yaw: 0 },
    { from: V(-29, 0, 45), to: V(-29, 0, 8), yaw: Math.PI },
  ];
  const cars = carPlan.map((c) => ({ ...c, car: kit.policeCar(scene, c.from, c.yaw) }));

  // téléphones aux fenêtres
  const phones = [];
  const pr = kit.rng(77);
  for (let i = 0; i < 46; i++) {
    const side = i % 4, along = (pr() - 0.5) * 60, h = 3 + pr() * 22, d = 36.7;
    const p = side === 0 ? V(along, h, -d) : side === 1 ? V(along, h, d) : side === 2 ? V(d, h, along) : V(-d, h, along);
    const g = kit.glow(pr() < 0.5 ? '#d8ecff' : '#fff1c2', 2.4, 0); g.position.copy(p); scene.add(g);
    phones.push({ g, ph: pr() * 6, on: pr() * 1.5 });
  }

  const rain = kit.rain(scene, 2600);
  const lightning = new THREE.DirectionalLight('#dfe8ff', 0); lightning.position.set(30, 80, -40); scene.add(lightning);

  // ---------- musique (diégétique) : partagée avec la bande-son via S.cues ----------
  const BPM = 112;
  const beat = (t) => Math.exp(-((t * BPM) / 60 % 1) * 7);
  const towerOn = (i, t) => {
    if (!isPresent(t)) return 0;
    if (i === 0) return t < T.explode ? 1 : 0;
    const off = lerp(T.oneByOne, T.silentTowers + 0.3, (i - 1) / 4);
    return t < off ? 1 : 0;
  };
  const guardsOn = (t) => (isPresent(t) ? (t < T.shorting ? 1 : clamp(1 - (t - T.shorting) / 2.6)) : 0);
  const mineOn = (t) => (isPresent(t) ? (t < T.died - 0.1 ? 1 : 0) : 0);
  const dadOn = (t) => (t >= T.turned + 0.5 ? 1 : isPresent(t) && t < T.shorting ? 1 : 0);
  const musicLevel = (t) => {
    if (!isPresent(t)) return t >= T.morning && t < T.present && t >= T.morning + 0.8 ? 0.35 : 0; // radio du gamin
    let k = 0; for (let i = 0; i < 6; i++) k += towerOn(i, t) / 6;
    k = Math.max(k, 0.55 * guardsOn(t), 0.3 * mineOn(t), 0.45 * dadOn(t));
    return k;
  };

  // ---------- état du monde ----------
  // enveloppes d'animation : sursaut (montée rapide, retombée), parole, hochement au rythme
  const flinchAt = (t, t0, dur = 1.1) => { const d = t - t0; return d < 0 || d > dur ? 0 : d < 0.12 ? d / 0.12 : 1 - smooth((d - 0.12) / (dur - 0.12)); };
  const flinch = (t, k = 1) => Math.max(flinchAt(t, T.explode), flinchAt(t, T.thunder, 0.9), flinchAt(t, T.scream, 0.6) * 0.4) * k;
  const win = (t, a, b, f = 0.15) => clamp(Math.min((t - a) / f, (b - t) / f));
  const dadTalk = (t) => Math.max(win(t, T.relax, T.radio - 0.4), win(t, T.scream, T.police - 0.3), win(t, T.whisper, T.end));
  const groove = (t) => (t < T.explode ? beat(t) : 0);

  function update(t) {
    const present = isPresent(t), day = isDay(t) ? 1 : 0;
    // jour / nuit
    sky.uniforms.top.value.set(day ? '#5b9be8' : '#0e1530'); sky.uniforms.hor.value.set(day ? '#cfe3f7' : '#34406b');
    scene.fog.color.set(day ? '#c4d8ee' : '#2a3458');
    sky.hemi.color.set(day ? '#d8e8ff' : '#9db3ff'); sky.hemi.groundColor.set(day ? '#6d6a5e' : '#30364f');
    sky.hemi.intensity = day ? 2.2 : 1.35; sky.moon.color.set(day ? '#fff2dc' : '#b7c6ff'); sky.moon.intensity = day ? 3.2 : 1.2;
    const rainK = ramp(t, T.rain - 0.3, T.rain + 1.2);
    const dimRain = 1 - 0.35 * rainK;
    sky.hemi.intensity *= dimRain;
    // éclair
    const lt = t - T.thunder; const fl = lt >= 0 && lt < 0.6 ? (lt < 0.08 ? 1 : lt > 0.2 && lt < 0.3 ? 0.7 : 0) : 0;
    sky.uniforms.flash.value = fl * 0.8; lightning.intensity = fl * 6; if (fl) sky.hemi.intensity += fl * 3;
    town.setWet(rainK, renderer, scene); town.antennas.forEach((a, i) => { a.material.opacity = (Math.floor(t * 1.2 + i * 0.37) % 2) ? 0.95 : 0.15; });
    // fenêtres
    let wl = day ? 0 : 1;
    if (t >= T.windows) wl = 1 + 0.8 * ramp(t, T.windows, T.windows + 1.2);
    if (t >= T.closed) wl = lerp(1.8, 0.35, ramp(t, T.closed, T.closed + 0.8));
    town.setWindowLight(wl);
    town.lamps.forEach((l) => { l.gl.material.opacity = day ? 0 : 0.55 * (t > T.quiet && t < T.turned ? 0.4 : 1); });
    phones.forEach((p) => { const on = t >= T.windows + p.on && t < T.closed + p.on * 0.4; p.g.material.opacity = on ? 0.85 * (0.75 + 0.25 * Math.sin(t * 9 + p.ph)) : 0; });
    // tours
    const b = beat(t);
    towers.forEach((tw, i) => {
      tw.group.visible = present;
      const fail = i === 0 ? (t >= T.explode ? 1 : 0) : clamp((t - T.failing) / 2.5);
      tw.set(towerOn(i, t), b * towerOn(i, t), fail);
    });
    boom.update(t, T.explode);
    barrier.visible = present;
    // monstre
    M.root.visible = true;
    let mp = { crouch: 0, lean: 0.15, eyes: 0, headPitch: 0.25 };
    if (t >= T.flashback && t < T.disappeared) { mp = { crouch: 0.15, lean: 0.35, armL: [-0.6, -0.5], armR: [-0.9, -0.3], eyes: 1, headPitch: 0.1, twitch: t, walk: (t - T.flashback) * 0.55 }; }
    else if (t >= T.disappeared && t < T.morning) M.root.visible = false;
    else if (day) { mp = { crouch: 0.25, lean: 0.4, armR: [-1.2, -0.4], armL: [-0.4, -0.3], eyes: t < T.froze ? 0.6 : 0, headPitch: 0.2, headYaw: 0.3 }; }
    else if (t >= T.silentTowers) mp.eyes = 0.3 + 0.2 * Math.sin(t * 3);
    if (t >= T.quiet && t < T.turned) mp = { ...mp, eyes: 1, twitch: t, headTilt: 0.3, jerk: t, crouch: 0.15 * ramp(t, T.quiet, T.creaking) };
    M.root.position.set(0, 0, 0); M.root.rotation.y = 0;
    if (t >= T.flashback && t < T.disappeared) M.root.position.set(0, 0, lerp(-6, 3, ramp(t, T.flashback, T.disappeared)));
    if (t >= T.quiet && t < T.turned) M.root.position.set(0.6 * ramp(t, T.creaking, T.turned), 0, 2.5 * smooth(ramp(t, T.creaking, T.turned)));
    if (t >= T.turned && t < T.behind) M.root.visible = false;
    if (t >= T.behind) {
      M.root.position.set(2.4, 0, 18.6); M.root.rotation.y = Math.PI;
      const h = ramp(t, T.hand, T.hand + 1.4);
      mp = { crouch: 0.35, lean: 0.55, eyes: 1, headPitch: 0.45, armL: [-0.3, -0.3], armR: [lerp(-0.2, -2.3, smooth(h)), lerp(-0.2, -0.9, smooth(h))], curl: lerp(0.2, 0.7, h), twitch: t * 0.3, breathe: t };
    }
    M.pose(mp);
    // papa + moi
    const dadExpr = t < T.explode ? 'smirk' : t < T.relax ? 'shock' : t < T.radio ? 'smirk' : t < T.scream ? 'worried' : t < T.police ? 'shout' : t < T.thunder ? 'neutral' : t < T.whisper ? 'scared' : 'whisper';
    const kidExpr = t < T.dad + 1.5 ? 'neutral' : t < T.explode ? 'smile' : t < T.safe ? 'scared' : t < T.thunder ? 'smile' : t < T.battery ? 'worried' : 'scared';
    dad.root.visible = kid.root.visible = present;
    dad.root.rotation.y = DAD_YAW; radioLed.emissiveIntensity = Math.floor(t * 7) % 2 ? 3 : 0.4; kid.root.rotation.y = Math.PI - 0.15;
    phone.visible = t >= T.clock - 0.2 && t < T.explode;
    radio.visible = t >= T.radio - 0.2 && t < T.police;
    const dadArmL = phone.visible ? [-1.1, -0.25] : radio.visible ? [-1.9, -0.35] : t >= T.five - 0.3 && t < T.radio ? [-1.5, -0.6] : [0, 0];
    const dadArmR = t >= T.scream && t < T.police ? [-2.6, 0] : [-0.9, 0];
    const busy = phone.visible || radio.visible;
    pose(dad, { expr: dadExpr, armL: dadArmL, armR: dadArmR, headPitch: busy ? 0.35 : 0, headYaw: t >= T.whisper ? -0.4 : 0, lean: t >= T.scream && t < T.police ? -0.1 : 0,
      time: t, phase: 0.3, idle: busy ? 0.3 : 1, talk: busy ? 0 : dadTalk(t), nod: groove(t) * 0.35, flinch: flinch(t) });
    dadBox.userData.led.material.emissiveIntensity = dadOn(t) ? 2 : 0;
    dadBox.userData.cones.forEach((c) => { c.scale.y = 1 + 0.3 * b * dadOn(t); });
    const kidUp = t >= T.mine - 0.2 && t < T.battery + 0.8;
    pose(kid, { expr: kidExpr, armR: kidUp ? [-2.9, 0.1] : [-0.9, 0], armL: [0, 0], headPitch: kidUp ? -0.4 : 0, headYaw: t >= T.behind ? -0.5 : 0,
      time: t, phase: 1.7, idle: kidUp ? 0.4 : 1, nod: groove(t) * 0.8, flinch: kidUp ? 0 : flinch(t), bob: groove(t) * 0.02 });
    const battShot = t >= at('and', 8) - 0.05 && t < T.quiet - 0.1;
    battBox.visible = battShot; batt1.visible = battShot && t < T.died - 0.15; batt0.visible = battShot && t >= T.died - 0.15;
    battBox.userData.led.material.emissiveIntensity = t < T.died - 0.15 ? 2 : 0;
    battBox.userData.cones.forEach((c) => { c.scale.y = 1 + 0.4 * b * (t < T.died - 0.15 ? 1 : 0); });
    kidBox.userData.led.material.emissive.set(t >= T.battery + 0.5 ? '#ff2b2b' : '#37ff6b');
    kidBox.userData.led.material.emissiveIntensity = t >= T.died ? 0 : 2;
    // gardes
    guards.forEach((g) => {
      g.ch.root.visible = present;
      const on = guardsOn(t) > 0.5 || (t < T.shorting + g.i * 0.2);
      g.box.userData.led.material.emissiveIntensity = on ? 2 : 0;
      const sg = shortGuards.find((x) => x.g === g); const zap = sg ? flinchAt(t, sg.t0, 1.4) : 0;
      g.base ||= g.ch.expr;
      pose(g.ch, { armR: [-0.9 + 0.5 * zap, 0], armL: [0, 0], expr: zap > 0.1 ? 'shock' : t > T.thunder ? 'scared' : g.base, headPitch: -0.1 + 0.45 * zap,
        time: t, phase: g.i * 1.37, idle: 1, nod: groove(t) * 0.5, flinch: Math.max(flinch(t, 0.9), zap * 0.5) });
    });
    shortGuards.forEach((s) => s.sp.update(t, s.t0));
    // flashback : civils qui fuient (apparition), gamin à la radio (matin)
    const fleeing = t >= T.appeared - 0.5 && t < T.disappeared;
    civ.forEach((c, i) => {
      c.root.visible = fleeing;
      const a = -0.5 + i * 0.22, d = 6 + (t - T.appeared) * 4.2 + (i % 3);
      c.root.position.set(Math.sin(a) * d + (i - 3) * 0.8, 0, 8 + Math.cos(a) * d * 0.9);
      c.root.rotation.y = a + 0.05;
      pose(c, { walk: t * 2.4 + i * 0.3, walkAmt: 1.3, armL: [-0.3, 0.4], armR: [-0.3, 0.4], lean: 0.25, expr: 'scared', time: t, phase: i, idle: 1, headYaw: Math.sin(t * 3 + i) * 0.5 });
    });
    bag.visible = shoe.visible = t >= T.disappeared - 0.3 && t < T.morning;
    radioKid.root.visible = day === 1;
    if (day) {
      const x = lerp(-9, 6, ramp(t, T.morning, T.present));
      radioKid.root.position.set(x, 0, 9.5); radioKid.root.rotation.y = Math.PI / 2;
      pose(radioKid, { walk: t * 1.6, walkAmt: 0.8, armR: [-1.0, 0], expr: t < T.froze ? 'smile' : 'shock', headYaw: t > T.froze - 0.4 ? 0.9 : 0, time: t, nod: t < T.froze ? beat(t) * 0.7 : 0 });
    }
    // police
    cars.forEach((c, i) => {
      const k = smooth(ramp(t, T.police - 0.6 + i * 0.2, T.police + 1.6 + i * 0.2));
      c.car.group.visible = present && t >= T.police - 0.1;
      c.car.group.position.lerpVectors(c.from, c.to, k);
      c.car.set(t < T.sirensDied + i * 0.25 ? 1 : 0, t + i * 0.13, t < T.sirensDied + 0.6 ? 1 : 0.15);
    });
  }
  const late = (t, camera) => { const k = isPresent(t) ? ramp(t, T.rain - 0.3, T.rain + 1.2) : 0; rain.update(t, camera, k); };

  // ---------- plans (caméra) ----------
  const head = [0, 12.4, 1.0];
  const DADH = [DAD.x, 1.62, DAD.z], KIDH = [KID.x, 1.62, KID.z];
  const cam = (pos, look, fov = 45, amt = 0.08) => push(pos, look, fov, amt);
  const shots = [
    // accroche
    { t: 0, cam: glide([6, 1.4, 16], [4.5, 2.2, 13], head, [0, 12.2, 1], 52, 46) },
    { t: at('only'), cam: (() => { const tp = towers[1].group.position, d = tp.clone().negate().normalize(); const p = tp.clone().addScaledVector(d, 9).add(V(2.0, towers[1].H + 0.4, 0)); return cam(p.toArray(), towerHead(1).add(V(0, -0.3, 0)).toArray(), 30, 0.2); })() },
    { t: at('if'), cam: orbit([0, 2, 0], 22, 1.25, 1.55, 6, 50, 4) },
    { t: at('over'), cam: glide([0, 11.8, 9], [0, 12.2, 5.2], head, head, 40, 34) },
    // flashback nuit
    { t: T.flashback, cam: glide([4, 1.0, 30], [3, 1.6, 24], [0, 9, 0], [0, 11, 0], 55, 50) },
    { t: at('middle', 1), cam: cam([-6, 2.4, 20], [0, 6, 2], 55, 0.12) },
    { t: at('that', 2), cam: cam([1, 1.2, 31], [-1, 0.3, 26], 40, 0.18) },
    // flashback jour
    { t: T.morning, cam: (u, t) => { const x = lerp(-9, 6, ramp(t, T.morning, T.present)); return { pos: [x - 2.5, 1.5, 15.5], look: [x, 1.2, 9.5], fov: 40 }; } },
    { t: at('blasting'), cam: (u, t) => { const x = lerp(-9, 6, ramp(t, T.morning, T.present)); return { pos: [x + 2.6, 1.3, 13.2], look: [x, 1.2, 9.5], fov: 38 }; } },
    { t: at('and', 1), cam: glide([5, 6, 12], [4, 9, 9], [0, 7, 2], head, 50, 44) },
    { t: at('that\'s'), cam: cam([4, 11.5, 7], head, 40, 0.18) },
    // le dispositif
    { t: T.present, cam: orbit([0, 0, 0], 40, 0.4, 1.1, 34, 55, 4) },
    { t: at('each'), cam: genCam(0) },
    { t: at('and', 2), cam: glide([-12, 1.7, 15], [-6, 1.7, 17], [0, 1.4, 12], [6, 1.4, 10], 46, 46) },
    { t: at('portable'), cam: (u) => { const g = guards[2].ch.root; const o = kit.wpos(g), f = kit.wpos(g, [0, 0, 1]).sub(o); return { pos: [o.x + f.x * lerp(2.6, 2.2, u) - 0.5, 1.45, o.z + f.z * lerp(2.6, 2.2, u)], look: [o.x, 1.2, o.z], fov: 40 }; } },
    { t: T.never, cam: orbit([0, 0, 0], 30, 1.0, 1.45, 14, 50, 6) },
    { t: at('and', 3), cam: cam([0.5, 11.6, 6.0], head, 34, 0.12) },
    { t: T.until, cam: glide([0, 12.2, 11], [0, 12.4, 7.6], head, head, 36, 32) },
    // papa et moi
    { t: T.dad, cam: cam(DAD.clone().addScaledVector(FWD, 2.4).addScaledVector(RIGHT, -0.5).add(V(0, 1.7, 0)).toArray(), [DAD.x, 1.5, DAD.z], 38, 0.12) },
    { t: at('and', 4), cam: cam([3.6, 1.7, 7.6], [3.2, 1.3, 13.6], 42, 0.1) },
    { t: T.normal, cam: orbit([0, 0, 0], 26, 1.6, 1.9, 8, 52, 5) },
    { t: T.clock, cam: insertCam(PHONE, 0.42, 0.03, 0.06, 34) },
    // incident
    { t: T.explode - 0.15, cam: cam([12, 3, 30], towerHead(0).toArray(), 48, 0.1) },
    { t: T.relax, cam: cam(DAD.clone().addScaledVector(FWD, 2.2).addScaledVector(RIGHT, 0.4).add(V(0, 1.6, 0)).toArray(), [DAD.x, 1.55, DAD.z], 38, 0.1) },
    { t: T.five, cam: glide([DAD.x + 1.2, 1.9, DAD.z + 2.4], [DAD.x + 0.8, 2.2, DAD.z + 2.0], [0, 7, 0], [-6, 9, -3], 52, 52) },
    { t: at('then', 1), cam: insertCam(RADIO, 0.75, -0.25, 0.05, 36) },
    { t: at('backup', 2), cam: genCam(2) },
    { t: T.oneByOne, cam: orbit([0, 0, 0], 34, 0.9, 1.5, 22, 55, 6) },
    { t: T.scream - 0.1, cam: cam(DAD.clone().addScaledVector(FWD, 2.3).add(V(0, 1.3, 0)).toArray(), [DAD.x, 1.7, DAD.z], 44, 0.2) },
    // tout le monde fait du bruit
    { t: T.police, cam: (u) => { const c = kit.wpos(cars[0].car.group); return { pos: [-2.5, 1.1, 26.6], look: [c.x, 0.9, c.z], fov: 52 }; } },
    { t: at('sirens', 1), cam: follow(cars[0].car.group, [3.5, 1.6, -4.2], [0, 1.2, 0], 44, 0.1) },
    { t: at('people', 2), cam: glide([12, 3, -12], [12, 5, -15], [14, 10, -36.7], [14, 14, -36.7], 50, 46) },
    { t: at('their', 2), cam: cam([12, 8, -28], [18, 14, -36.5], 42, 0.12) },
    { t: T.safe, cam: cam([KID.x + 0.4, 1.6, KID.z - 2.6], [KID.x, 1.5, KID.z], 38, 0.1) },
    // orage
    { t: T.thunder - 0.05, cam: glide([-3, 3, 38], [-2, 3.5, 34], [0, 8, 0], [0, 9, 0], 56, 52) },
    { t: at('heavy'), cam: cam([6, 1.8, 20], [0, 6, 4], 50, 0.08) },
    { t: T.closed - 0.1, cam: cam([-8, 9, -26], [-12, 12, -36.5], 44, 0.12) },
    { t: at('sirens', 2), cam: follow(cars[1].car.group, [-3.2, 1.8, -4.5], [0, 1.2, 0], 44, 0.1) },
    { t: at('and', 7), cam: (u) => { const g = shortGuards[0].g.ch.root; const o = kit.wpos(g), f = kit.wpos(g, [0, 0, 1]).sub(o); return { pos: [o.x + f.x * lerp(2.8, 2.4, u) + 0.6, 1.5, o.z + f.z * lerp(2.8, 2.4, u)], look: [o.x, 1.2, o.z], fov: 40 }; } },
    { t: T.mine - 0.1, cam: (u) => { const b = kit.wpos(kidBox); return { pos: [KID.x + 0.2, lerp(0.9, 1.1, u), KID.z - lerp(3.0, 2.6, smooth(u))], look: [(b.x + KID.x) / 2, (b.y + 1.7) / 2, KID.z], fov: 54 }; } },
    { t: at('and', 8), cam: cam(BATT.clone().addScaledVector(KFWD, 1.3).add(V(0.12, 0.25, 0)).toArray(), BATT.clone().add(V(0, 0.16, 0)).toArray(), 36, 0.2) },
    // silence
    { t: T.quiet - 0.1, cam: glide([4.5, 5, 28], [4, 5.5, 24.5], [0, 7, 0], [0.5, 8, 1.5], 50, 46) },
    { t: T.creaking - 0.05, cam: (u) => { const h = kit.wpos(M.head, [0, 0.8, 0]); return { pos: [h.x + 1.2, h.y + 0.2, h.z + lerp(9, 7.5, smooth(u))], look: h.toArray(), fov: 30 }; } },
    { t: T.turned, cam: cam(DAD.clone().addScaledVector(FWD, 2.4).addScaledVector(RIGHT, -0.9).add(V(0, 1.4, 0)).toArray(), [DAD.x, 1.25, DAD.z], 40, 0.1) },
    { t: at('but'), cam: glide([0, 9, 24], [0, 8, 20], [0, 3, 0], [0, 3, 0], 48, 44) },
    { t: T.behind - 0.05, cam: (u) => { const h = kit.wpos(M.head, [0, 0.8, 0]); const e = smooth(u); return { pos: [DAD.x - 0.8, lerp(1.6, 0.9, e), DAD.z - lerp(6, 7.5, e)], look: [lerp(DAD.x, h.x, e), lerp(1.6, h.y * 0.62, e), lerp(DAD.z, h.z, e)], fov: lerp(42, 58, e) }; } },
    { t: T.hand - 0.05, cam: (u) => { const hd = kit.wpos(M.arms[1].hand); return { pos: [DAD.x + 1.6, 0.7, DAD.z - lerp(3.4, 3.9, u)], look: [(hd.x + DAD.x) / 2, (hd.y + 1.6) / 2, (hd.z + DAD.z) / 2], fov: 64 }; } },
    { t: T.whisper - 0.1, cam: (u) => { const hd = kit.wpos(M.arms[1].hand); const p = DAD.clone().addScaledVector(FWD, lerp(2.6, 2.1, smooth(u))).add(V(0, 1.2, 0)); return { pos: p.toArray(), look: [DAD.x, lerp(2.0, 2.2, u), DAD.z], fov: 44 }; } },
  ];

  // tremblements d'impact
  const kicks = [T.explode, T.scream, T.thunder, T.behind + 0.1];
  const kickFn = (t) => kicks.reduce((a, k0) => a + kit.kick(t, k0, 0.35), 0);

  return {
    duration, shots, update, late, kick: kickFn,
    bigWords: ['disappeared', 'exploded', 'silent', 'behind', 'stop'],
    cues: { ...T, bpm: BPM, duration },
    musicLevel,
  };
}
