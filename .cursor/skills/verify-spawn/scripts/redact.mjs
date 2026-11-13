import fs from 'node:fs';
import path from 'node:path';

const TOKEN_PATTERNS = [
  /shpat_[A-Za-z0-9]+/g,
  /shptka_[A-Za-z0-9_]+/g,
  /shpss_[A-Za-z0-9]+/g,
  /shpca_[A-Za-z0-9]+/g,
  /shpua_[A-Za-z0-9]+/g,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
];

const SECRET_KEY = /TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY|ACCESS_KEY|CREDENTIAL/i;
const NOT_A_SECRET_VALUE_KEY = /^(SHOPIFY_FLAG_STORE|SPAWN_VERIFY_THEME_ID|SHOPIFY_FLAG_THEME)$/;

export function secretValues(env = process.env) {
  const values = [];
  for (const [key, value] of Object.entries(env)) {
    if (!value || value.length < 12) continue;
    if (NOT_A_SECRET_VALUE_KEY.test(key)) continue;
    if (!SECRET_KEY.test(key)) continue;
    values.push(value);
  }
  return [...new Set(values)].sort((a, b) => b.length - a.length);
}

export function redact(text, env = process.env) {
  let out = String(text ?? '');
  for (const value of secretValues(env)) {
    if (out.includes(value)) out = out.split(value).join('[REDACTED]');
  }
  for (const pattern of TOKEN_PATTERNS) out = out.replace(pattern, '[REDACTED]');
  return out;
}

export function scanForSecrets(dir, env = process.env) {
  const secrets = secretValues(env);
  const patterns = TOKEN_PATTERNS.map((pattern) => new RegExp(pattern.source));
  const hits = [];
  walk(dir, (file) => {
    const buf = fs.readFileSync(file);
    for (const secret of secrets) {
      if (buf.includes(Buffer.from(secret))) hits.push(path.relative(dir, file) || file);
    }
    const text = buf.toString('utf8');
    for (const pattern of patterns) {
      if (pattern.test(text)) hits.push(path.relative(dir, file) || file);
    }
  });
  if (hits.length) {
    throw new Error(`secret material in evidence: ${[...new Set(hits)].join(', ')}`);
  }
}

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else if (entry.isFile()) visit(full);
  }
}
