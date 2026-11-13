import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from './paths.mjs';
import { scanForSecrets } from './redact.mjs';
import { readResult } from './result.mjs';
import { runFenceTests } from './test-fences.mjs';
import { runThemeCheck } from './theme-check.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mutationFile = path.join(repoRoot, 'sections', 'verify-spawn-mutation.liquid');
const evidenceRoot = path.join('/tmp/spawn-verify-evidence', `mutation-${process.pid}`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (fs.existsSync(mutationFile)) {
  throw new Error('refusing to mutate: sections/verify-spawn-mutation.liquid already exists');
}

fs.mkdirSync(evidenceRoot, { recursive: true });
runFenceTests();

const liveEvidence = path.join(evidenceRoot, 'live-theme');
const sentinel = path.join(evidenceRoot, 'shopify-called');
const bin = path.join(evidenceRoot, 'fake-shopify.sh');
fs.writeFileSync(bin, `#!/bin/sh\necho called >> ${JSON.stringify(sentinel)}\nexit 0\n`);
fs.chmodSync(bin, 0o755);
const live = spawnSync(process.execPath, [
  path.join(scriptDir, 'preview.mjs'),
  '--theme', '143738535999',
  '--execute',
  '--evidence', liveEvidence,
], {
  encoding: 'utf8',
  env: {
    ...process.env,
    SPAWN_VERIFY_ALLOW_FAKE_SHOPIFY: '1',
    SPAWN_VERIFY_SHOPIFY_BIN: bin,
  },
});
assert(live.status !== 0, 'targeting the live theme exited 0');
assert(readResult(liveEvidence).startsWith('FAIL\n'), 'targeting the live theme did not write FAIL');
assert(fs.readFileSync(path.join(liveEvidence, 'shopify-spawn-count.txt'), 'utf8').trim() === '0', 'targeting the live theme spawned shopify');
assert(!fs.existsSync(sentinel), 'targeting the live theme invoked shopify');

const liquidEvidence = path.join(evidenceRoot, 'liquid-syntax');
let liquidFailed = false;
try {
  fs.writeFileSync(mutationFile, '{% if verify_spawn_mutation %}\n');
  try {
    runThemeCheck({ themeRoot: repoRoot, evidenceDir: liquidEvidence });
  } catch {
    liquidFailed = true;
  }
  const result = readResult(liquidEvidence);
  const report = fs.readFileSync(path.join(liquidEvidence, 'theme-check.json'), 'utf8');
  assert(liquidFailed, 'the liquid syntax error did not fail theme check');
  assert(result.startsWith('FAIL\n'), 'the liquid syntax error did not write FAIL');
  assert(report.includes('verify-spawn-mutation.liquid'), 'theme check did not report the mutated section');
  assert(/"severity"\s*:\s*"error"/.test(report), 'theme check did not record an error severity');
} finally {
  fs.rmSync(mutationFile, { force: true });
}
assert(!fs.existsSync(mutationFile), 'the mutated section was not removed');

scanForSecrets(evidenceRoot);
const summary = [
  `evidence=${evidenceRoot}`,
  'live-theme=FAIL',
  'liquid-syntax=FAIL',
  'shopify-invocations=0',
  'restored=true',
].join('\n');
fs.writeFileSync(path.join(evidenceRoot, 'summary.txt'), `${summary}\n`);
console.log(summary);
