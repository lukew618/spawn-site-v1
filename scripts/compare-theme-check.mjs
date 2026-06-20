#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const [baselinePath, headPath] = process.argv.slice(2);
if (!baselinePath || !headPath) {
  console.error('Usage: node scripts/compare-theme-check.mjs BASELINE.json HEAD.json');
  process.exit(2);
}

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const root = process.cwd();

function tuples(report) {
  const result = new Set();
  for (const file of report) {
    const relativePath = path.relative(root, file.path).split(path.sep).join('/');
    for (const offense of file.offenses || []) {
      result.add(JSON.stringify([
        relativePath,
        offense.check,
        offense.message,
        offense.severity,
      ]));
    }
  }
  return result;
}

const baseline = tuples(read(baselinePath));
const head = tuples(read(headPath));
const added = [...head].filter((tuple) => !baseline.has(tuple)).sort();
const removed = [...baseline].filter((tuple) => !head.has(tuple)).sort();
const unchanged = [...head].filter((tuple) => baseline.has(tuple)).length;

console.log(JSON.stringify({ added: added.length, removed: removed.length, unchanged }, null, 2));
if (added.length) {
  console.error('New Theme Check tuples:');
  for (const tuple of added) console.error(`- ${tuple}`);
  process.exit(1);
}

