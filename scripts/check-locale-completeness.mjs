import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const localeDir = path.join(root, 'locales');
const failures = [];

function parseLocale(file) {
  let raw = fs.readFileSync(file, 'utf8');
  if (raw.startsWith('/*')) raw = raw.slice(raw.indexOf('*/') + 2);
  return JSON.parse(raw);
}

function flatten(obj, prefix = '', out = {}) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, next, out);
    else out[next] = value;
  }
  return out;
}

function tokens(value) {
  return [...String(value).matchAll(/\{\{\s*[\w.]+\s*\}\}/g)].map((match) => match[0].replace(/\s/g, '')).sort();
}

function compare(defaultName, files) {
  const defaults = flatten(parseLocale(path.join(localeDir, defaultName)));
  for (const file of files) {
    const current = flatten(parseLocale(path.join(localeDir, file)));
    for (const [key, source] of Object.entries(defaults)) {
      if (!(key in current)) failures.push(`${file} missing ${key}`);
      else if (current[key] == null || String(current[key]).trim() === '') failures.push(`${file} empty ${key}`);
      else if (tokens(current[key]).join('|') !== tokens(source).join('|')) {
        failures.push(`${file} token mismatch ${key}`);
      }
    }
  }
}

const names = fs.readdirSync(localeDir).filter((file) => file.endsWith('.json'));
compare('en.default.json', names.filter((file) => file.endsWith('.json') && !file.endsWith('.schema.json') && file !== 'en.default.json'));
compare('en.default.schema.json', names.filter((file) => file.endsWith('.schema.json') && file !== 'en.default.schema.json'));

if (failures.length) {
  console.error(failures.slice(0, 30).join('\n'));
  console.error(`locale completeness failed: ${failures.length}`);
  process.exit(1);
}
console.log('locale completeness ok');
