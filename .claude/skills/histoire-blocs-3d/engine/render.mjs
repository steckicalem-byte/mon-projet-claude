// Rendu d'un épisode : Chromium (WebGL logiciel) → JPEG → ffmpeg.
// node render.mjs --ep <dossier épisode> --out video.mp4 [--w 1080 --h 1920 --fps 30]
//                 [--workers 2] [--chunk 5] [--from 0 --to <s>] [--stills 3.5,10,22 --stillsDir dir] [--audio mix.wav]
// Le dossier épisode contient story.js, words.json et node_modules/ (three + @fontsource/lilita-one).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? '1' : arr[i + 1]]] : a), []));
const EP = path.resolve(args.ep || '.');
const W = +(args.w || 1080), H = +(args.h || 1920), FPS = +(args.fps || 30);
const WORKERS = +(args.workers || 2);
const require = createRequire(path.join(EP, 'package.json'));
const { chromium } = (() => { try { return require('playwright'); } catch { return createRequire(import.meta.url)('playwright'); } })();
const threePath = path.join(EP, 'node_modules/three/build/three.module.js');
const fontPath = path.join(EP, 'node_modules/@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2');
for (const p of [threePath, fontPath, path.join(EP, 'story.js'), path.join(EP, 'words.json')]) if (!fs.existsSync(p)) { console.error('manquant :', p); process.exit(1); }

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f;
  if (u === '/' || u === '/index.html') f = path.join(ENGINE, 'index.html');
  else if (u === '/three.module.js') f = threePath;
  else if (u.startsWith('/three/')) f = path.join(EP, 'node_modules/three', u.slice(7));
  else if (u === '/font.woff2') f = fontPath;
  else if (u.startsWith('/engine/')) f = path.join(ENGINE, u.slice(8));
  else if (u.startsWith('/ep/')) f = path.join(EP, u.slice(4));
  if (!f || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL = `http://127.0.0.1:${server.address().port}/?w=${W}&h=${H}&fps=${FPS}`;

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.ready || window.loadError, null, { timeout: 120000 });
  const err = await page.evaluate(() => window.loadError);
  if (err) throw new Error(err);
  return page;
}
const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const toBuf = (d) => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');

// ---- repères (cues) pour la bande-son ----
if (args.cues) {
  const b = await launch(); const page = await openPage(b);
  const c = await page.evaluate(() => window.cues);
  fs.writeFileSync(path.resolve(args.cues), JSON.stringify(c, null, 1));
  console.log('cues ->', args.cues, Object.keys(c).length, 'repères');
  await b.close(); server.close(); process.exit(0);
}

// ---- images fixes de contrôle ----
if (args.stills) {
  const dir = path.resolve(args.stillsDir || path.join(EP, 'stills'));
  fs.mkdirSync(dir, { recursive: true });
  const b = await launch(); const page = await openPage(b);
  for (const s of args.stills.split(',')) {
    const f = Math.round(parseFloat(s) * FPS);
    const t0 = Date.now();
    const d = await page.evaluate((f) => window.renderFrame(f), f);
    const name = path.join(dir, `t${String(parseFloat(s).toFixed(2)).padStart(6, '0')}.jpg`);
    fs.writeFileSync(name, toBuf(d));
    console.log(name, `${Date.now() - t0} ms`);
  }
  await b.close(); server.close(); process.exit(0);
}

// ---- vidéo ----
const probe = await launch(); const pp = await openPage(probe);
const meta = await pp.evaluate(() => window.meta); await probe.close();
const f0 = Math.round(+(args.from || 0) * FPS), f1 = Math.min(meta.frames, Math.round(+(args.to || meta.duration) * FPS));

console.log(`durée ${meta.duration.toFixed(2)} s, images ${f0}→${f1} (${f1 - f0}), ${WORKERS} workers, ${W}x${H}`);
const outFile = path.resolve(args.out || path.join(EP, 'video.mp4'));
// Rendu par tranches reprenables : chaque tranche (CHUNK s) est écrite dans <out>.parts/ puis renommée.
// Si le rendu est interrompu (redémarrage…), relancer la même commande saute les tranches déjà faites.
const CHUNK = Math.max(1, Math.round(+(args.chunk || 5) * FPS));
const tmp = outFile + '.parts'; fs.mkdirSync(tmp, { recursive: true });
const chunks = []; for (let a = f0; a < f1; a += CHUNK) chunks.push([a, Math.min(f1, a + CHUNK)]);
const name = ([a, b]) => path.join(tmp, `c${String(a).padStart(6, '0')}_${b}.mp4`);
const todo = chunks.filter((c) => !fs.existsSync(name(c)));
console.log(`${chunks.length} tranches, ${chunks.length - todo.length} déjà faites, ${todo.length} à rendre`);
let done = 0; const total = todo.reduce((n, [a, b]) => n + b - a, 0); const tStart = Date.now();
async function worker() {
  const br = await launch(); const page = await openPage(br);
  while (todo.length) {
    const c = todo.shift(); const [a, b] = c;
    const part = name(c), partTmp = part + '.tmp.mp4';
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', partTmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f++) {
      const d = await page.evaluate((f) => window.renderFrame(f), f);
      if (!ff.stdin.write(toBuf(d))) await new Promise((r) => ff.stdin.once('drain', r));
      if (++done % 30 === 0) { const el = (Date.now() - tStart) / 1000; process.stdout.write(`\r${done}/${total} images — ${(done / el).toFixed(2)} img/s — reste ~${Math.round((total - done) / (done / el))} s   `); }
    }
    ff.stdin.end(); const code = await new Promise((r) => ff.on('close', r));
    if (code !== 0) throw new Error('ffmpeg a échoué sur la tranche ' + a);
    fs.renameSync(partTmp, part);
  }
  await br.close();
}
await Promise.all(Array.from({ length: Math.min(WORKERS, todo.length) }, () => worker()));
console.log('\nassemblage…');
fs.writeFileSync(path.join(tmp, 'list.txt'), chunks.map((c) => `file '${name(c)}'`).join('\n'));
const concatArgs = ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt')];
if (args.audio) concatArgs.push('-ss', String(f0 / FPS), '-i', path.resolve(args.audio), '-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k', '-shortest');
concatArgs.push('-c:v', 'copy', '-movflags', '+faststart', outFile);
execFileSync('ffmpeg', concatArgs, { stdio: 'inherit' });
if (!args.keepParts) fs.rmSync(tmp, { recursive: true, force: true });
console.log('ok', outFile, `${((Date.now() - tStart) / 1000).toFixed(0)} s`);
server.close();
