import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pidAlive, readCurrent } from './paths.mjs';

function fail(message) {
  console.error(message);
  process.exit(1);
}

let current;
try {
  current = readCurrent();
} catch {
  process.exit(0);
}

if (pidAlive(current.PID)) {
  try {
    process.kill(-Number(current.PID), 'SIGTERM');
  } catch {
    try {
      process.kill(Number(current.PID), 'SIGTERM');
    } catch {
      // The server already exited.
    }
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!pidAlive(current.PID)) break;
    execFileSync('sleep', ['0.1']);
  }
  if (pidAlive(current.PID)) {
    try {
      process.kill(-Number(current.PID), 'SIGKILL');
    } catch {
      try {
        process.kill(Number(current.PID), 'SIGKILL');
      } catch {
        fail(`could not stop verification server ${current.PID}`);
      }
    }
  }
}

const runDir = path.join('/tmp/spawn-verify-runs', current.RUN_ID);
fs.rmSync(runDir, { recursive: true, force: true });
fs.rmSync('/tmp/spawn-verify-current.env', { force: true });
if (!fs.existsSync(path.join(current.EVIDENCE, 'result.txt'))) {
  fail('cleanup removed the evidence result');
}
console.log(`cleaned pid ${current.PID}; evidence remains at ${current.EVIDENCE}`);
