#!/usr/bin/env node
// Capture a scene page frame by frame.
//
//   node capture.mjs <page.html> check                    page errors, size, duration
//   node capture.mjs <page.html> lint                     determinism, text size, text off-frame
//   node capture.mjs <page.html> keys <outdir> <t> [...]  keyframes
//   node capture.mjs <page.html> all <outdir> [--fps 60]  every frame, for encode.sh
//   node capture.mjs <page.html> srt <out.srt>            captions from window.captions
//
// The page sets window.ready once fonts are loaded and exposes window.seek(t)
// and window.duration. Optional: window.frame = { width, height } (default
// 1080x1350), window.captions = [{ from, to, text }], window.lintSkip =
// [[from, to], ...] for transitions where text is meant to be small or moving.
//
// The viewport is re-pinned before every screenshot: a long capture can
// otherwise lose it and crop every frame after.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadPlaywright, pageUrl, sceneRoot, serve } from './serve.mjs';

const MODES = ['check', 'lint', 'keys', 'all', 'srt'];
const [pageArg, mode, ...rest] = process.argv.slice(2);
if (!pageArg || !MODES.includes(mode)) {
  console.error('usage: capture.mjs <page.html> check | lint | keys <outdir> <t>... | all <outdir> [--fps 60] | srt <out.srt>');
  process.exit(1);
}
const root = sceneRoot(pageArg);
const { chromium } = await loadPlaywright();
const server = await serve(root);
const browser = await chromium.launch();
const tab = await browser.newPage();
const errors = [];
tab.on('pageerror', (e) => errors.push(`${e.message}\n    ${(e.stack || '').split('\n').slice(1, 3).join('\n    ')}`));
tab.on('console', (m) => {
  // A template asks for an optional brand.json; its absence is not an error.
  if (m.type() === 'error' && !(m.location().url || '').endsWith('/brand.json')) errors.push(m.text());
});

async function finish(code) {
  await browser.close();
  server.close();
  process.exit(code);
}

let frame = { width: 1080, height: 1350 };
try {
  await tab.setViewportSize(frame);
  await tab.goto(pageUrl(server, root, pageArg, '?t=0'));
  await tab.waitForFunction(() => window.ready === true, null, { timeout: 20000 });
  frame = await tab.evaluate(() => window.frame || { width: 1080, height: 1350 });
  await tab.setViewportSize(frame);
} catch (e) {
  console.error(`the page never set window.ready: ${e.message.split('\n')[0]}`);
  console.error(errors.length ? errors.join('\n') : 'no page errors were reported; check that fonts load and that window.ready is set');
  await finish(1);
}

const duration = await tab.evaluate(() => window.duration);
const seek = (t) => tab.evaluate((x) => window.seek(x), t);
const shot = async (t, file) => {
  await seek(t);
  await tab.setViewportSize(frame);
  return tab.screenshot({ path: file, scale: 'css' });
};
const digest = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

