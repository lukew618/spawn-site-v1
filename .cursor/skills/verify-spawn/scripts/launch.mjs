import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrubbedEnv } from './fences.mjs';
import { currentEnvPath, latestPath, pidAlive, repoRoot, writeCurrent } from './paths.mjs';
import { redact, scanForSecrets } from './redact.mjs';
import { beginEvidence } from './result.mjs';
import { writeSite } from './render.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (fs.existsSync(currentEnvPath)) {
  const text = fs.readFileSync(currentEnvPath, 'utf8');
  const pid = (text.match(/^PID=(\d+)$/m) || [])[1];
  if (pid && pidAlive(pid)) fail('A verification instance is already running. Run cleanup.sh before launching another.');
  fs.rmSync(currentEnvPath, { force: true });
}

const runId = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}-${process.pid}`;
const evidenceDir = process.env.SPAWN_VERIFY_EVIDENCE
  ? path.resolve(process.env.SPAWN_VERIFY_EVIDENCE)
  : path.join('/tmp/spawn-verify-evidence', runId);
const siteDir = path.join(evidenceDir, 'site');
beginEvidence(evidenceDir);
writeSite(repoRoot, siteDir);

const port = await freePort(4296);
const logPath = path.join(evidenceDir, 'server.log');
const logFd = fs.openSync(logPath, 'a');
const child = spawn(process.execPath, [
  path.join(scriptDir, 'server.mjs'),
  '--port', String(port),
  '--site', siteDir,
  '--assets', path.join(repoRoot, 'assets'),
], {
  detached: true,
  stdio: ['ignore', logFd, logFd],
  env: scrubbedEnv(process.env, { includeToken: false }),
  cwd: repoRoot,
});
child.unref();
fs.closeSync(logFd);

const readyUrl = `http://127.0.0.1:${port}/verify/home.html`;
let ready = false;
for (let attempt = 0; attempt < 50; attempt += 1) {
  if (!pidAlive(child.pid)) break;
  try {
    const response = await fetch(readyUrl);
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {
    // The server is still binding.
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
}
if (!ready) {
  try { process.kill(child.pid, 'SIGKILL'); } catch { /* already exited */ }
  fail(`verification server did not become ready at ${readyUrl}`);
}

writeCurrent({
  RUN_ID: runId,
  PID: String(child.pid),
  PORT: String(port),
  EVIDENCE: evidenceDir,
  THEME_ROOT: repoRoot,
  SITE: siteDir,
});
const envText = fs.readFileSync(currentEnvPath, 'utf8');
if (redact(envText) !== envText) {
  try { process.kill(child.pid, 'SIGKILL'); } catch { /* already exited */ }
  fail('verification instance file contains a secret');
}
scanForSecrets(evidenceDir);
fs.writeFileSync(latestPath, `${evidenceDir}\n`);
console.log(`evidence=${evidenceDir}`);
console.log(`url=${readyUrl}`);

function freePort(start) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(freePort(start + 1));
    });
    server.listen(start, '127.0.0.1', () => {
      const chosen = server.address().port;
      server.close(() => resolve(chosen));
    });
  });
}
