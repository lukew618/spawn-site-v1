import fs from 'node:fs';
import path from 'node:path';
import { VIEWPORTS, capturePage, pngSize, withChrome } from './chrome.mjs';
import { readCurrent } from './paths.mjs';
import { redact } from './redact.mjs';
import { beginEvidence, writeResult } from './result.mjs';
import { PAGES } from './render.mjs';

function norm(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

const requested = process.argv[2] || 'all';
const pages = requested === 'all' ? PAGES : PAGES.filter((page) => page.id === requested);
if (!pages.length) {
  console.error(`unknown feature ${requested}`);
  process.exit(1);
}

const current = readCurrent();
const base = `http://127.0.0.1:${current.PORT}`;
const profile = path.join('/tmp/spawn-verify-runs', current.RUN_ID, 'chrome');
let failed = false;

await withChrome(profile, async (session) => {
  for (const page of pages) {
    const featureDir = path.join(current.EVIDENCE, page.id);
    beginEvidence(featureDir);
    const expected = JSON.parse(fs.readFileSync(path.join(current.SITE, `${page.id}.expected.json`), 'utf8'));
    const problems = [];
    try {
      for (const viewport of [VIEWPORTS.desktop, VIEWPORTS.mobile]) {
        const screenshotPath = path.join(featureDir, `${viewport.name}.png`);
        const captured = await capturePage(session, {
          url: `${base}${expected.href}`,
          viewport,
          screenshotPath,
        });
        const size = pngSize(screenshotPath);
        if (size.width !== viewport.width || size.height !== viewport.height) {
          problems.push(`${viewport.name} screenshot is ${size.width}x${size.height}`);
        }
        const state = captured.state;
        if (state.title !== expected.title) problems.push(`${viewport.name} title ${state.title}`);
        if (norm(state.h1) !== norm(expected.h1) || state.h1Height < 20) problems.push(`${viewport.name} h1 was not visible`);
        if (state.h1Top < state.headerBottom - 1) problems.push(`${viewport.name} heading is under the header`);
        if (state.skip !== expected.skip) problems.push(`${viewport.name} skip link missing`);
        if (JSON.stringify(state.sections) !== JSON.stringify(expected.sections)) problems.push(`${viewport.name} sections differ`);
        const body = norm(state.text);
        for (const snippet of expected.text) {
          if (!body.includes(norm(snippet))) problems.push(`${viewport.name} missing ${JSON.stringify(snippet)}`);
        }
        const links = Object.fromEntries((state.links || []).map((link) => [link.nav, link.href]));
        for (const item of PAGES) {
          if (links[item.id] !== `/verify/${item.id}.html`) problems.push(`${viewport.name} nav ${item.id}`);
        }
        if (state.scrollWidth > viewport.width + 1) problems.push(`${viewport.name} horizontal overflow ${state.scrollWidth}`);
        const css = Object.values(captured.assetStatus);
        if (css.length < 4 || css.some((status) => status !== 200)) problems.push(`${viewport.name} theme css did not load`);
        if (captured.consoleErrors.length) problems.push(...captured.consoleErrors.map((line) => `${viewport.name} console: ${line}`));
        fs.writeFileSync(path.join(featureDir, `${viewport.name}-console.txt`), captured.consoleErrors.length ? `${captured.consoleErrors.join('\n')}\n` : 'console errors: 0\n');
        fs.writeFileSync(path.join(featureDir, `${viewport.name}-state.json`), redact(`${JSON.stringify(state, null, 2)}\n`));
      }
    } catch (error) {
      problems.push(error.message);
    }
    if (problems.length) {
      failed = true;
      writeResult(featureDir, 'FAIL', problems.slice(0, 30));
    } else {
      writeResult(featureDir, 'PASS', ['desktop=1440x900', 'mobile=390x844', 'console errors=0']);
    }
  }
});

if (failed) process.exit(1);
