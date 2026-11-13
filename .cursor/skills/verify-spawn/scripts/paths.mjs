import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(scriptDir, '../../../..');
export const skillRoot = path.resolve(scriptDir, '..');
export const currentEnvPath = '/tmp/spawn-verify-current.env';
export const latestPath = '/tmp/spawn-verify-latest.txt';

export function readCurrent() {
  if (!fs.existsSync(currentEnvPath)) {
    throw new Error('No verification instance is recorded. Run launch.sh first.');
  }
  const data = {};
  for (const line of fs.readFileSync(currentEnvPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    data[line.slice(0, idx)] = line.slice(idx + 1);
  }
  for (const key of ['RUN_ID', 'PID', 'PORT', 'EVIDENCE', 'THEME_ROOT', 'SITE']) {
    if (!data[key]) throw new Error(`verification instance is missing ${key}`);
  }
  return data;
}

export function writeCurrent(data) {
  const lines = ['RUN_ID', 'PID', 'PORT', 'EVIDENCE', 'THEME_ROOT', 'SITE'].map((key) => {
    const value = String(data[key] ?? '');
    if (value.includes('\n') || value.includes('=')) throw new Error(`refusing unsafe ${key}`);
    return `${key}=${value}`;
  });
  fs.writeFileSync(currentEnvPath, `${lines.join('\n')}\n`);
}

export function pidAlive(pid) {
  const id = Number(pid);
  if (!Number.isInteger(id) || id <= 0) return false;
  try {
    process.kill(id, 0);
    return true;
  } catch {
    return false;
  }
}
