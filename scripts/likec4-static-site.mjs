import { createReadStream, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLikeC4 } from './run-likec4.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceDir = join(root, 'architecture');
const outDir = join(sourceDir, 'dist');
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';
const mode = process.argv.includes('--watch') ? 'watch' : 'serve';

const clients = new Set();
let building = false;
let rebuildQueued = false;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2'
};

async function build() {
  if (building) {
    rebuildQueued = true;
    return;
  }
  building = true;
  try {
    await mkdir(outDir, { recursive: true });
    await runLikeC4([
      'build',
      'architecture',
      '-o',
      'architecture/dist',
      '--use-hash-history',
      '--title',
      'Travel Architecture'
    ]);
    injectLiveReload();
    notifyReload();
  } finally {
    building = false;
    if (rebuildQueued) {
      rebuildQueued = false;
      setTimeout(() => void build().catch(reportBuildError), 100);
    }
  }
}

function injectLiveReload() {
  const indexPath = join(outDir, 'index.html');
  if (!existsSync(indexPath)) return;
  const html = readFileSync(indexPath, 'utf8');
  if (html.includes('/__events')) return;
  const snippet = `<script>
(() => {
  const events = new EventSource('/__events');
  events.addEventListener('reload', () => location.reload());
})();
</script>`;
  writeFileSync(indexPath, html.replace('</body>', `${snippet}</body>`));
}

function notifyReload() {
  for (const res of clients) {
    res.write('event: reload\\ndata: now\\n\\n');
  }
}

function reportBuildError(error) {
  console.error(error.message);
}

function safePath(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  const candidate = resolve(outDir, clean || 'index.html');
  return relative(outDir, candidate).startsWith('..') ? join(outDir, 'index.html') : candidate;
}

function startServer() {
  const server = createServer((req, res) => {
    if (req.url === '/__events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.write('\\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    let filePath = safePath(req.url || '/');
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(outDir, 'index.html');
    }
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  });

  server.listen(port, host, () => {
    console.log(`LikeC4 static site: http://${host}:${port}/#/view/travel_online_us_air_booking_flow/`);
  });
}

function snapshot(dir) {
  const result = new Map();
  const walk = current => {
    if (current.startsWith(outDir)) return;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (fullPath.startsWith(outDir)) continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.c4') || entry.name.endsWith('.json') || entry.name.endsWith('.md')) {
        result.set(fullPath, statSync(fullPath).mtimeMs);
      }
    }
  };
  walk(dir);
  return result;
}

function startPollingWatcher() {
  let last = snapshot(sourceDir);
  setInterval(() => {
    const next = snapshot(sourceDir);
    const changed =
      next.size !== last.size ||
      [...next].some(([file, mtime]) => last.get(file) !== mtime);
    if (changed) {
      last = next;
      void build().catch(reportBuildError);
    }
  }, 1000);
}

if (mode === 'watch') {
  await build();
  startServer();
  startPollingWatcher();
} else {
  if (!existsSync(join(outDir, 'index.html'))) {
    await build();
  } else {
    injectLiveReload();
  }
  startServer();
}
