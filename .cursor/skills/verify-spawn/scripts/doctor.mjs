import fs from 'node:fs';
import path from 'node:path';
import { PAGES } from './render.mjs';
import { currentEnvPath, pidAlive, readCurrent } from './paths.mjs';
import { redact } from './redact.mjs';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ownsPort(pid, port) {
  const hexPort = Number(port).toString(16).toUpperCase().padStart(4, '0');
  const inodes = [];
  for (const table of ['/proc/net/tcp', '/proc/net/tcp6']) {
    if (!fs.existsSync(table)) continue;
    for (const line of fs.readFileSync(table, 'utf8').split('\n').slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 10 || parts[3] !== '0A') continue;
      const localPort = (parts[1].split(':')[1] || '').toUpperCase();
      if (localPort === hexPort) inodes.push(parts[9]);
    }
  }
  if (!inodes.length) return false;
  const fdDir = `/proc/${pid}/fd`;
  if (!fs.existsSync(fdDir)) return false;
  for (const fd of fs.readdirSync(fdDir)) {
    try {
      const target = fs.readlinkSync(path.join(fdDir, fd));
      if (inodes.some((inode) => target === `socket:[${inode}]`)) return true;
    } catch {
      // A descriptor can disappear while we read it.
    }
  }
  return false;
}

const current = readCurrent();
const envText = fs.readFileSync(currentEnvPath, 'utf8');
if (redact(envText) !== envText) fail('verification instance file contains a secret');
if (!pidAlive(current.PID)) fail(`verification server ${current.PID} is not running`);
if (!ownsPort(current.PID, current.PORT)) fail(`port ${current.PORT} is not owned by pid ${current.PID}`);

for (const page of PAGES) {
  const url = `http://127.0.0.1:${current.PORT}${page.href || `/verify/${page.id}.html`}`;
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    fail(`${url} did not answer: ${error.message}`);
  }
  if (!response.ok) fail(`${url} returned ${response.status}`);
  const body = await response.text();
  if (!body.includes('Spawn Fly Fish') || !body.includes('data-section-type') || !body.includes(`data-nav="${page.id}"`)) {
    fail(`${page.id} is not the offline template render`);
  }
}

console.log(`doctor ok ${current.PORT} ${current.EVIDENCE}`);
