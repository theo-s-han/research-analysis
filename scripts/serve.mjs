import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { root } from './lib.mjs';

const directory = path.join(root, 'dist');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 4173;
const baseArg = args.includes('--base') ? args[args.indexOf('--base') + 1] : '/';
const base = '/' + baseArg.split('/').filter(Boolean).join('/') + (baseArg === '/' ? '' : '/');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.pdf': 'application/pdf', '.csv': 'text/csv; charset=utf-8', '.gif': 'image/gif' };
await fs.access(path.join(directory, 'index.html'));
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const url = new URL(req.url, 'http://127.0.0.1');
    if (base !== '/' && url.pathname === base.slice(0, -1)) { res.writeHead(302, { Location: base }); res.end(); return; }
    if (!url.pathname.startsWith(base)) { res.writeHead(404); res.end('Not found'); return; }
    const requested = decodeURIComponent(url.pathname.slice(base.length));
    const file = path.resolve(directory, requested);
    const relative = path.relative(directory, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || requested.split(/[\\/]/).some((part) => part.startsWith('.'))) { res.writeHead(403); res.end('Forbidden'); return; }
    const stat = await fs.stat(file).catch(() => null);
    let target = file;
    if (stat?.isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(302, { Location: url.pathname + '/' + url.search }); res.end(); return; }
      target = path.join(file, 'index.html');
    }
    const bytes = await fs.readFile(target).catch(() => null);
    if (!bytes) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(await fs.readFile(path.join(directory, '404.html'))); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) { res.writeHead(400); res.end('Invalid request'); }
});
server.on('error', (error) => { console.error(error.message); process.exit(1); });
server.listen(port, '127.0.0.1', () => console.log(`게시판 미리보기: http://127.0.0.1:${port}${base}`));