if (mode === 'check') {
  for (let t = 0; t <= duration; t += 0.25) await seek(t);
  console.log(`${path.basename(pageArg)}: ${frame.width}x${frame.height}, ${duration}s`);
} else if (mode === 'keys') {
  const [outDir, ...times] = rest;
  fs.mkdirSync(outDir, { recursive: true });
  for (const [i, t] of times.map(Number).entries()) await shot(t, path.join(outDir, `k${String(i).padStart(2, '0')}.png`));
  console.log(`${times.length} keyframes in ${outDir}`);
} else if (mode === 'all') {
  const outDir = rest[0];
  const fps = Number(rest[rest.indexOf('--fps') + 1]) || 60;
  fs.mkdirSync(outDir, { recursive: true });
  const frames = Math.round(duration * fps);
  for (let f = 0; f <= frames; f++) {
    await shot(f / fps, path.join(outDir, `${String(f).padStart(5, '0')}.png`));
    if (f % 240 === 0) console.log(`frame ${f}/${frames}`);
  }
  console.log(`${frames + 1} frames at ${fps} fps in ${outDir}`);
} else if (mode === 'srt') {
  const cues = await tab.evaluate(() => window.captions);
  if (!Array.isArray(cues) || !cues.length) {
    console.error('this page sets no window.captions = [{ from, to, text }]');
    await finish(1);
  }
  const stamp = (s) => {
    const ms = Math.round(s * 1000);
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
  };
  const srt = cues.map((c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${c.text}\n`).join('\n');
  fs.writeFileSync(rest[0], srt);
  console.log(`${cues.length} captions in ${rest[0]}`);
} else {
  const skip = (await tab.evaluate(() => window.lintSkip)) || [];
  const skipped = (t) => skip.some(([a, b]) => t >= a && t <= b);
  const samples = [];
  for (let i = 1; i <= 12; i++) {
    const t = +(duration * i / 13).toFixed(2);
    if (!skipped(t)) samples.push(t);
  }
  const problems = [];

  // Determinism: the same t must give the same frame, whatever was shown before
  // it. Compared with a tolerance, because the renderer may anti-alias an edge a
  // shade differently between two paints of an identical page; a real fault moves
  // or changes far more than 0.1% of the frame.
  const differing = (a, b) => tab.evaluate(async ([x, y]) => {
    const load = (src) => new Promise((done) => { const img = new Image(); img.onload = () => done(img); img.src = src; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const pixels = (img) => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      return g.getImageData(0, 0, c.width, c.height).data;
    };
    const [pa, pb] = [pixels(ia), pixels(ib)];
    let off = 0;
    for (let i = 0; i < pa.length; i += 4) {
      if (Math.abs(pa[i] - pb[i]) + Math.abs(pa[i + 1] - pb[i + 1]) + Math.abs(pa[i + 2] - pb[i + 2]) > 48) off++;
    }
    return off / (pa.length / 4);
  }, [`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${b.toString('base64')}`]);
  for (const t of samples.slice(0, 6)) {
    const first = await shot(t);
    await seek(duration);
    await seek(0);
    await seek(Math.max(0, t - 1.7));
    const second = await shot(t);
    const share = digest(first) === digest(second) ? 0 : await differing(first, second);
    if (share > 0.001) problems.push(`not deterministic: t=${t}s renders ${(share * 100).toFixed(2)}% differently depending on what was shown before`);
  }

  // Text: readable on a phone, and inside the frame.
  const minPx = 20 * frame.width / 1080;
  for (const t of samples) {
    await seek(t);
    const found = await tab.evaluate(({ minPx, w, h }) => {
      const out = [];
      const opacityOf = (el) => {
        let o = 1;
        for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
          const cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
          o *= parseFloat(cs.opacity || '1') * parseFloat(n.getAttribute?.('opacity') ?? '1');
        }
        return o;
      };
      const nodes = [...document.querySelectorAll('text, tspan, p, h1, h2, h3, span, div, li')]
        .filter((el) => [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()));
      for (const el of nodes) {
        if (el.closest('[data-lint="decor"]') || opacityOf(el) < 0.5) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || r.right < 0 || r.bottom < 0 || r.left > w || r.top > h) continue;
        let size = parseFloat(getComputedStyle(el).fontSize);
        if (el instanceof SVGElement && el.getScreenCTM) size *= Math.abs(el.getScreenCTM()?.a || 1);
        const text = el.textContent.trim().slice(0, 40);
        if (size < minPx - 0.5) out.push(`small text (${size.toFixed(0)}px < ${minPx.toFixed(0)}px): "${text}"`);
        if (r.left < -2 || r.right > w + 2) out.push(`text runs off the frame: "${text}"`);
      }
      return out;
    }, { minPx, w: frame.width, h: frame.height });
    for (const f of new Set(found)) problems.push(`t=${t}s ${f}`);
  }

  const unique = [...new Set(problems)];
  console.log(`linted ${samples.length} moments${skip.length ? ` (skipping ${skip.map(([a, b]) => `${a.toFixed(1)}-${b.toFixed(1)}s`).join(', ')})` : ''}`);
  console.log(unique.length ? unique.slice(0, 40).join('\n') + (unique.length > 40 ? `\n... and ${unique.length - 40} more` : '') : 'no lint problems');
  if (unique.some((p) => p.startsWith('not deterministic'))) errors.push('determinism check failed');
}

console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors');
await finish(errors.length ? 1 : 0);
