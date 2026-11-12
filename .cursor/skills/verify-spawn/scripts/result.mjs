import fs from 'node:fs';
import path from 'node:path';
import { redact } from './redact.mjs';

export function beginEvidence(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'result.txt'), 'FAIL\n');
}

export function writeResult(dir, status, details = []) {
  if (status !== 'PASS' && status !== 'FAIL') throw new Error('result status must be PASS or FAIL');
  const lines = [status, ...details.filter((line) => line !== undefined && line !== '')];
  const body = `${redact(lines.join('\n'))}\n`;
  if (!body.startsWith(`${status}\n`) && body !== `${status}\n`) {
    throw new Error(`refusing to write ${status}`);
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'result.txt'), body);
}

export function readResult(dir) {
  return fs.readFileSync(path.join(dir, 'result.txt'), 'utf8');
}
