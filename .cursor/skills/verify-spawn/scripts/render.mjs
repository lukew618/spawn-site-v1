import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

export const PAGES = [
  { id: 'home', template: 'templates/index.json', label: 'Home' },
  { id: 'collection', template: 'templates/collection.json', label: 'Collection' },
  { id: 'product', template: 'templates/product.json', label: 'Product' },
  { id: 'cart', template: 'templates/cart.json', label: 'Cart' },
  { id: 'not-found', template: 'templates/404.json', label: '404' },
];

const COPY_KEY = /(title|subtitle|text|heading|eyebrow|cta|label|caption|announcement|quote|kicker|content|description)/i;
const SKIP_VALUE = /^(left|right|center|none|solid|outline|body|subtitle|uppercase|default|adapt|square|small|medium|large|h0|h1|h2|hxl)$/i;

export function parseThemeJson(text) {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('theme JSON has no object');
  return JSON.parse(text.slice(start));
}

function readJson(file) {
  return parseThemeJson(fs.readFileSync(file, 'utf8'));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plain(value) {
  return String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function isCopy(key, value) {
  if (typeof value !== 'string') return false;
  if (/(position|alignment|style|size|behavior|scheme|ratio|opacity|padding|column|width|height|link|url|image|color|font|spacing|speed|overlay|shape|fit|layout)/i.test(key)) {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('{{') || trimmed.includes('{%')) return false;
  if (trimmed.startsWith('shopify://') || /^https?:/i.test(trimmed)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed) || SKIP_VALUE.test(trimmed)) return false;
  return COPY_KEY.test(key);
}

function takeCopy(settings, lines) {
  if (!settings || typeof settings !== 'object') return;
  for (const [key, value] of Object.entries(settings)) {
    if (!isCopy(key, value)) continue;
    lines.push({
      role: /(title|heading)/i.test(key) ? 'heading' : 'text',
      text: plain(value),
    });
  }
}

function sectionCopy(section) {
  const lines = [];
  takeCopy(section.settings, lines);
  const blocks = section.blocks || {};
  const order = section.block_order || Object.keys(blocks);
  for (const id of order) {
    const block = blocks[id];
    if (!block || block.disabled) continue;
    takeCopy(block.settings, lines);
  }
  const seen = new Set();
  return lines.filter((line) => {
    const key = `${line.role}:${line.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function structuralFacts(section) {
  const settings = section.settings || {};
  const facts = [];
  if (typeof settings.products_per_page === 'number') facts.push(`${settings.products_per_page} products per page`);
  if (settings.enable_filtering === true) facts.push('Filtering on');
  if (settings.enable_sorting === true) facts.push('Sorting on');
  if (typeof settings.columns_desktop === 'number') facts.push(`${settings.columns_desktop} columns`);
  return facts;
}

function localeValue(locale, dotted) {
  let cursor = locale;
  for (const part of dotted.split('.')) {
    if (cursor == null || typeof cursor !== 'object' || !(part in cursor)) {
      throw new Error(`missing locale string ${dotted}`);
    }
    cursor = cursor[part];
  }
  if (typeof cursor !== 'string' || !cursor.trim()) throw new Error(`locale string ${dotted} is empty`);
  return cursor;
}

function announcement(themeRoot) {
  const group = readJson(path.join(themeRoot, 'sections', 'header-group.json'));
    const lines = [];
    for (const section of Object.values(group.sections || {})) {
      if (section.disabled) continue;
      lines.push(...sectionCopy(section).map((line) => line.text));
    }
  if (!lines.length) throw new Error('header group has no announcement text');
  return lines[0];
}

function pageIntro(page, locale) {
  if (page.id === 'cart') {
    return {
      h1: localeValue(locale, 'sections.cart.title'),
      paragraphs: [
        localeValue(locale, 'sections.cart.empty'),
        localeValue(locale, 'sections.cart.empty_message'),
      ],
    };
  }
  if (page.id === 'not-found') {
    return {
      h1: localeValue(locale, 'templates.404.title'),
      paragraphs: [localeValue(locale, 'templates.404.subtext')],
    };
  }
  if (page.id === 'collection') {
    return {
      h1: localeValue(locale, 'sections.collection_template.title'),
      paragraphs: [localeValue(locale, 'sections.collection_template.empty')],
    };
  }
  if (page.id === 'product') return { h1: 'Product', paragraphs: [] };
  return { h1: '', paragraphs: [] };
}

export function buildPages(themeRoot) {
  const locale = readJson(path.join(themeRoot, 'locales', 'en.default.json'));
  const banner = announcement(themeRoot);
  const skip = localeValue(locale, 'accessibility.skip_to_text');
  const pages = [];
  for (const page of PAGES) {
    const templatePath = path.join(themeRoot, page.template);
    if (!fs.existsSync(templatePath)) throw new Error(`missing ${page.template}`);
    const template = readJson(templatePath);
    const order = template.order || [];
    if (!order.length) throw new Error(`${page.template} has no section order`);
    const sections = [];
    for (const id of order) {
      const section = template.sections?.[id];
      if (!section) throw new Error(`${page.template} order is missing ${id}`);
      if (section.disabled) continue;
      const type = String(section.type || '');
      if (!/^[a-z0-9_-]+$/i.test(type)) throw new Error(`refusing section type ${type}`);
      const sectionFile = path.join(themeRoot, 'sections', `${type}.liquid`);
      if (!fs.existsSync(sectionFile)) {
        if (!type.startsWith('_')) throw new Error(`missing sections/${type}.liquid`);
        sections.push({
          id,
          type,
          lines: [{ role: 'text', text: 'This platform section is rendered by Shopify and has no local file.' }],
          headings: [],
          facts: [],
        });
        continue;
      }
      const copy = sectionCopy(section);
      sections.push({
        id,
        type,
        lines: copy,
        headings: copy.filter((line) => line.role === 'heading').map((line) => line.text),
        facts: structuralFacts(section),
      });
    }
    if (!sections.length) throw new Error(`${page.template} has no enabled sections`);
    const intro = pageIntro(page, locale);
    const h1 = intro.h1 || sections.flatMap((section) => section.headings)[0] || page.label;
    const text = [banner, skip, h1, 'Spawn Fly Fish', 'Offline template render', ...intro.paragraphs];
    for (const section of sections) text.push(...section.lines.map((line) => line.text), ...section.facts);
    pages.push({
      ...page,
      banner,
      skip,
      h1,
      paragraphs: intro.paragraphs,
      sections,
      text: [...new Set(text)],
      href: `/verify/${page.id}.html`,
    });
  }
  return pages;
}

function renderPage(page, pages) {
  const nav = pages.map((item) => {
    const current = item.id === page.id ? ' aria-current="page"' : '';
    return `<a data-nav="${item.id}" href="${item.href}"${current}>${escapeHtml(item.label)}</a>`;
  }).join('');
  let usedH1 = false;
  const sections = page.sections.map((section) => {
    const bits = [`<p class="section-kicker">${escapeHtml(section.type)}</p>`];
    for (const line of section.lines) {
      if (line.role === 'heading' && !usedH1 && line.text === page.h1) {
        usedH1 = true;
        bits.push(`<h1>${escapeHtml(line.text)}</h1>`);
      } else if (line.role === 'heading') bits.push(`<h2>${escapeHtml(line.text)}</h2>`);
      else bits.push(`<p>${escapeHtml(line.text)}</p>`);
    }
    for (const fact of section.facts) bits.push(`<p>${escapeHtml(fact)}</p>`);
    return `<section id="${escapeHtml(section.id)}" data-section-type="${escapeHtml(section.type)}">${bits.join('')}</section>`;
  }).join('');
  const intro = page.paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  const h1 = usedH1 ? '' : `<h1>${escapeHtml(page.h1)}</h1>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Spawn Fly Fish — ${escapeHtml(page.label)}</title>
  <link rel="stylesheet" href="/assets/spawn-home.css">
  <link rel="stylesheet" href="/assets/spawn-typography.css">
  <link rel="stylesheet" href="/assets/spawn-storefront.css">
  <link rel="stylesheet" href="/verify/render.css">
</head>
<body class="spawn-storefront template-${page.id === 'not-found' ? '404' : page.id}">
  <a class="skip" href="#MainContent">${escapeHtml(page.skip)}</a>
  <div class="utility-bar"><p class="announcement-bar__message">${escapeHtml(page.banner)}</p></div>
  <header class="sh-masthead">
    <p class="wordmark">Spawn Fly Fish</p>
    <nav aria-label="Primary">${nav}</nav>
  </header>
  <main id="MainContent" class="sh-home">
    ${h1}
    ${intro}
    ${sections}
  </main>
  <footer class="sh-footer"><p>Spawn Fly Fish · Ilwaco, WA</p><p>Offline template render</p></footer>
</body>
</html>
`;
}

export function writeSite(themeRoot, siteDir) {
  const pages = buildPages(themeRoot);
  fs.mkdirSync(siteDir, { recursive: true });
  fs.copyFileSync(path.join(scriptDir, 'render.css'), path.join(siteDir, 'render.css'));
  for (const page of pages) {
    fs.writeFileSync(path.join(siteDir, `${page.id}.html`), renderPage(page, pages));
    const expected = {
      id: page.id,
      href: page.href,
      title: `Spawn Fly Fish — ${page.label}`,
      h1: page.h1,
      skip: page.skip,
      sections: page.sections.map((section) => section.type),
      text: page.text,
    };
    fs.writeFileSync(path.join(siteDir, `${page.id}.expected.json`), `${JSON.stringify(expected, null, 2)}\n`);
  }
  return pages;
}
