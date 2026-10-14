// Construit un fichier HTML unique (JS et CSS intégrés) : dist-single/pronofoot.html
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-single';
const assets = join(dir, 'assets');
const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const safeJs = js.replace(/<\/script/gi, '<\\/script');

const html = `<title>PronoFoot</title>
<meta name="theme-color" content="#07070c">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>
  // Thème sombre par défaut, appliqué avant le rendu.
  (function () {
    var light = false;
    try { light = JSON.parse(localStorage.getItem('pronofoot:preferences') || '{}').theme === 'light'; } catch (e) {}
    if (!light) document.documentElement.classList.add('dark');
    document.documentElement.lang = 'fr';
  })();
</script>
<style>${css}</style>
<div id="root"></div>
<script type="module">${safeJs}</script>
`;
writeFileSync(join(dir, 'pronofoot.html'), html);
console.log(`dist-single/pronofoot.html — ${(html.length / 1024).toFixed(0)} Ko`);
