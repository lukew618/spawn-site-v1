import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(process.argv[2] && process.argv[2] !== '--self-test' ? process.argv[2] : path.resolve(import.meta.dirname, '..'));

function rootProblem(themeRoot) {
  const layout = path.join(themeRoot, 'layout', 'theme.liquid');
  const locale = path.join(themeRoot, 'locales', 'en.default.json');
  if (!fs.existsSync(layout) || !fs.existsSync(locale)) {
    return `Refusing theme check for ${themeRoot}: it has no layout/theme.liquid and locales/en.default.json. An empty directory makes Shopify theme check exit 0 with no offenses.`;
  }
  return '';
}

if (process.argv.includes('--self-test')) {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'spawn-empty-theme-'));
  const problem = rootProblem(empty);
  fs.rmSync(empty, { recursive: true, force: true });
  if (!problem) {
    console.error('empty-root guard failed open');
    process.exit(1);
  }
  console.log('empty-root guard ok');
}

const problem = rootProblem(root);
if (problem) {
  console.error(problem);
  process.exit(2);
}

const result = spawnSync('shopify', ['theme', 'check', '--path', root, '--no-color', '-o', 'json'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
if (!result.stdout) {
  console.error(result.stderr || 'theme check produced no JSON');
  process.exit(result.status || 1);
}
const report = JSON.parse(result.stdout);
const counts = { error: 0, warning: 0, info: 0 };
for (const file of report) {
  for (const offense of file.offenses || []) counts[offense.severity] = (counts[offense.severity] || 0) + 1;
}
console.log(JSON.stringify({ root, exit: result.status, ...counts }, null, 2));
if ((counts.error || 0) !== 0 || result.status !== 0) process.exit(1);
