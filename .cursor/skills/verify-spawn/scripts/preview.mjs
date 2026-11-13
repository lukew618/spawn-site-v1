import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIEWPORTS, capturePage, withChrome } from './chrome.mjs';
import { STORE, assertArgvSafe, assertCanonicalThemeId, assertListedTheme, planThemeCommand, scrubbedEnv, shopifyExecutable } from './fences.mjs';
import { readCurrent, repoRoot } from './paths.mjs';
import { redact } from './redact.mjs';
import { beginEvidence, writeResult } from './result.mjs';

const FORBIDDEN_INPUT = ['--allow-live', '--live', '--publish', '--unpublished', '--development', '--force', '-l', '-p', '-a', '-u', '-d'];

function option(args, name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] || '' : '';
}

function hasFlag(args, name) {
  return args.includes(name);
}

export function previewPlan(argv, { themeRoot = repoRoot, themes = null } = {}) {
  for (const flag of FORBIDDEN_INPUT) {
    if (argv.includes(flag)) throw new Error(`refusing flag ${flag}`);
  }
  const command = option(argv, '--command') || 'push';
  if (command === 'publish' || command === 'delete' || command === 'share') {
    throw new Error(`refusing theme ${command}`);
  }
  const themeId = option(argv, '--theme');
  if (!themeId) throw new Error('theme push requires an explicit theme id');
  const canonicalId = assertCanonicalThemeId(themeId);
  if (hasFlag(argv, '--execute') && hasFlag(argv, '--fixture')) {
    throw new Error('refusing to push from a fixture');
  }
  let theme = null;
  if (themes) {
    const matches = themes.filter((item) => String(item.id) === canonicalId);
    if (matches.length !== 1) throw new Error(`theme ${canonicalId} was not an unpublished ENG- theme`);
    theme = assertListedTheme(canonicalId, matches[0]);
  }
  if (command === 'list') return planThemeCommand('list', { id: canonicalId }, { root: themeRoot });
  if (!theme) return { pendingList: true, themeId: canonicalId };
  return planThemeCommand(command === 'dev' ? 'dev' : 'push', theme, { root: themeRoot });
}

function readFixture(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(parsed) ? parsed : (parsed.themes || []);
}

export function publicPreviewUrl(value, themeId) {
  const id = assertCanonicalThemeId(themeId);
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') throw new Error('preview URL must be https');
  const host = parsed.hostname;
  if (host !== STORE && !host.endsWith('.myshopify.com') && !host.endsWith('.shopifypreview.com')) {
    throw new Error('preview URL host is not the store');
  }
  if (parsed.searchParams.get('preview_theme_id') !== id) {
    throw new Error('preview URL is not for the unpublished theme');
  }
  for (const key of [...parsed.searchParams.keys()]) {
    if (key !== 'preview_theme_id') parsed.searchParams.delete(key);
  }
  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';
  return parsed.toString();
}

function withPreview(href, home) {
  const url = new URL(href, home);
  url.search = '';
  url.hash = '';
  url.username = '';
  url.password = '';
  url.searchParams.set('preview_theme_id', home.searchParams.get('preview_theme_id'));
  return url.toString();
}

