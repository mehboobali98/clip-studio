#!/usr/bin/env node
// Live preview: scrub, play and step a scene page in the browser while you edit it.
//
//   node preview.mjs <page.html> [--port 4500]
//
// Reload keeps the current time, so an edit to the page shows up at the same
// moment. Marked moments come out as a ready `capture.mjs keys` command.
import { exec } from 'node:child_process';
import path from 'node:path';
import { here, sceneRoot, serve } from './serve.mjs';

const [pageArg, ...rest] = process.argv.slice(2);
if (!pageArg) {
  console.error('usage: preview.mjs <page.html> [--port 4500]');
  process.exit(1);
}
const port = Number(rest[rest.indexOf('--port') + 1]) || 4500;
const root = sceneRoot(pageArg);
const server = await serve(root, port);
const rel = path.relative(root, path.resolve(pageArg)).split(path.sep).join('/');
const url = `http://127.0.0.1:${server.address().port}/__clip/viewer.html?page=${encodeURIComponent('/' + rel)}&file=${encodeURIComponent(path.resolve(pageArg))}&cap=${encodeURIComponent(path.join(here, 'capture.mjs'))}`;
console.log(`preview: ${url}\nCtrl+C to stop`);
if (!process.env.CLIP_NO_OPEN) {
  if (process.platform === 'darwin') exec(`open "${url}"`);
  else if (process.platform === 'linux') exec(`xdg-open "${url}"`);
}
