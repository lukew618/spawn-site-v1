import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const setup = read('scripts/setup-rivers.mjs');
const syntax = spawnSync(process.execPath, ['--check', path.join(root, 'scripts/setup-rivers.mjs')], { encoding: 'utf8' });
expect(syntax.status === 0, syntax.stderr || 'setup-rivers.mjs failed syntax check');
expect(setup.includes("cmd === 'seed-wa'"), 'seed catalog command must be present');
expect(!setup.includes('shpat_'), 'seed script must not contain an admin token');
const catalog = [
  'yakima', 'skagit', 'sauk', 'skykomish', 'snoqualmie', 'stillaguamish',
  'klickitat', 'cowlitz', 'lewis', 'toutle', 'solduc', 'methow', 'wenatchee',
  'spokane', 'grande_ronde',
];
for (const slug of catalog) {
  expect(setup.includes(`slug: '${slug}'`), `catalog must include ${slug}`);
}
expect((setup.match(/page_handle: '/g) || []).length === catalog.length, 'catalog must contain 15 river pages');

const riversIndex = read('sections/rivers-index.liquid');
const riverPage = read('sections/river-conditions.liquid');
expect(riversIndex.includes('river_card_alt'), 'river index must keep the assigned alt text');
expect(riverPage.includes('river_hero_alt'), 'river hero must keep the assigned alt text');
expect(!riversIndex.includes('fonts.googleapis.com'), 'river index must not load external fonts');
expect(!riverPage.includes('fonts.googleapis.com'), 'river page must not load external fonts');
expect(riverPage.includes('application/ld+json'), 'river page must keep its article schema');
expect(read('locales/en.default.json').includes('Stock the bench for your next day on the water.'), 'cart copy must stay in place');
expect(read('.gitignore').includes('/.agents'), 'local agent ignore rules must stay in place');
expect(read('assets/river-picker.js').includes('e.stopPropagation()'), 'picker search keys must stop bubbling');
expect(read('assets/river-conditions.js').includes('window.SPAWN_RIVERS.computeFishability(this.config.slug, flow, temp)'), 'river page fishability must use the shared function');

const defined = {};
const context = {
  console,
  customElements: {
    get() { return undefined; },
    define(name, ctor) { defined[name] = ctor; },
  },
  HTMLElement: class {},
};
context.window = context;
context.globalThis = context;
vm.runInNewContext(read('assets/river-conditions.js'), context, { filename: 'river-conditions.js' });
const element = Object.create(defined['river-conditions'].prototype);
element.config = { slug: 'yakima' };
element.riverConfig = context.SPAWN_RIVERS.RIVER_CONFIG.yakima;
const cases = [
  [1000, 50, 'PRIME'],
  [100, 50, 'LOW_FLOW'],
  [9000, 50, 'BLOWN_OUT'],
  [null, 50, 'UNKNOWN'],
];
for (const [flow, temp, expected] of cases) {
  const shared = context.SPAWN_RIVERS.computeFishability('yakima', flow, temp);
  const page = element.computeFishability(flow, temp);
  expect(shared === expected && page === expected, `yakima ${flow}/${temp} should be ${expected}, shared ${shared}, page ${page}`);
}

function chromeDump(fixturePath) {
  const fixture = path.isAbsolute(fixturePath) ? fixturePath : path.join(root, fixturePath);
  const result = spawnSync('timeout', [
    '20', 'google-chrome', '--headless=new', '--disable-gpu', '--no-sandbox',
    `--user-data-dir=/tmp/chrome-rivers-picker-${path.basename(fixture, '.html')}`,
    '--virtual-time-budget=2500',
    '--window-size=1440,900',
    '--dump-dom',
    pathToFileURL(fixture).href,
  ], { encoding: 'utf8' });
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}
const fixtureArg = process.argv.indexOf('--fixture');
const fixture = fixtureArg === -1
  ? 'tests/rivers-recovery/picker-keydown.html'
  : process.argv[fixtureArg + 1];
if (!fixture) {
  console.error('pass a fixture path after --fixture');
  process.exit(2);
}
const dump = chromeDump(fixture);
const match = dump.match(/data-picker-result="([^"]+)"/);
expect(Boolean(match), 'picker fixture must record keyboard state');
if (match) {
  const picker = JSON.parse(match[1].replaceAll('&quot;', '"'));
  expect(picker.afterOne === 0, `first ArrowDown should move one row, got ${picker.afterOne}`);
  expect(picker.afterTwo === 1, `second ArrowDown should move one more row, got ${picker.afterTwo}`);
  expect(picker.afterHome === 1, `Home in the search field should not jump the list, got ${picker.afterHome}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ catalog: catalog.length, picker: JSON.parse(match[1].replaceAll('&quot;', '"')) }, null, 2));