function navigationUrl(stdout, theme) {
  let raw = '';
  try {
    const parsed = JSON.parse(String(stdout).slice(String(stdout).search(/[\[{]/)));
    const body = parsed.theme || parsed;
    raw = body.preview_url || '';
  } catch {
    raw = '';
  }
  if (!raw) raw = `https://${STORE}/?preview_theme_id=${theme.id}`;
  return publicPreviewUrl(raw, theme.id);
}

async function renderRemote(previewUrl, evidenceDir) {
  const home = new URL(previewUrl);
  const profile = path.join('/tmp/spawn-verify-runs', `preview-${home.searchParams.get('preview_theme_id')}`);
  fs.rmSync(profile, { recursive: true, force: true });
  await withChrome(profile, async (session) => {
    const opened = await capturePage(session, {
      url: home.toString(),
      viewport: VIEWPORTS.desktop,
      screenshotPath: path.join(evidenceDir, 'store-home-desktop.png'),
    });
    if (opened.exceptions.length) throw new Error('store home raised a page exception');
    if (!opened.state.previewBar) throw new Error('store page had no Shopify preview bar');
    if (opened.state.h1Height < 20) throw new Error('store home did not render a heading');
    const hrefs = opened.state.hrefs || [];
    const collection = hrefs.find((href) => href.includes('/collections/'));
    const product = hrefs.find((href) => href.includes('/products/'));
    if (!collection || !product) throw new Error('store home did not link to a collection and a product');
    const targets = [
      ['collection', withPreview(collection, home)],
      ['product', withPreview(product, home)],
      ['cart', withPreview('/cart', home)],
      ['not-found', withPreview('/pages/verify-spawn-does-not-exist', home)],
    ];
    for (const [name, url] of targets) {
      for (const viewport of [VIEWPORTS.desktop, VIEWPORTS.mobile]) {
        const captured = await capturePage(session, {
          url,
          viewport,
          screenshotPath: path.join(evidenceDir, `store-${name}-${viewport.name}.png`),
        });
        if (captured.exceptions.length) throw new Error(`store ${name} raised a page exception`);
        if (!captured.state.previewBar) throw new Error(`store ${name} had no Shopify preview bar`);
      }
    }
    const mobileHome = await capturePage(session, {
      url: home.toString(),
      viewport: VIEWPORTS.mobile,
      screenshotPath: path.join(evidenceDir, 'store-home-mobile.png'),
    });
    if (mobileHome.exceptions.length || !mobileHome.state.previewBar) throw new Error('store home mobile preview failed');
  });
  fs.rmSync(profile, { recursive: true, force: true });
  fs.writeFileSync(path.join(evidenceDir, 'preview-url.txt'), `${previewUrl}\n`);
}

function runShopify(args, evidenceDir, label, markSpawned) {
  assertArgvSafe(args);
  markSpawned();
  fs.writeFileSync(path.join(evidenceDir, `${label}-command.txt`), `shopify ${args.join(' ')}\n`);
  const result = spawnSync(shopifyExecutable(), args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: scrubbedEnv(process.env, { includeToken: true }),
  });
  fs.writeFileSync(path.join(evidenceDir, `${label}.json`), redact(result.stdout || ''));
  fs.writeFileSync(path.join(evidenceDir, `${label}.stderr.txt`), redact(result.stderr || ''));
  return result;
}

function listTheme(themeId, evidenceDir, markSpawned) {
  const requested = assertCanonicalThemeId(themeId);
  const plan = planThemeCommand('list', { id: requested }, { root: repoRoot });
  const result = runShopify(plan.args, evidenceDir, 'theme-list', markSpawned);
  if (result.status !== 0) throw new Error('theme list failed');
  const stdout = redact(result.stdout || '');
  const parsed = JSON.parse(stdout.slice(stdout.search(/[\[{]/)));
  const themes = Array.isArray(parsed) ? parsed : (parsed.themes || []);
  const matches = themes.filter((theme) => String(theme.id) === requested);
  if (matches.length !== 1) throw new Error(`theme ${requested} was not an unpublished ENG- theme`);
  return assertListedTheme(requested, matches[0]);
}

function fail(evidenceDir, error, spawned) {
  writeResult(evidenceDir, 'FAIL', [error.message]);
  fs.writeFileSync(path.join(evidenceDir, 'shopify-spawn-count.txt'), `${spawned}\n`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--from-env')) {
    const current = readCurrent();
    const token = process.env.SHOPIFY_CLI_THEME_TOKEN;
    const themeId = process.env.SPAWN_VERIFY_THEME_ID || '';
    if (!token) {
      fs.writeFileSync(path.join(current.EVIDENCE, 'preview.txt'), 'preview mode skipped: SHOPIFY_CLI_THEME_TOKEN is unset\n');
      return;
    }
    if (!themeId) {
      fs.writeFileSync(path.join(current.EVIDENCE, 'preview.txt'), 'preview mode skipped: no explicit unpublished ENG- theme id\n');
      return;
    }
    args.push('--theme', themeId, '--execute', '--evidence', path.join(current.EVIDENCE, 'preview'));
  }

  const evidenceDir = option(args, '--evidence');
  if (!evidenceDir) {
    console.error('missing --evidence');
    process.exit(1);
  }
  beginEvidence(evidenceDir);
  let spawned = 0;
  const markSpawned = () => {
    spawned += 1;
  };
  return executePreview(args, evidenceDir, markSpawned).then(() => {
    fs.writeFileSync(path.join(evidenceDir, 'shopify-spawn-count.txt'), `${spawned}\n`);
  }).catch((error) => {
    fail(evidenceDir, error, spawned);
    process.exit(1);
  });
}

async function executePreview(args, evidenceDir, markSpawned) {
  const fixture = option(args, '--fixture');
  const themes = fixture ? readFixture(fixture) : null;
  const plan = previewPlan(args, { themes });
  if (!args.includes('--execute')) throw new Error('refusing theme push without --execute');
  if (!process.env.SHOPIFY_CLI_THEME_TOKEN) throw new Error('SHOPIFY_CLI_THEME_TOKEN is unset');
  const theme = plan.theme || listTheme(plan.themeId || option(args, '--theme'), evidenceDir, markSpawned);
  const push = planThemeCommand('push', theme, { root: repoRoot });
  const result = runShopify(push.args, evidenceDir, 'push', markSpawned);
  if (result.status !== 0) throw new Error('theme push failed');
  const previewUrl = navigationUrl(result.stdout, theme);
  fs.writeFileSync(path.join(evidenceDir, 'preview.txt'), redact(`preview uploaded to theme ${theme.id} ${theme.name}\n${previewUrl}\n`));
  await renderRemote(previewUrl, evidenceDir);
  writeResult(evidenceDir, 'PASS', [`theme=${theme.id}`, `name=${theme.name}`, `role=${theme.role}`]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
