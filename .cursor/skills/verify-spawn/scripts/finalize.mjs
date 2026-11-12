import fs from 'node:fs';
import path from 'node:path';
import { pngSize } from './chrome.mjs';
import { readCurrent } from './paths.mjs';
import { scanForSecrets } from './redact.mjs';
import { readResult, writeResult } from './result.mjs';
import { PAGES } from './render.mjs';

function fail(message) {
  const current = readCurrent();
  writeResult(current.EVIDENCE, 'FAIL', [message]);
  console.error(message);
  process.exit(1);
}

const current = readCurrent();
const theme = readResult(path.join(current.EVIDENCE, 'theme-check'));
if (!theme.startsWith('PASS\n')) fail('theme check did not pass');
for (const page of PAGES) {
  const result = readResult(path.join(current.EVIDENCE, page.id));
  if (!result.startsWith('PASS\n')) fail(`${page.id} did not pass`);
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const size = pngSize(path.join(current.EVIDENCE, page.id, `${name}.png`));
    if (size.width !== width || size.height !== height) fail(`${page.id} ${name} screenshot is ${size.width}x${size.height}`);
  }
}
const previewPath = path.join(current.EVIDENCE, 'preview.txt');
const previewResult = path.join(current.EVIDENCE, 'preview', 'result.txt');
const previewText = fs.existsSync(previewPath) ? fs.readFileSync(previewPath, 'utf8') : '';
const uploaded = fs.existsSync(previewResult) ? fs.readFileSync(previewResult, 'utf8') : '';
if (!previewText.startsWith('preview mode skipped:') && !uploaded.startsWith('PASS\n')) {
  fail('preview mode did not skip or pass');
}
scanForSecrets(current.EVIDENCE);
const themeSummary = JSON.parse(fs.readFileSync(path.join(current.EVIDENCE, 'theme-check', 'summary.json'), 'utf8'));
writeResult(current.EVIDENCE, 'PASS', [
  `errors=${themeSummary.errors}`,
  `warnings=${themeSummary.warnings}`,
  'static-render pages=5',
  previewText.trim() || 'preview uploaded',
]);
console.log(fs.readFileSync(path.join(current.EVIDENCE, 'result.txt'), 'utf8').trim());
