import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const localeDir = path.join(root, 'locales');
const gapDir = path.join(root, 'scripts', 'locale-gaps');

const schemaKeysFromStorefront = [
  'sections.river_conditions.name',
  'sections.river_conditions.settings.header_layout.content',
  'sections.river_conditions.settings.header_layout.info',
  'sections.river_conditions.settings.header_products.content',
  'sections.river_conditions.blocks.river_link.name',
  'sections.river_conditions.blocks.river_link.settings.url.label',
  'sections.river_conditions.blocks.river_link.settings.label.label',
];

function parseLocale(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const header = raw.startsWith('/*') ? raw.slice(0, raw.indexOf('*/') + 2) + '\n' : '';
  const body = raw.startsWith('/*') ? raw.slice(raw.indexOf('*/') + 2) : raw;
  return { header, data: JSON.parse(body), raw };
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

function setPath(obj, dotted, value) {
  const parts = dotted.split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (cursor[parts[i]] == null || typeof cursor[parts[i]] !== 'object' || Array.isArray(cursor[parts[i]])) {
      cursor[parts[i]] = {};
    }
    cursor = cursor[parts[i]];
  }
  const leaf = parts.at(-1);
  if (cursor[leaf] === undefined) cursor[leaf] = value;
}

function tokens(value) {
  return [...String(value).matchAll(/\{\{\s*[\w.]+\s*\}\}/g)].map((match) => match[0].replace(/\s/g, '')).sort();
}

const dictionary = new Map();
for (const file of fs.readdirSync(gapDir)) {
  if (!file.startsWith('part-')) continue;
  for (const row of JSON.parse(fs.readFileSync(path.join(gapDir, file), 'utf8'))) {
    dictionary.set(row.en, row.tr);
  }
}

const storefront = parseLocale(path.join(localeDir, 'en.default.json'));
const storefrontFlat = flatten(storefront.data);
const schema = parseLocale(path.join(localeDir, 'en.default.schema.json'));
for (const key of schemaKeysFromStorefront) setPath(schema.data, key, storefrontFlat[key]);
const schemaNext = schema.header + JSON.stringify(schema.data, null, 2) + '\n';
if (schemaNext !== schema.raw) fs.writeFileSync(path.join(localeDir, 'en.default.schema.json'), schemaNext);

const files = fs.readdirSync(localeDir).filter((file) => file.endsWith('.json'));
const unresolved = [];
let added = 0;

for (const file of files) {
  const full = path.join(localeDir, file);
  const parsed = parseLocale(full);
  if (file === 'en.default.json' || file === 'en.default.schema.json') continue;
  const englishName = file.endsWith('.schema.json') ? 'en.default.schema.json' : 'en.default.json';
  const english = flatten(parseLocale(path.join(localeDir, englishName)).data);
  const current = flatten(parsed.data);
  const language = file.replace(/\.schema\.json$|\.json$/g, '');
  const localByEnglish = new Map();
  for (const [key, source] of Object.entries(english)) {
    if (!(key in current)) continue;
    const list = localByEnglish.get(source) || new Set();
    list.add(current[key]);
    localByEnglish.set(source, list);
  }
  for (const [key, source] of Object.entries(english)) {
    if (key in current) continue;
    const local = localByEnglish.get(source);
    let value;
    let sourceName;
    if (local && local.size === 1 && tokens([...local][0]).join('|') === tokens(source).join('|')) {
      value = [...local][0];
      sourceName = 'existing-locale';
    } else if (dictionary.has(source) && dictionary.get(source)[language]) {
      value = dictionary.get(source)[language];
      sourceName = 'translated-label';
    }
    if (value == null) {
      unresolved.push({ file, key, source });
      continue;
    }
    if (tokens(value).join('|') !== tokens(source).join('|')) {
      unresolved.push({ file, key, source, problem: 'token-mismatch', value });
      continue;
    }
    setPath(parsed.data, key, value);
    added += 1;
    if (sourceName === 'existing-locale') {
      const list = localByEnglish.get(source) || new Set();
      list.add(value);
      localByEnglish.set(source, list);
    }
  }
  const next = parsed.header + JSON.stringify(parsed.data, null, 2) + '\n';
  if (next !== parsed.raw) fs.writeFileSync(full, next);
}

if (unresolved.length) {
  console.error(JSON.stringify(unresolved.slice(0, 20), null, 2));
  console.error(`unresolved ${unresolved.length}`);
  process.exit(1);
}
console.log(JSON.stringify({ added }, null, 2));
