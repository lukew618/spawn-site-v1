import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const args = process.argv.slice(2);

function flag(name) {
  const idx = args.indexOf(name);
  if (idx < 0 || !args[idx + 1]) throw new Error(`missing ${name}`);
  return args[idx + 1];
}

const port = Number(flag('--port'));
const siteDir = path.resolve(flag('--site'));
const assetsDir = path.resolve(flag('--assets'));
if (!Number.isInteger(port) || port <= 0) throw new Error('bad port');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function under(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  if (decoded.includes('\0')) return '';
  const full = path.resolve(root, `.${decoded}`);
  const base = path.resolve(root);
  if (full !== base && !full.startsWith(`${base}${path.sep}`)) return '';
  return full;
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  if (url.split('?')[0] === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  let file = '';
  if (url.startsWith('/verify/')) file = under(siteDir, url.slice('/verify'.length));
  else if (url.startsWith('/assets/')) file = under(assetsDir, url.slice('/assets'.length));
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`ready http://127.0.0.1:${port}/verify/home.html`);
});
