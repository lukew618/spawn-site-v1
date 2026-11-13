import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrubbedEnv, shopifyExecutable } from './fences.mjs';
import { readCurrent } from './paths.mjs';
import { redact } from './redact.mjs';
import { beginEvidence, writeResult } from './result.mjs';

export function assertThemeRoot(themeRoot) {
  const layout = path.join(themeRoot, 'layout', 'theme.liquid');
  const locale = path.join(themeRoot, 'locales', 'en.default.json');
  if (!fs.existsSync(layout) || !fs.existsSync(locale)) {
    throw new Error(`Refusing theme check for ${themeRoot}: it has no layout/theme.liquid and locales/en.default.json. An empty directory makes Shopify theme check exit 0 with no offenses.`);
  }
}

function parseReport(stdout) {
  const start = stdout.search(/[\[{]/);
  if (start < 0) throw new Error('theme check produced no JSON');
  return JSON.parse(stdout.slice(start));
}

function offensesOf(report) {
  const files = Array.isArray(report) ? report : (report.files || report.offenses || []);
  const offenses = [];
  if (Array.isArray(report) || report.files) {
    for (const file of files) {
      for (const offense of file.offenses || []) {
        offenses.push({
          path: file.path || file.absolute_path || '',
          severity: offense.severity || '',
          check: offense.check || '',
          message: offense.message || '',
        });
      }
    }
    return offenses;
  }
  return [];
}

export function runThemeCheck({ themeRoot, evidenceDir }) {
  beginEvidence(evidenceDir);
  try {
    assertThemeRoot(themeRoot);
  } catch (error) {
    writeResult(evidenceDir, 'FAIL', [error.message]);
    throw error;
  }
  const args = ['theme', 'check', '--path', themeRoot, '--no-color', '--output', 'json', '--fail-level', 'error'];
  const result = spawnSync(shopifyExecutable(), args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: scrubbedEnv(process.env, { includeToken: false }),
  });
  const stdout = redact(result.stdout || '');
  const stderr = redact(result.stderr || '');
  fs.writeFileSync(path.join(evidenceDir, 'theme-check.json'), stdout);
  fs.writeFileSync(path.join(evidenceDir, 'theme-check.stderr.txt'), stderr);
  fs.writeFileSync(path.join(evidenceDir, 'command.txt'), `shopify ${args.join(' ')}\n`);
  let report;
  try {
    report = parseReport(stdout);
  } catch (error) {
    writeResult(evidenceDir, 'FAIL', [error.message]);
    throw error;
  }
  const offenses = offensesOf(report);
  const counts = { error: 0, warning: 0, info: 0, suggestion: 0, style: 0 };
  for (const offense of offenses) counts[offense.severity] = (counts[offense.severity] || 0) + 1;
  const summary = {
    exit: result.status,
    errors: counts.error || 0,
    warnings: counts.warning || 0,
    info: counts.info || 0,
  };
  fs.writeFileSync(path.join(evidenceDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  const samples = offenses
    .filter((offense) => offense.severity === 'error')
    .slice(0, 20)
    .map((offense) => `${offense.path}: ${offense.message}`);
  if ((counts.error || 0) > 0 || result.status !== 0) {
    writeResult(evidenceDir, 'FAIL', [`errors=${counts.error || 0}`, `warnings=${counts.warning || 0}`, ...samples]);
    throw new Error(`theme check reported ${counts.error || 0} errors`);
  }
  writeResult(evidenceDir, 'PASS', [`errors=0`, `warnings=${counts.warning || 0}`]);
  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const current = readCurrent();
  try {
    runThemeCheck({
      themeRoot: current.THEME_ROOT,
      evidenceDir: path.join(current.EVIDENCE, 'theme-check'),
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
