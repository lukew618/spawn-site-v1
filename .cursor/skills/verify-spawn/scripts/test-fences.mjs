import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIVE_THEME_ID, planThemeCommand, scrubbedEnv, shopifyExecutable } from './fences.mjs';
import { repoRoot } from './paths.mjs';
import { previewPlan, publicPreviewUrl } from './preview.mjs';
import { redact } from './redact.mjs';
import { readResult } from './result.mjs';
import { runThemeCheck } from './theme-check.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const saved = {
  bin: process.env.SPAWN_VERIFY_SHOPIFY_BIN,
  allow: process.env.SPAWN_VERIFY_ALLOW_FAKE_SHOPIFY,
  live: process.env.SHOPIFY_FLAG_ALLOW_LIVE,
};

function restoreEnv() {
  for (const [key, value] of [
    ['SPAWN_VERIFY_SHOPIFY_BIN', saved.bin],
    ['SPAWN_VERIFY_ALLOW_FAKE_SHOPIFY', saved.allow],
    ['SHOPIFY_FLAG_ALLOW_LIVE', saved.live],
  ]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function throws(fn, pattern) {
  try {
    fn();
  } catch (error) {
    if (redact(error.message) !== error.message) throw new Error('fence error contained a secret');
    if (pattern && !pattern.test(error.message)) throw new Error(`fence refused with an unexpected reason: ${redact(error.message)}`);
    return;
  }
  throw new Error('fence did not refuse');
}

export function runFenceTests() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spawn-verify-fences-'));
  const sentinel = path.join(root, 'shopify-called');
  const bin = path.join(root, 'fake-shopify.sh');
  fs.writeFileSync(bin, `#!/bin/sh\necho called >> ${JSON.stringify(sentinel)}\nexit 0\n`);
  fs.chmodSync(bin, 0o755);
  try {
    throws(() => publicPreviewUrl('https://spawn-fly-fish.myshopify.com/?preview_theme_id=143738535999', LIVE_THEME_ID), /143738535999/);
    throws(() => publicPreviewUrl('http://spawn-fly-fish.myshopify.com/?preview_theme_id=55', '55'), /https/);
    throws(() => publicPreviewUrl('https://example.com/?preview_theme_id=55', '55'), /host/);
    const safeUrl = publicPreviewUrl('https://user:secret@spawn-fly-fish.myshopify.com/collections/flies?preview_theme_id=55&preview_token=shptka_VERIFY_SHOULD_NOT_APPEAR_038', '55');
    assert(safeUrl === 'https://spawn-fly-fish.myshopify.com/collections/flies?preview_theme_id=55', 'preview URL kept a secret or the wrong query');
    assert(!safeUrl.includes('shptka_') && !safeUrl.includes('secret'), 'preview URL kept a secret');

    throws(() => planThemeCommand('push', { id: LIVE_THEME_ID, name: 'ENG-live', role: 'unpublished' }, { root }), /143738535999/);
    throws(() => planThemeCommand('push', { id: '55', name: 'ENG-038', role: 'main' }, { root }), /role main/);
    throws(() => planThemeCommand('push', { id: '55', name: 'ENG-038', role: 'live' }, { root }), /role live/);
    throws(() => planThemeCommand('push', { id: '55', name: 'ENG-038', role: 'demo' }, { root }), /role demo/);
    throws(() => planThemeCommand('push', { id: '55', name: 'Horizon', role: 'unpublished' }, { root }), /ENG-/);
    throws(() => planThemeCommand('push', { id: '55', name: 'eng-038', role: 'unpublished' }, { root }), /ENG-/);
    throws(() => planThemeCommand('push', { id: '55', name: 'ENG-', role: 'unpublished' }, { root }), /ENG-/);
    throws(() => planThemeCommand('push', { id: '', name: 'ENG-038', role: 'unpublished' }, { root }), /explicit theme id/);
    throws(() => planThemeCommand('push', { id: 'theme-name', name: 'ENG-038', role: 'unpublished' }, { root }), /numeric/);
    throws(() => planThemeCommand('publish', { id: '55', name: 'ENG-038', role: 'unpublished' }, { root }), /publish/);
    throws(() => planThemeCommand('delete', { id: '55', name: 'ENG-038', role: 'unpublished' }, { root }), /delete/);
    throws(() => planThemeCommand('dev', { id: LIVE_THEME_ID, name: 'ENG-038', role: 'development' }, { root }), /143738535999/);

    const push = planThemeCommand('push', { id: '424242', name: 'ENG-038-preview', role: 'unpublished' }, { root: '/tmp/theme' });
    assert(push.args.includes('--theme') && push.args.includes('424242') && push.args.includes('--nodelete'), 'push plan omitted the explicit theme id');
    assert(!push.args.includes('--allow-live') && !push.args.includes('--live') && !push.args.includes('--publish'), 'push plan included a live or publish flag');
    assert(!push.args.includes('--unpublished') && !push.args.includes('--development'), 'push plan creates a theme instead of using the explicit id');
    const dev = planThemeCommand('dev', { id: '424242', name: 'ENG-038-preview', role: 'development' }, { root: '/tmp/theme' });
    assert(dev.args.includes('--host') && dev.args.includes('127.0.0.1') && dev.args.includes('--nodelete'), 'dev plan is not bound to loopback');
    const joined = [...push.args, ...dev.args].join(' ');
    if (process.env.SHOPIFY_CLI_THEME_TOKEN && joined.includes(process.env.SHOPIFY_CLI_THEME_TOKEN)) {
      throw new Error('token in argv');
    }

    throws(() => previewPlan(['--theme', LIVE_THEME_ID, '--execute']), /143738535999/);
    throws(() => previewPlan(['--theme', '55', '--allow-live', '--execute']), /allow-live/);
    throws(() => previewPlan(['--theme', '55', '--command', 'publish', '--execute']), /publish/);
    throws(() => previewPlan(['--theme', '55', '--command', 'delete', '--execute']), /delete/);
    throws(() => previewPlan(['--execute']), /explicit theme id/);
    throws(() => previewPlan(['--theme', '424242', '--execute', '--fixture', path.join(root, 'missing.json')]), /fixture/);
    throws(() => previewPlan(['--theme', LIVE_THEME_ID, '--fixture', path.join(root, 'live.json'), '--execute'], {
      themes: [{ id: LIVE_THEME_ID, name: 'ENG-renamed', role: 'unpublished' }],
    }), /143738535999/);
    throws(() => previewPlan(['--theme', '55', '--fixture', path.join(root, 'bad.json')], {
      themes: [{ id: '55', name: 'ENG-038', role: 'main' }],
    }), /role main/);

    process.env.SHOPIFY_FLAG_ALLOW_LIVE = '1';
    const child = scrubbedEnv(process.env, { includeToken: true });
    assert(child.SHOPIFY_FLAG_ALLOW_LIVE === undefined && child.SHOPIFY_FLAG_LIVE === undefined, 'live flags survived the env scrub');
    assert(child.SHOPIFY_FLAG_STORE === 'spawn-fly-fish.myshopify.com', 'store was not pinned');
    const keys = JSON.stringify(Object.keys(child));
    if (process.env.SHOPIFY_CLI_THEME_TOKEN) {
      assert(child.SHOPIFY_CLI_THEME_TOKEN === process.env.SHOPIFY_CLI_THEME_TOKEN, 'preview child lost the token');
      assert(!keys.includes(process.env.SHOPIFY_CLI_THEME_TOKEN), 'token leaked into the env key list');
    }
    const bare = scrubbedEnv(process.env, { includeToken: false });
    assert(!bare.SHOPIFY_CLI_THEME_TOKEN, 'theme check env kept the token');

    const fake = 'shptka_VERIFY_SHOULD_NOT_APPEAR_038';
    const redacted = redact(`token ${fake} end`);
    assert(!redacted.includes(fake) && !redacted.includes('shptka_'), 'redact left a token pattern');
    assert(redacted.includes('[REDACTED]'), 'redact did not mark the token');
    if (process.env.SHOPIFY_CLI_THEME_TOKEN) {
      const hidden = redact(`x ${process.env.SHOPIFY_CLI_THEME_TOKEN} y`);
      assert(!hidden.includes(process.env.SHOPIFY_CLI_THEME_TOKEN), 'redact left the environment token');
    }

    process.env.SPAWN_VERIFY_SHOPIFY_BIN = bin;
    delete process.env.SPAWN_VERIFY_ALLOW_FAKE_SHOPIFY;
    throws(() => shopifyExecutable(), /replace the shopify binary/);
    process.env.SPAWN_VERIFY_ALLOW_FAKE_SHOPIFY = '1';
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'spawn-empty-theme-'));
    const emptyEvidence = path.join(root, 'empty-root');
    let emptyFailed = false;
    try {
      runThemeCheck({ themeRoot: empty, evidenceDir: emptyEvidence });
    } catch {
      emptyFailed = true;
    }
    assert(emptyFailed, 'empty theme root did not fail');
    assert(readResult(emptyEvidence).startsWith('FAIL\n'), 'empty theme root did not write FAIL');
    assert(!fs.existsSync(sentinel), 'empty theme root invoked shopify');
    fs.rmSync(empty, { recursive: true, force: true });

    const previewEvidence = path.join(root, 'live-theme');
    const preview = spawnSync(process.execPath, [
      path.join(scriptDir, 'preview.mjs'),
      '--theme', LIVE_THEME_ID,
      '--execute',
      '--evidence', previewEvidence,
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        SPAWN_VERIFY_ALLOW_FAKE_SHOPIFY: '1',
        SPAWN_VERIFY_SHOPIFY_BIN: bin,
      },
    });
    assert(preview.status !== 0, 'live theme preview exited 0');
    assert(readResult(previewEvidence).startsWith('FAIL\n'), 'live theme preview did not write FAIL');
    assert(fs.readFileSync(path.join(previewEvidence, 'shopify-spawn-count.txt'), 'utf8').trim() === '0', 'live theme preview spawned shopify');
    assert(!fs.existsSync(sentinel), 'live theme preview invoked shopify');
    if (process.env.SHOPIFY_CLI_THEME_TOKEN && fs.readFileSync(path.join(previewEvidence, 'result.txt'), 'utf8').includes(process.env.SHOPIFY_CLI_THEME_TOKEN)) {
      throw new Error('live theme result contained the token');
    }
  } finally {
    restoreEnv();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runFenceTests();
  console.log('fence tests ok');
}
