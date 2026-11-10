import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const header = read('sections/header.liquid');
const homeHeader = read('snippets/spawn-home-header.liquid');
const drawerJs = read('assets/drawer-menu.js');
const drawerLiquid = read('snippets/drawer-menu.liquid');
const cardCss = read('assets/component-card.css');
const home = read('sections/spawn-home.liquid');
const index = read('templates/index.json');
const product = read('templates/product.json');

expect(header.includes("render 'spawn-home-header'"), 'header must keep rendering spawn-home-header');
expect(!header.includes('header__hamburger'), 'header must not restore the retired Dawn header markup');
expect(homeHeader.includes('data-menu-label'), 'menu toggle must expose data-menu-label');
expect(homeHeader.includes('data-close-label'), 'menu toggle must expose data-close-label');
expect(homeHeader.includes("sections.header.menu"), 'menu toggle must use the header menu translation');
expect(!homeHeader.includes('Open navigation'), 'menu toggle must not keep the hardcoded English label');
expect(drawerJs.includes('dataset.closeLabel'), 'drawer script must use the close label dataset');
expect(drawerJs.includes('dataset.menuLabel'), 'drawer script must use the menu label dataset');
expect(!drawerJs.includes('Open Navigation'), 'drawer script must not hardcode Open Navigation');
expect(!drawerJs.includes('Close Navigation'), 'drawer script must not hardcode Close Navigation');
expect(drawerJs.includes('aria-expanded", "false"'), 'closing the drawer must reset aria-expanded');
expect(drawerLiquid.includes("accessibility.close"), 'drawer close control must use the close translation');
expect(!drawerLiquid.includes('Close Navigation'), 'drawer close control must not hardcode Close Navigation');
expect(cardCss.includes('.product-card-wrapper .card:not(.card--horizontal) .card__heading'), 'product card titles must use the legibility rule');
expect(cardCss.includes('font-size: 1.4rem'), 'product card titles must be 1.4rem on small screens');
expect(cardCss.includes('font-size: 1.5rem'), 'product card titles must be 1.5rem from 750px');
expect(home.includes('customer.b2b?'), 'wholesale homepage branch must stay in place');
expect(home.includes("render 'spawn-home-wholesale'"), 'wholesale homepage render must stay in place');
expect(index.includes('"premium_home"') && index.includes('"type": "spawn-home"'), 'homepage must keep the spawn-home section');
expect(fs.existsSync(path.join(root, 'templates/page.wholesale.json')), 'wholesale landing template must stay present');
expect(product.includes('Free Shipping Over $85'), 'current product template shipping copy must stay in place');
expect(read('assets/spawn-home.js').includes('aria-expanded'), 'current header must keep its expanded-state observer');

function chromeDump(fileUrl, width, height) {
  const result = spawnSync(
    'timeout',
    [
      '20',
      'google-chrome',
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      `--user-data-dir=/tmp/chrome-stack-${width}x${height}-${path.basename(fileUrl)}`,
      '--virtual-time-budget=2500',
      `--window-size=${width},${height}`,
      '--dump-dom',
      fileUrl,
    ],
    { encoding: 'utf8' }
  );
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

const drawerDump = chromeDump(
  'file:///agent/repos/spawn-site-v1/tests/stack-recovery/drawer-labels.html',
  390,
  844
);
const drawerMatch = drawerDump.match(/data-drawer-result="([^"]+)"/);
expect(Boolean(drawerMatch), 'drawer fixture must record open and close labels');
if (drawerMatch) {
  const drawer = JSON.parse(drawerMatch[1].replaceAll('&quot;', '"'));
  expect(drawer.opened.label === 'Close', `opened label should be Close, got ${drawer.opened.label}`);
  expect(drawer.opened.expanded === 'true', `opened state should be expanded, got ${drawer.opened.expanded}`);
  expect(drawer.closed.label === 'Menu', `closed label should be Menu, got ${drawer.closed.label}`);
  expect(drawer.closed.expanded === 'false', `closed state should collapse, got ${drawer.closed.expanded}`);
}

function cardSize(width, height) {
  const dump = chromeDump(
    'file:///agent/repos/spawn-site-v1/tests/stack-recovery/product-card.html',
    width,
    height
  );
  const match = dump.match(/computed ([0-9.]+px) \/ line-height ([0-9.]+px)/);
  return match ? { fontSize: match[1], lineHeight: match[2] } : null;
}

const desktop = cardSize(1440, 900);
const mobile = cardSize(390, 844);
expect(desktop?.fontSize === '15px', `desktop card title should be 15px, got ${desktop?.fontSize}`);
expect(mobile?.fontSize === '14px', `mobile card title should be 14px, got ${mobile?.fontSize}`);
expect(desktop?.lineHeight === '21px', `desktop line-height should be 21px, got ${desktop?.lineHeight}`);
expect(mobile?.lineHeight === '19.6px', `mobile line-height should be 19.6px, got ${mobile?.lineHeight}`);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({ drawer: JSON.parse(drawerMatch[1].replaceAll('&quot;', '"')), desktop, mobile }, null, 2));
