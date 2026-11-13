import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { scrubbedEnv } from './fences.mjs';

const VIEWPORTS = {
  desktop: { name: 'desktop', width: 1440, height: 900, mobile: false },
  mobile: { name: 'mobile', width: 390, height: 844, mobile: true },
};

export { VIEWPORTS };

function chromeBin() {
  const candidates = [
    process.env.SPAWN_VERIFY_CHROME,
    '/usr/local/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('google-chrome is not installed');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function pngSize(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : fs.readFileSync(buffer);
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('screenshot is not a png');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export async function withChrome(profileDir, run) {
  fs.mkdirSync(profileDir, { recursive: true });
  const child = spawn(chromeBin(), [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-extensions',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--remote-debugging-port=0',
    `--user-data-dir=${profileDir}`,
    '--window-size=1440,900',
  ], {
    stdio: ['ignore', 'ignore', 'pipe'],
    env: scrubbedEnv(process.env, { includeToken: false }),
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
    if (stderr.length > 20000) stderr = stderr.slice(-20000);
  });
  try {
    const port = await debuggingPort(profileDir, child);
    const version = await fetch(`http://127.0.0.1:${port}/json/version`).then((res) => res.json());
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('chrome devtools did not connect')), { once: true });
    });
    const session = new Cdp(ws);
    try {
      return await run(session);
    } finally {
      ws.close();
    }
  } finally {
    await stopProcess(child);
    if (stderr.trim()) fs.writeFileSync(path.join(profileDir, 'chrome-stderr.txt'), stderr);
  }
}

async function debuggingPort(profileDir, child) {
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode != null) throw new Error(`chrome exited ${child.exitCode}`);
    if (fs.existsSync(portFile)) {
      const port = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
      if (/^\d+$/.test(port)) return port;
    }
    await sleep(100);
  }
  throw new Error('chrome did not open a devtools port');
}

async function stopProcess(child) {
  if (child.exitCode != null) return;
  child.kill('SIGTERM');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (child.exitCode != null) return;
    await sleep(50);
  }
  child.kill('SIGKILL');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.events = [];
    this.waiters = [];
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message || 'devtools error'));
        else resolve(message.result || {});
        return;
      }
      this.events.push(message);
      for (const waiter of this.waiters) waiter();
    });
  }

  send(method, params = {}, sessionId = '') {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.ws.send(JSON.stringify(payload));
    });
  }

  waitFor(predicate, timeoutMs) {
    if (predicate()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((waiter) => waiter !== check);
        reject(new Error('timed out waiting for the page'));
      }, timeoutMs);
      const check = () => {
        if (!predicate()) return;
        clearTimeout(timer);
        this.waiters = this.waiters.filter((waiter) => waiter !== check);
        resolve();
      };
      this.waiters.push(check);
    });
  }
}

function ignoredConsole(line) {
  return /favicon\.ico/i.test(line);
}

export async function capturePage(session, { url, viewport, screenshotPath }) {
  const created = await session.send('Target.createTarget', { url: 'about:blank' });
  const attached = await session.send('Target.attachToTarget', { targetId: created.targetId, flatten: true });
  const sessionId = attached.sessionId;
  const before = session.events.length;
  await session.send('Page.enable', {}, sessionId);
  await session.send('Runtime.enable', {}, sessionId);
  await session.send('Log.enable', {}, sessionId);
  await session.send('Network.enable', {}, sessionId);
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  }, sessionId);
  const loadsBefore = session.events.filter((event) => event.sessionId === sessionId && event.method === 'Page.loadEventFired').length;
  const navigated = session.send('Page.navigate', { url }, sessionId);
  await session.waitFor(() => session.events.filter((event) => event.sessionId === sessionId && event.method === 'Page.loadEventFired').length > loadsBefore, 15000);
  await navigated;
  await sleep(200);
  const stateResult = await session.send('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      const style = h1 ? getComputedStyle(h1) : null;
      return JSON.stringify({
        title: document.title,
        h1: h1 ? h1.innerText : '',
        h1Height: h1 ? h1.offsetHeight : 0,
        h1Top: h1 ? h1.getBoundingClientRect().top : -1,
        headerBottom: document.querySelector('.sh-masthead') ? document.querySelector('.sh-masthead').getBoundingClientRect().bottom : 0,
        skip: document.querySelector('.skip') ? document.querySelector('.skip').textContent : '',
        sections: [...document.querySelectorAll('[data-section-type]')].map((node) => node.getAttribute('data-section-type')),
        links: [...document.querySelectorAll('nav[aria-label="Primary"] a')].map((node) => ({ nav: node.getAttribute('data-nav'), href: node.getAttribute('href') })),
        hrefs: [...document.querySelectorAll('a[href]')].map((node) => node.getAttribute('href')).filter(Boolean).slice(0, 40),
        previewBar: Boolean(document.querySelector('iframe[id*="PBar"], iframe[src*="preview-bar"], shopify-preview-bar')),
        text: document.body.innerText,
        scrollWidth: document.documentElement.scrollWidth,
        href: location.pathname,
        color: style ? style.color : ''
      });
    })()`,
    returnByValue: true,
  }, sessionId);
  const shot = await session.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: viewport.width, height: viewport.height, scale: 1 },
    captureBeyondViewport: false,
  }, sessionId);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  const png = Buffer.from(shot.data, 'base64');
  fs.writeFileSync(screenshotPath, png);
  const size = pngSize(png);
    const messages = [];
    const exceptions = [];
  const assetStatus = {};
  for (const event of session.events.slice(before)) {
    if (event.sessionId !== sessionId) continue;
    if (event.method === 'Runtime.exceptionThrown') {
      const text = event.params?.exceptionDetails?.text || 'exception';
      messages.push(text);
      exceptions.push(text);
    } else if (event.method === 'Runtime.consoleAPICalled' && event.params?.type === 'error') {
      messages.push((event.params.args || []).map((arg) => arg.value || arg.description || '').join(' '));
    } else if (event.method === 'Log.entryAdded' && event.params?.entry?.level === 'error') {
      messages.push(event.params.entry.text || 'log error');
    } else if (event.method === 'Network.responseReceived') {
      const response = event.params?.response || {};
      if (/\/assets\/spawn-(home|typography|storefront)\.css$/.test(response.url || '') || /\/verify\/render\.css$/.test(response.url || '')) {
        assetStatus[response.url] = response.status;
      }
    }
  }
  await session.send('Target.closeTarget', { targetId: created.targetId });
  return {
    state: JSON.parse(stateResult.result.value),
    size,
    consoleErrors: messages.filter((line) => line && !ignoredConsole(line)),
    exceptions: exceptions.filter((line) => line && !ignoredConsole(line)),
    assetStatus,
  };
}
