// A private localhost server for a scene page and its neighbours, shared by
// capture.mjs and preview.mjs. Serves the folder above the page, so a page
// can reach a sibling assets folder, plus the plugin's own viewer under /__clip/.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const pluginRoot = path.resolve(here, '..', '..', '..');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
};

export function sceneRoot(page) {
  return path.dirname(path.dirname(path.resolve(page)));
}

export function serve(root, port = 0) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const base = rel.startsWith('/__clip/') ? here : root;
    const file = path.join(base, rel.startsWith('/__clip/') ? rel.slice('/__clip/'.length) : rel);
    if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

export function pageUrl(server, root, page, query = '') {
  const rel = path.relative(root, path.resolve(page)).split(path.sep).join('/');
  return `http://127.0.0.1:${server.address().port}/${rel}${query}`;
}

export async function loadPlaywright() {
  for (const base of [path.join(pluginRoot, 'package.json'), path.join(process.cwd(), 'package.json')]) {
    try {
      return createRequire(base)('playwright');
    } catch { /* try the next place */ }
  }
  console.error(`Playwright isn't installed. Run once:\n  npm install --prefix "${pluginRoot}"\n  npx --prefix "${pluginRoot}" playwright install chromium`);
  process.exit(2);
}
