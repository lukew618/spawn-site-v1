export const LIVE_THEME_ID = '143738535999';
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

export function assertThemeAllowed(theme) {
  if (theme == null || theme.id == null || String(theme.id).trim() === '') {
    throw new FenceError('theme push requires an explicit theme id');
  }
  const id = String(theme.id).trim();
  if (!/^\d+$/.test(id)) throw new FenceError('theme id must be numeric');
  if (id === LIVE_THEME_ID) throw new FenceError(`refusing theme id ${LIVE_THEME_ID}`);
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
  if (list.includes(LIVE_THEME_ID)) throw new FenceError(`refusing theme id ${LIVE_THEME_ID}`);
  const command = list[0] === 'theme' ? list[1] : '';
  if (command === 'push' || command === 'dev') {
    const themeIdx = list.indexOf('--theme');
    const themeId = themeIdx >= 0 ? list[themeIdx + 1] : '';
    if (!/^\d+$/.test(themeId || '')) throw new FenceError('theme push requires an explicit numeric theme id');
    if (!list.includes('--nodelete')) throw new FenceError('theme push must pass --nodelete');
  }
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
    if (theme?.id != null) {
      const id = String(theme.id).trim();
      if (id === LIVE_THEME_ID) throw new FenceError(`refusing theme id ${LIVE_THEME_ID}`);
      if (!/^\d+$/.test(id)) throw new FenceError('theme id must be numeric');
      args.push('--id', id);
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
