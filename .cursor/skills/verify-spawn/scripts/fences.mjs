export const LIVE_THEME_ID = '143738535999';
const LIVE_THEME_VALUE = 143738535999n;
const CANONICAL_THEME_ID = /^[1-9][0-9]*$/;
export const STORE = 'spawn-fly-fish.myshopify.com';
const ALLOWED_ROLES = new Set(['unpublished', 'development']);
const BLOCKED_ENV = [
  'SHOPIFY_FLAG_ALLOW_LIVE',
  'SHOPIFY_FLAG_LIVE',
  'SHOPIFY_FLAG_PUBLISH',
  'SHOPIFY_FLAG_UNPUBLISHED',
  'SHOPIFY_FLAG_DEVELOPMENT',
  'SHOPIFY_FLAG_THEME_ID',
  'SHOPIFY_FLAG_THEME',
  'SHOPIFY_FLAG_FORCE',
  'SHOPIFY_CLI_TTY',
];

export class FenceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FenceError';
  }
}

export function assertCanonicalThemeId(value) {
  if (value == null || value === '') throw new FenceError('theme push requires an explicit theme id');
  const id = String(value);
  if (!CANONICAL_THEME_ID.test(id)) throw new FenceError('theme id must be a canonical numeric id');
  if (BigInt(id) === LIVE_THEME_VALUE) throw new FenceError(`refusing theme id ${LIVE_THEME_ID}`);
  return id;
}

function mentionsLiveTheme(arg) {
  const text = String(arg);
  const candidates = [text];
  const embedded = text.match(/^(?:--(?:theme|id|theme-id)|-t)=(.*)$/);
  if (embedded) candidates.push(embedded[1]);
  for (const candidate of candidates) {
    if (candidate === LIVE_THEME_ID) return true;
    if (/^[0-9]+$/.test(candidate)) {
      try {
        if (BigInt(candidate) === LIVE_THEME_VALUE) return true;
      } catch {
        // A non-decimal digit string is rejected by the canonical check.
      }
    }
  }
  return false;
}

export function assertThemeAllowed(theme) {
  if (theme == null || theme.id == null || theme.id === '') {
    throw new FenceError('theme push requires an explicit theme id');
  }
  const id = assertCanonicalThemeId(theme.id);
  const role = String(theme.role || '').trim().toLowerCase();
  if (role === 'main' || role === 'live') throw new FenceError(`refusing theme role ${role}`);
  if (!ALLOWED_ROLES.has(role)) throw new FenceError(`refusing theme role ${role || 'unknown'}`);
  const name = String(theme.name || '');
  if (!/^ENG-\S+/.test(name)) throw new FenceError('refusing theme whose name does not start with ENG-');
  return { id, name, role };
}

export function assertArgvSafe(args) {
  const list = args.map(String);
  const forbidden = ['--allow-live', '--live', '--publish', '--unpublished', '--development', '--force', '-l', '-p', '-a', '-u', '-d'];
  for (const flag of forbidden) {
    if (list.includes(flag)) throw new FenceError(`refusing flag ${flag}`);
  }
  if (list.includes('publish') || list.includes('delete') || list.includes('share')) {
    throw new FenceError('refusing publish or delete');
  }
  if (list.some((arg) => mentionsLiveTheme(arg))) throw new FenceError(`refusing theme id ${LIVE_THEME_ID}`);
  for (const flag of ['--theme', '--id']) {
    const index = list.indexOf(flag);
    if (index >= 0) assertCanonicalThemeId(list[index + 1] || '');
  }
  const command = list[0] === 'theme' ? list[1] : '';
  if (command === 'push' || command === 'dev') {
    const themeIdx = list.indexOf('--theme');
    if (themeIdx < 0) throw new FenceError('theme push requires an explicit numeric theme id');
    if (!list.includes('--nodelete')) throw new FenceError('theme push must pass --nodelete');
  }
}

export function assertListedTheme(requested, listed) {
  const wanted = assertCanonicalThemeId(requested);
  const got = listed == null || listed.id == null ? '' : String(listed.id);
  if (got !== wanted) throw new FenceError('theme list id did not match the requested id');
  return assertThemeAllowed({ ...listed, id: got });
}

export function planThemeCommand(action, theme, { root }) {
  if (action === 'publish' || action === 'delete' || action === 'share') {
    throw new FenceError(`refusing theme ${action}`);
  }
  if (action !== 'push' && action !== 'dev' && action !== 'list') {
    throw new FenceError(`refusing theme ${action}`);
  }
  const args = ['theme', action, '--path', root, '--store', STORE, '--no-color'];
  if (action === 'list') {
    args.push('--json');
    if (theme?.id != null && theme.id !== '') {
      args.push('--id', assertCanonicalThemeId(theme.id));
    }
    assertArgvSafe(args);
    return { args };
  }
  const allowed = assertThemeAllowed(theme);
  args.push('--theme', allowed.id, '--nodelete');
  if (action === 'push') args.push('--json');
  if (action === 'dev') args.push('--host', '127.0.0.1');
  assertArgvSafe(args);
  return { args, theme: allowed };
}

export function scrubbedEnv(env, { includeToken = false } = {}) {
  const next = {};
  for (const key of ['PATH', 'HOME', 'USER', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TMPDIR', 'TZ']) {
    if (env[key]) next[key] = env[key];
  }
  next.SHOPIFY_FLAG_STORE = STORE;
  if (includeToken && env.SHOPIFY_CLI_THEME_TOKEN) next.SHOPIFY_CLI_THEME_TOKEN = env.SHOPIFY_CLI_THEME_TOKEN;
  for (const key of BLOCKED_ENV) delete next[key];
  return next;
}

export function shopifyExecutable() {
  if (process.env.SPAWN_VERIFY_SHOPIFY_BIN) {
    if (process.env.SPAWN_VERIFY_ALLOW_FAKE_SHOPIFY !== '1') {
      throw new FenceError('refusing to replace the shopify binary');
    }
    return process.env.SPAWN_VERIFY_SHOPIFY_BIN;
  }
  return 'shopify';
}
