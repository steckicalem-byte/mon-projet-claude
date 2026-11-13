// Épisode 2 « La musique ne doit jamais s'arrêter » — l'action : sprint, saut, glissade, foudre,
// tour qui s'écrase, vitre brisée, démarrage du camion de glaces, cliffhanger.
export default async function story({ kit, THREE, scene, camera, renderer, at }) {
  const { V, ramp, smooth, clamp, lerp, glide, push, orbit, pose, pathAt } = kit;
  const T = {
    froze: at('froze'), nobody: at('nobody'), battery: at('battery'), crouched: at('crouched'), crawled: at('crawled'),
    pointed: at('pointed'), truck: at('truck'), every: at('every'), ran: at('ran'), jumped: at('jumped'), slid: at('slid'),
    lightning: at('lightning'), falling: at('falling'), dove: at('dove'), smashed: at('smashed'), sparks: at('sparks'),
    crash: at('crash'), reached: at('reached'), locked: at('locked'), yelling: at('yelling'), dying: at('dying'),
    smash2: at('smashed', 2), climbed: at('climbed'), nothing: at('nothing'), again: at('again'), roared: at('roared'),
    blasting: at('blasting'), died: at('died'), move: at('move'), drove: at('drove'), dadJump: at('jumped', 2),
    laughed: at('laughed'), ended: at('ended'), screen: at('screen'), off: at('off'), headTurn: at('head', 2), end: at('us', 1, true),
  };
  const duration = T.end + 1.8;
  const cam = (pos, look, fov = 45, amt = 0.08) => push(pos, look, fov, amt);

  // ---------- décor : la place après la panne, sous la pluie ----------
  const sky = kit.nightSky(scene, {});
  const town = kit.city(scene, { seed: 4, plaza: 22 });
  town.setWindowLight(0.35);
  const barrier = kit.barrierRing(scene, 9, 20);
  const M = kit.monster(scene, {});
  const towerAngles = [60, 120, 180, 240, 300, 0].map((d) => (d * Math.PI) / 180);
  const towers = towerAngles.map((a) => kit.speakerTower(scene, V(Math.cos(a) * 17, 0, Math.sin(a) * 17), V(0, 6, 0)));
  towers.forEach((tw) => tw.set(0, 0, 1));
  const FALL = towers[3]; // tour n°4
  const fallBase = FALL.group.position.clone();
  const strike = kit.lightning(scene, fallBase.clone().add(V(0, FALL.H + 2, 0)), 9);
  const impact = V(-12.5, 0.5, -18.5);
  const crashFx = kit.burst(scene, impact.clone().add(V(0, 1, 0)), { n: 260, size: 0.3, seed: 21 });
  const strikeFx = kit.burst(scene, fallBase.clone().add(V(0, FALL.H + 1, 0)), { n: 120, size: 0.25, seed: 22, smoke: false, color: '#cfe0ff' });
  const rain = kit.rain(scene, 2600);

  // voitures de police éteintes (une sert de « glissade »)
  const slideCar = kit.policeCar(scene, V(-7.5, 0.25, -9.5), Math.PI / 4);
  const cars = [slideCar, kit.policeCar(scene, V(10, 0, 29), -Math.PI / 2), kit.policeCar(scene, V(29, 0, -6), 0)];
  cars.forEach((c) => c.set(0, 0, 0.1));

  // camion de glaces
  const TRUCK0 = V(-12, 0, -27);
  const truck = kit.iceCreamTruck(scene, TRUCK0, -Math.PI / 2);
  const WIN = V(-13.9, 0, -25.0);

  // personnages
  const dad = kit.makeChar({ shirt: '#22305a', pants: '#1a2138', hat: 'police', hatColor: '#1c2748', badge: true, walkie: true, belt: true, skin: '#d9a477', expr: 'scared', shoes: '#111', uniform: true });
  const kid = kit.makeChar({ shirt: '#3bb36a', hoodie: '#eef5ef', pants: '#2a3a66', hair: '#4a2c1a', hairStyle: 'fluffy', skin: '#f0c49b', expr: 'scared', shoes: '#f2f2f2', hood: true });
  scene.add(dad.root, kid.root);
  const DAD = V(2.4, 0, 13.4), KID = V(4.0, 0, 13.9);
  const dadBox = kit.boombox('#30343f'); dadBox.rotation.x = -Math.PI / 2; dadBox.position.set(0, -0.02, 0.12); dad.arms[1].userData.hand.add(dadBox);
  // inserts face caméra : batterie de l'enceinte de papa, écran du tableau de bord
  const battProps = ['2%', '1%', '0%'].map((txt, i) => { const p = kit.screenProp([{ text: txt, size: 120, y: 0.55, color: i < 2 ? '#ff4b4b' : '#5a1b1b' }], { w: 0.2, h: 0.12, bg1: '#111', bg2: '#1c1c1c' }); p.visible = false; scene.add(p); return p; });
  const BATT = V(0, 1.3, 0);
  const dash = kit.screenProp([{ text: 'REPEAT', size: 54, y: 0.35, color: '#9fd8ff' }, { text: 'OFF', size: 96, y: 0.72, color: '#ff4b4b' }], { w: 0.34, h: 0.22, bg1: '#0b1426', bg2: '#060a14' });
  dash.visible = false; scene.add(dash);
  // gardes terrifiés, enceintes mortes
  const guards = [];
  [[-6, 11], [9, 7], [11, -4], [-10, 4], [6, -11]].forEach(([x, z], i) => {
    const g = kit.makeChar({ shirt: ['#24304f', '#2b3a5c', '#1f2a44'][i % 3], pants: '#171c2c', hat: 'police', uniform: true, skin: ['#f0c49b', '#c98d5e', '#8d5a3b'][i % 3], expr: 'scared' });
    g.root.position.set(x, 0, z); g.root.rotation.y = Math.atan2(2.4 - x, 18.6 - z); scene.add(g.root); guards.push(g);
  });

  // ---------- trajectoires ----------
  // gamin : sprint → saut de barrière → traverse → glissade sous la voiture → foudre → plongeon → camion
  const kidPath = [
    [T.ran, KID.x, KID.z], [T.jumped - 0.1, 3.0, 10.0], [T.jumped + 0.6, 2.2, 7.4], [T.slid - 0.2, -5.0, -6.3],
    [T.slid + 0.9, -9.6, -11.8], [T.lightning + 0.6, -11.6, -16.2], [T.dove, -12.3, -17.6], [T.dove + 0.7, -15.2, -16.6],
    [T.crash, -15.2, -16.6], [T.reached, WIN.x, WIN.z],
  ];
  const truckPath = [[T.drove, TRUCK0.x, TRUCK0.z], [T.drove + 1.2, -19, -14], [T.drove + 2.6, -16, 4], [T.dadJump - 0.3, -3, 13.6], [T.dadJump, -1.2, 13.6]];
  const truckPos = (t) => { if (t < T.drove) return { x: TRUCK0.x, z: TRUCK0.z, dir: -Math.PI / 2 }; const p = pathAt(truckPath, t); return p; };
  const dadPos = (t) => {
    if (t < T.crouched) return { x: DAD.x, z: DAD.z };
    if (t < T.pointed) return { x: DAD.x - 0.2, z: lerp(DAD.z, 10.8, ramp(t, T.crawled, T.pointed)) };
    const tp = truckPos(T.dadJump);
    if (t < T.laughed - 0.6 && t >= T.dadJump - 1.0) return { x: lerp(2.2, tp.x + 1.4, ramp(t, T.dadJump - 1.0, T.dadJump)), z: lerp(10.8, tp.z - 0.5, ramp(t, T.dadJump - 1.0, T.dadJump)) };
    return { x: 2.2, z: 10.8 };
  };

  // ---------- musique ----------
  const BPM = 124; const beat = (t) => Math.exp(-((t * BPM) / 60 % 1) * 7);
  const dadSpeaker = (t) => (t < T.died ? 1 : 0), song = (t) => (t >= T.blasting - 0.2 && t < T.ended ? 1 : 0);
  const musicLevel = (t) => Math.max(0.3 * dadSpeaker(t), song(t));

  const flinchAt = (t, t0, dur = 1.1) => { const d = t - t0; return d < 0 || d > dur ? 0 : d < 0.12 ? d / 0.12 : 1 - smooth((d - 0.12) / (dur - 0.12)); };
  const shake = (t) => Math.max(flinchAt(t, T.lightning, 0.8), flinchAt(t, T.smashed, 1.4));

  function update(t) {
    const fl = shake(t);
    sky.uniforms.flash.value = flinchAt(t, T.lightning, 0.35) * 0.9;
    sky.hemi.intensity = 0.9 + 3 * flinchAt(t, T.lightning, 0.3);
    town.setWet(1, renderer, scene);
    town.antennas.forEach((a, i) => { a.material.opacity = (Math.floor(t * 1.2 + i * 0.37) % 2) ? 0.95 : 0.15; });
    // tour n°4 : foudre puis chute vers le gamin
    strike.update(t, T.lightning); strikeFx.update(t, T.lightning);
    const fall = smooth(ramp(t, T.falling - 0.2, T.smashed)) ** 1.6;
    const dir = Math.atan2(impact.x - fallBase.x, impact.z - fallBase.z);
    FALL.group.rotation.set(0, 0, 0); FALL.group.rotateY(dir); FALL.group.rotateX(fall * 1.45); FALL.group.rotateY(-dir);
    crashFx.update(t, T.smashed);
    // monstre figé derrière papa ; se réveille quand la chanson s'arrête
    M.root.position.set(2.4, 0, 18.6); M.root.rotation.y = Math.PI;
    const wake = ramp(t, T.ended + 0.3, T.headTurn + 1.2);
    const tp = truckPos(t);
    const toTruck = Math.atan2(tp.x - 2.4, tp.z - 18.6) - Math.PI;
    M.pose({ crouch: 0.35, lean: 0.55, eyes: lerp(0.6, 1, wake), headPitch: 0.45 - 0.25 * wake, armL: [-0.3, -0.3], armR: [-2.3, -0.9], curl: 0.7,
      headYaw: lerp(0, clamp(toTruck, -1.2, 1.2), smooth(ramp(t, T.headTurn - 0.2, T.headTurn + 2.2))), breathe: t >= T.ended ? t : undefined });
    // papa
    const dp = dadPos(t);
    const inTruck = t >= T.dadJump;
    dad.root.visible = !inTruck || t >= T.laughed - 0.6;
    if (inTruck && t >= T.laughed - 0.6) { dad.root.position.set(tp.x - 0.4, 0.55, tp.z); dad.root.rotation.y = tp.dir; }
    else { dad.root.position.set(dp.x, 0, dp.z); dad.root.rotation.y = t < T.pointed ? Math.PI + 0.2 : t < T.dadJump - 1 ? -2.2 : Math.atan2(tp.x - dp.x, tp.z - dp.z); }
    const crawling = t >= T.crouched && t < T.pointed;
    const running = t >= T.dadJump - 1.0 && t < T.dadJump;
    pose(dad, {
      time: t, phase: 0.3, idle: crawling ? 0.2 : 1,
      crouch: crawling ? 0.75 : 0, lean: crawling ? 0.9 : running ? 0.3 : 0,
      walk: crawling ? t * 1.2 : running ? t * 2.6 : 0, walkAmt: crawling ? 0.5 : running ? 1.3 : 0,
      armR: t >= T.pointed && t < T.every ? [-1.55, 0.2] : crawling ? [-1.3, 0] : [-0.9, 0], armL: crawling ? [-1.3, 0] : [0, 0],
      talk: t >= T.yelling && t < T.smash2 ? 1 : t >= T.laughed && t < T.ended ? 0.7 : 0,
      expr: t >= T.laughed && t < T.ended ? 'smile' : t >= T.yelling && t < T.smash2 ? 'shout' : t >= T.ended ? 'shock' : 'scared',
      flinch: fl * 0.8,
    });
    dadBox.userData.led.material.emissiveIntensity = dadSpeaker(t) ? 2 : 0;
    // inserts batterie
    battProps.forEach((p, i) => { p.visible = false; });
    const bi = t < T.dying ? 0 : t < T.died ? 1 : 2;
    const battShot = (t >= T.battery - 0.1 && t < T.crouched) || (t >= T.dying - 0.1 && t < T.smash2) || (t >= T.died - 0.1 && t < T.move);
    const bp = battProps[bi]; bp.visible = battShot;
    const bpos = V(dp.x, 0, dp.z).add(V(0.35, 1.25, -0.55)); bp.position.copy(bpos); bp.rotation.set(0, Math.PI + 0.2, 0);
    BATT.copy(bpos);
    // gamin
    const kp = t < T.ran ? { x: KID.x, z: KID.z, dir: Math.PI } : pathAt(kidPath, t);
    const inside = t >= T.climbed + 0.6;
    kid.root.visible = !inside || t >= T.drove; // visible au volant via la vitre cassée
    let ky = 0, kroll = 0;
    const jumpU = ramp(t, T.jumped - 0.15, T.jumped + 0.55); if (jumpU > 0 && jumpU < 1) ky = Math.sin(jumpU * Math.PI) * 1.1;
    const sliding = t >= T.slid - 0.2 && t < T.slid + 0.9;
    const diveU = ramp(t, T.dove, T.dove + 0.7); const diving = diveU > 0 && diveU < 1;
    const lying = t >= T.dove + 0.7 && t < T.crash; // à terre pendant le fracas
    if (inside) { kid.root.position.set(tp.x + 0.3, 0.75, tp.z); kid.root.rotation.y = tp.dir; }
    else { kid.root.position.set(kp.x, ky + (sliding ? 0.15 : 0) + (diving ? Math.sin(diveU * Math.PI) * 0.6 : 0), kp.z); kid.root.rotation.y = t < T.ran ? Math.PI - 0.15 : t >= T.reached ? Math.PI : kp.dir; }
    const runningKid = !inside && t >= T.ran && t < T.reached && !sliding && !lying && !diving;
    const smashU = ramp(t, T.smash2 - 0.25, T.smash2 + 0.3);
    pose(kid, {
      time: t, phase: 1.7, idle: 1,
      walk: runningKid ? t * 2.9 : 0, walkAmt: runningKid ? 1.4 : 0,
      lean: sliding ? -1.35 : diving ? 1.2 : lying ? 1.5 : runningKid ? 0.35 : 0,
      crouch: sliding ? 0.6 : lying ? 0.7 : jumpU > 0 && jumpU < 1 ? 0.2 : 0,
      armR: inside ? [-1.2, 0.1] : smashU > 0 && smashU < 1 ? [lerp(-0.4, -1.9, Math.sin(smashU * Math.PI)), 1.2] : sliding ? [-2.6, 0.3] : diving ? [-2.8, 0.2] : [0, 0],
      armL: inside ? [-1.2, -0.1] : sliding ? [-2.6, -0.3] : diving ? [-2.8, -0.2] : [0, 0],
      headPitch: sliding ? -0.6 : 0, headYaw: t >= T.yelling && t < T.smash2 ? 2.4 : 0,
      expr: t >= T.move && t < T.ended ? 'smile' : t >= T.ended ? 'shock' : runningKid ? 'angry' : 'scared',
      flinch: sliding || diving || inside ? 0 : fl,
    });
    // camion
    truck.group.position.set(tp.x, 0, tp.z); truck.group.rotation.y = tp.dir - 0; if (t >= T.drove) truck.group.rotation.y = tp.dir;
    truck.set(t >= T.roared - 0.1 ? 1 : 0, song(t), beat(t), t);
    truck.smash(t, T.smash2);
    dash.visible = t >= T.screen - 0.1 && t < T.headTurn - 0.1;
    const dpos = kit.wpos(truck.group, [0.2, 1.6, 2.3]); dash.position.copy(dpos); dash.rotation.set(0, truck.group.rotation.y + Math.PI, 0); dash.rotateX(-0.3);
    // gardes : terrifiés, sursautent
    guards.forEach((g, i) => pose(g, { time: t, phase: i * 1.37, idle: 1, flinch: fl, expr: t >= T.move && t < T.ended ? 'smile' : 'scared', headYaw: Math.sin(t * 0.8 + i) * 0.4, nod: song(t) * beat(t) * 0.4 }));
    barrier.visible = true;
  }
  const late = (t, cameraObj) => rain.update(t, cameraObj, 1);

  // ---------- plans ----------
  const head = () => kit.wpos(M.head, [0, 0.8, 0]).toArray();
  const kidCam = (back = 3.2, up = 1.4, side = 1.0, fov = 52, lookUp = 1.0) => () => {
    const k = kit.wpos(kid.root); const d = kid.root.rotation.y;
    return { pos: [k.x - Math.sin(d) * back + Math.cos(d) * side, up, k.z - Math.cos(d) * back - Math.sin(d) * side], look: [k.x + Math.sin(d) * 2, lookUp, k.z + Math.cos(d) * 2], fov };
  };
  const front = (obj, dist, up, lookY, fov = 40, side = 0.3) => () => { const o = kit.wpos(obj); const d = obj.rotation.y; return { pos: [o.x + Math.sin(d) * dist + Math.cos(d) * side, up, o.z + Math.cos(d) * dist - Math.sin(d) * side], look: [o.x, lookY, o.z], fov }; };
  const shots = [
    // recap : la main au-dessus de la tête de papa
    { t: 0, cam: (u) => ({ pos: [DAD.x + 1.6, 0.9, DAD.z - lerp(5.2, 4.6, u)], look: [DAD.x + 0.2, 3.6, DAD.z + 1.5], fov: 70 }) },
    { t: at('one'), cam: glide([DAD.x + 0.4, 2.6, DAD.z + 1.6], [DAD.x + 0.3, 2.4, DAD.z + 1.2], [DAD.x, 2.2, DAD.z], [DAD.x, 2.1, DAD.z], 40, 34) },
    { t: T.nobody, cam: orbit([0, 0, 10], 16, 1.2, 1.6, 4, 52, 3) },
    { t: at('only'), cam: front(dad.root, 2.6, 1.6, 1.45, 40, 0.5) },
    { t: T.battery - 0.05, cam: () => { const b = BATT; return { pos: [b.x - Math.sin(0.2) * 0.9, b.y + 0.1, b.z - 0.9], look: [b.x, b.y, b.z], fov: 32 }; } },
    { t: T.crouched, cam: () => { const d = kit.wpos(dad.root); return { pos: [d.x - 2.8, 0.6, d.z - 1.8], look: [d.x, 0.8, d.z + 1], fov: 54 }; } },
    { t: T.crawled + 0.3, cam: () => { const d = kit.wpos(dad.root); const h = kit.wpos(M.arms[1].hand); return { pos: [d.x - 0.6, 0.35, d.z - 2.6], look: [d.x, 1.2, d.z + 2], fov: 64 }; } },
    { t: T.pointed, cam: front(dad.root, 2.2, 1.6, 1.5, 42, -0.6) },
    { t: T.truck - 0.1, cam: cam([TRUCK0.x + 4, 2.4, TRUCK0.z + 14], [TRUCK0.x, 2.2, TRUCK0.z], 44, 0.15) },
    { t: T.every, cam: glide([TRUCK0.x - 2, 4.0, TRUCK0.z + 8], [TRUCK0.x - 2, 4.6, TRUCK0.z + 6.5], [TRUCK0.x - 0.5, 3.2, TRUCK0.z], [TRUCK0.x - 0.5, 3.6, TRUCK0.z], 44, 40) },
    { t: at('i', 1), cam: front(kid.root, 1.9, 1.55, 1.5, 38, 0.3) },
    // sprint
    { t: T.ran - 0.05, cam: kidCam(-3.2, 1.2, 0.4, 56, 1.0) },
    { t: T.jumped - 0.25, cam: () => ({ pos: [7.0, 0.5, 4.5], look: [2.6, 1.3, 8.6], fov: 58 }) },
    { t: T.slid - 0.25, cam: () => ({ pos: [-12.5, 0.5, -5.5], look: [-7.5, 0.5, -9.5], fov: 60 }) },
    { t: T.slid + 0.75, cam: kidCam(3.5, 1.6, 1.4, 54, 1.4) },
    // foudre + chute
    { t: T.lightning - 0.1, cam: () => ({ pos: [-4, 1.2, -4], look: [fallBase.x, FALL.H, fallBase.z], fov: 60 }) },
    { t: T.falling - 0.05, cam: () => { const k = kit.wpos(kid.root); return { pos: [k.x + 3.5, 0.6, k.z + 5], look: [lerp(k.x, fallBase.x, 0.4), 6, lerp(k.z, fallBase.z, 0.4)], fov: 64 }; } },
    { t: at('right', 1), cam: () => { const k = kit.wpos(kid.root); return { pos: [k.x - 1.4, 1.6, k.z - 2.0], look: [k.x, 1.4, k.z], fov: 40 }; } },
    { t: T.dove - 0.1, cam: () => ({ pos: [-17.5, 0.8, -11], look: [-13, 0.8, -17], fov: 58 }) },
    { t: T.smashed - 0.1, cam: () => ({ pos: [-3, 2.0, -9], look: [impact.x, 1.5, impact.z], fov: 56 }) },
    { t: T.sparks, cam: glide([-17.5, 1.0, -14.5], [-17, 1.2, -15.5], [-12.5, 1.0, -18.5], [-12.5, 1.6, -18.5], 50, 46) },
    { t: at('but', 1), cam: () => { const h = kit.wpos(M.head, [0, 0.8, 0]); return { pos: [h.x - 2.5, h.y - 1.5, h.z - 9], look: h.toArray(), fov: 36 }; } },
    // le camion
    { t: T.reached - 0.1, cam: () => { const k = kit.wpos(kid.root); return { pos: [k.x + 2.2, 1.4, k.z + 3.2], look: [k.x - 0.4, 1.4, k.z - 0.6], fov: 46 }; } },
    { t: T.locked - 0.1, cam: () => ({ pos: [WIN.x + 0.6, 1.7, WIN.z + 1.3], look: [WIN.x, 1.6, WIN.z - 0.8], fov: 40 }) },
    { t: T.yelling - 0.1, cam: front(dad.root, 2.0, 1.55, 1.6, 44, 0.2) },
    { t: T.dying - 0.05, cam: () => { const b = BATT; return { pos: [b.x - 0.18, b.y + 0.1, b.z - 0.9], look: [b.x, b.y, b.z], fov: 32 }; } },
    { t: T.smash2 - 0.35, cam: () => ({ pos: [WIN.x + 1.3, 1.5, WIN.z + 1.6], look: [WIN.x, 1.6, WIN.z - 0.9], fov: 48 }) },
    { t: T.climbed, cam: () => ({ pos: [WIN.x - 0.3, 1.9, WIN.z + 0.6], look: [WIN.x - 0.4, 1.4, WIN.z - 1.8], fov: 50 }) },
    { t: T.nothing - 0.05, cam: (u) => ({ pos: [TRUCK0.x - lerp(8, 7.2, u), 1.0, TRUCK0.z - 0.6], look: [TRUCK0.x - 2, 1.5, TRUCK0.z], fov: 48 }) },
    { t: T.again - 0.05, cam: () => ({ pos: [WIN.x + 0.5, 1.7, WIN.z + 1.0], look: [WIN.x - 0.4, 1.4, WIN.z - 1.5], fov: 40 }) },
    { t: T.roared - 0.1, cam: () => ({ pos: [TRUCK0.x - 8, 0.8, TRUCK0.z - 1.5], look: [TRUCK0.x - 2, 1.4, TRUCK0.z], fov: 50 }) },
    { t: T.blasting, cam: glide([TRUCK0.x - 1.5, 3.6, TRUCK0.z + 3.2], [TRUCK0.x - 1.5, 4.4, TRUCK0.z + 2.4], [TRUCK0.x, 3.2, TRUCK0.z], [TRUCK0.x, 3.6, TRUCK0.z], 44, 38) },
    { t: T.died - 0.05, cam: () => { const b = BATT; return { pos: [b.x - 0.18, b.y + 0.1, b.z - 0.9], look: [b.x, b.y, b.z], fov: 32 }; } },
    { t: T.move - 0.3, cam: glide([0, 7, 32], [0, 7.5, 28], [2.4, 8, 18], [2.4, 9, 18], 50, 46) },
    // la course du camion
    { t: T.drove - 0.05, cam: () => { const p = kit.wpos(truck.group); const d = truck.group.rotation.y; return { pos: [p.x - Math.sin(d) * 7 + Math.cos(d) * 2.5, 2.4, p.z - Math.cos(d) * 7 - Math.sin(d) * 2.5], look: [p.x, 1.6, p.z], fov: 52 }; } },
    { t: at('as', 1), cam: () => { const p = kit.wpos(truck.group); return { pos: [p.x + 5, 1.0, p.z + 6], look: [p.x, 1.8, p.z], fov: 54 }; } },
    { t: T.dadJump - 0.1, cam: () => { const d = kit.wpos(dad.root); return { pos: [d.x + 4.5, 1.6, d.z - 6.5], look: [d.x - 1.5, 1.4, d.z + 0.5], fov: 54 }; } },
    { t: T.laughed - 0.3, cam: () => { const p = kit.wpos(truck.group, [0, 1.8, 4.2]); const l = kit.wpos(truck.group, [0, 1.6, 0.5]); return { pos: p.toArray(), look: l.toArray(), fov: 44 }; } },
    // fin
    { t: T.ended - 0.05, cam: glide([-1.2, 6.5, 6], [-1.2, 7.5, 5], [1.5, 6, 16], head(), 50, 44) },
    { t: T.screen - 0.05, cam: () => { const p = kit.wpos(dash, [0.05, 0.03, 0.75]); return { pos: p.toArray(), look: kit.wpos(dash).toArray(), fov: 34 }; } },
    { t: T.headTurn - 0.1, cam: (u) => { const h = kit.wpos(M.head, [0, 0.8, 0]); return { pos: [h.x - 4, h.y - 3.5, h.z - lerp(10, 8.5, u)], look: h.toArray(), fov: 40 }; } },
  ];
  const kick = (t) => kit.kick(t, T.lightning, 0.4) + kit.kick(t, T.smashed, 0.6) + kit.kick(t, T.smash2, 0.25) + kit.kick(t, T.roared, 0.2);
  return { duration, shots, update, late, kick, bigWords: ['falling', 'lightning', 'nothing', 'off'], cues: { ...T, bpm: BPM, duration }, musicLevel };
}
