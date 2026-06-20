#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const stripJsonComments = (source) => source.replace(/^\/\*[\s\S]*?\*\/\s*/, '');
const json = (file) => JSON.parse(stripJsonComments(read(file)));

const product = json('templates/product.json');
const inStore = json('templates/product.in-store-only.json');
const main = read('sections/main-product.liquid');
const css = read('assets/section-main-product.css');
const variantPickerCss = read('assets/component-product-variant-picker.css');
const js = read('assets/product-info.js');
const quantity = read('snippets/product-quantity-selector.liquid');
const purchaseRegion = read('snippets/product-purchase-region.liquid');
const cart = read('snippets/cart-drawer.liquid');
const threshold = read('snippets/free-shipping-threshold.liquid');
const header = read('sections/header-group.json');
const home = read('templates/index.json');

const productBlocks = product.sections.main.blocks;
const inStoreBlocks = inStore.sections.main.blocks;
const blockTypes = (blocks) => Object.values(blocks).map((block) => block.type);

assert(!Object.values(product.sections).some((section) => section.type === 'image-banner'));
assert(!Object.values(product.sections).some((section) => section.type === 'multicolumn'));
assert(!Object.values(inStore.sections).some((section) => section.type === 'image-banner'));
assert(!Object.values(inStore.sections).some((section) => section.type === 'multicolumn'));
assert(!blockTypes(productBlocks).includes('icon-with-text'));
assert(!blockTypes(productBlocks).includes('custom_liquid'));

assert(blockTypes(productBlocks).includes('purchase_region'));
assert(!blockTypes(productBlocks).includes('quantity_selector'));
assert(!blockTypes(productBlocks).includes('buy_buttons'));
assert(!blockTypes(inStoreBlocks).includes('purchase_region'));
assert(!blockTypes(inStoreBlocks).includes('quantity_selector'));
assert(!blockTypes(inStoreBlocks).includes('buy_buttons'));

for (const token of [
  'data-product-context="main-pdp"',
  'data-product-kind=',
  'data-purchase-mode=',
  'data-purchasability=',
  'data-state-signature=',
  "when 'purchase_region'",
  'quantity_rule_soldout',
  'block.shopify_attributes',
  'request.design_mode',
]) assert(main.includes(token), `Missing main-product contract: ${token}`);

assert(!main.includes("class: 'installment caption-large'"), 'Installment terms must not remain in the price block');
assert(
  main.includes("when 'text'") && main.includes('if block.settings.text != blank'),
  'Blank text blocks must not render wrappers',
);
assert(!main.includes('rating-wrapper--placeholder'), 'Blank or zero ratings must not render placeholder chrome');
assert(!main.includes('Be the first to review'), 'Blank or zero ratings must not render solicitation copy');
assert(
  !/input\[type='radio'\](?::disabled|\.disabled) \+ label[\s\S]*?text-decoration:\s*line-through/.test(variantPickerCss),
  'Unavailable variant labels must not use whole-label strike-through',
);
assert(css.includes('[data-product-context="main-pdp"]'));
assert(js.includes("this.dataset.productContext === 'main-pdp'"));
for (const token of ['<price-per-item', '<volume-pricing', 'quantity_price_breaks', 'Price-Per-Item-', 'Volume-']) {
  assert(quantity.includes(token), `Missing Dawn volume-pricing contract: ${token}`);
}
assert(main.includes('data-dynamic-fragment-anchor="Inventory"'));
assert(main.includes("append: '&view=in-store-only'") && main.includes("append: '?view=in-store-only'"));
assert(threshold.includes('8500') && threshold.includes('$85'));
assert(cart.includes("render 'free-shipping-threshold'"));
assert(header.includes('$85'));
assert(home.includes('$85'));
assert(!/over \$85/i.test(header + home), 'The exact $85 boundary must not be described as over $85');

const storefrontSources = [
  main,
  purchaseRegion,
  cart,
  header,
  home,
  read('templates/product.json'),
  read('templates/product.in-store-only.json'),
];
assert(!storefrontSources.some((source) => source.includes('$49') || source.includes('$75')));
assert(!/over\s+(?:{{[^}]+}}|\$85)/i.test(storefrontSources.join('\n')));

const thresholdMinorUnits = 8500;
assert.equal(Math.max(thresholdMinorUnits - 8499, 0), 1);
assert.equal(Math.max(thresholdMinorUnits - 8500, 0), 0);
assert.equal(Math.max(thresholdMinorUnits - 8501, 0), 0);

console.log('PDP static contract passed.');
