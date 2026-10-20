#!/usr/bin/env node
// Capture a scene page frame by frame.
//
//   node capture.mjs <page.html> check
//   node capture.mjs <page.html> keys <outdir> <t> [<t> ...]
//   node capture.mjs <page.html> all <outdir> [--fps 60]
//
// The page must set window.ready once fonts are loaded, and expose
// window.seek(t) and window.duration. window.frame = { width, height }
// sets the output size (default 1080x1350).
//
// It serves the page's folder on a private localhost port, so relative font
// and asset paths work, and re-pins the viewport before every screenshot: a
// long capture can otherwise lose it and crop every frame after.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

async function loadPlaywright() {
  for (const base of [path.join(here, '..', '..', '..', 'package.json'), path.join(process.cwd(), 'package.json')]) {
    try {
      return createRequire(base)('playwright');
    } catch { /* try the next place */ }
  }
  const root = path.resolve(here, '..', '..', '..');
  console.error(`Playwright isn't installed. Run once:\n  npm install --prefix "${root}"\n  npx --prefix "${root}" playwright install chromium`);
  process.exit(2);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json' };

function serve(root) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(root, rel);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const [pageArg, mode, ...rest] = process.argv.slice(2);
if (!pageArg || !['check', 'keys', 'all'].includes(mode)) {
  console.error('usage: capture.mjs <page.html> check | keys <outdir> <t>... | all <outdir> [--fps 60]');
  process.exit(1);
}
const page = path.resolve(pageArg);
const root = path.dirname(path.dirname(page));
const { chromium } = await loadPlaywright();
const server = await serve(root);
const url = `http://127.0.0.1:${server.address().port}/${path.relative(root, page).split(path.sep).join('/')}?t=0`;

const browser = await chromium.launch();
const tab = await browser.newPage();
const errors = [];
tab.on('pageerror', (e) => errors.push(`${e.message}\n    ${(e.stack || '').split('\n').slice(1, 3).join('\n    ')}`));
tab.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

let frame = { width: 1080, height: 1350 };
try {
  await tab.setViewportSize(frame);
  await tab.goto(url);
  await tab.waitForFunction(() => window.ready === true, null, { timeout: 20000 });
  frame = await tab.evaluate(() => window.frame || { width: 1080, height: 1350 });
} catch (e) {
  console.error(`the page never set window.ready: ${e.message.split('\n')[0]}`);
  console.error(errors.length ? errors.join('\n') : 'no page errors were reported; check that fonts load and that window.ready is set');
  await browser.close();
  server.close();
  process.exit(1);
}

const shoot = async (t, file) => {
  await tab.evaluate((x) => window.seek(x), t);
  await tab.setViewportSize(frame);
  await tab.screenshot({ path: file, scale: 'css' });
};

if (mode === 'check') {
  const duration = await tab.evaluate(() => window.duration);
  for (let t = 0; t <= duration; t += 0.25) await tab.evaluate((x) => window.seek(x), t);
  console.log(`${path.basename(page)}: ${frame.width}x${frame.height}, ${duration}s`);
} else if (mode === 'keys') {
  const [outDir, ...times] = rest;
  fs.mkdirSync(outDir, { recursive: true });
  for (const [i, t] of times.map(Number).entries()) await shoot(t, path.join(outDir, `k${String(i).padStart(2, '0')}.png`));
  console.log(`${times.length} keyframes in ${outDir}`);
} else {
  const outDir = rest[0];
  const fps = Number(rest[rest.indexOf('--fps') + 1]) || 60;
  fs.mkdirSync(outDir, { recursive: true });
  const duration = await tab.evaluate(() => window.duration);
  const frames = Math.round(duration * fps);
  for (let f = 0; f <= frames; f++) {
    await shoot(f / fps, path.join(outDir, `${String(f).padStart(5, '0')}.png`));
    if (f % 240 === 0) console.log(`frame ${f}/${frames}`);
  }
  console.log(`${frames + 1} frames at ${fps} fps in ${outDir}`);
}

console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
