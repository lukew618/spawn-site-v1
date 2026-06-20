#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';

const fixture = (name) => fs.readFileSync(`tests/pdp/fixtures/${name}.html`, 'utf8');
const signature = (html) => html.match(/<product-info[^>]+data-state-signature="([^"]+)"/)?.[1];
const regionSignature = (html) => html.match(/id="PurchaseRegion-[^"]+"[^>]+data-state-signature="([^"]+)"/)?.[1];
const count = (html, token) => html.split(token).length - 1;

for (const name of ['available', 'sold-out', 'unavailable', 'quantity-rule-sold-out']) {
  const html = fixture(name);
  assert.equal(signature(html), regionSignature(html), `${name} carrier mismatch`);
  assert.equal(count(html, 'id="PurchaseRegion-'), 1, `${name} must contain one purchase region`);
}

for (const name of ['sold-out', 'unavailable', 'quantity-rule-sold-out']) {
  const html = fixture(name);
  assert.equal(count(html, 'name="quantity"'), 0);
  assert.equal(count(html, 'id="product-form-'), 0);
  assert.equal(count(html, 'pickup-availability'), 0);
}

const available = fixture('available');
assert(available.includes('angler@example.com'));
assert.equal(count(available, 'id="product-form-main"'), 1);
assert.equal(count(available, 'id="product-form-installment-main"'), 1);

const featured = fixture('featured-product');
assert(!featured.includes('data-product-context="main-pdp"'));
assert(featured.includes('data-update-url="false"'));

console.log('PDP DOM fixture structure passed; browser tests execute the actual custom elements.');
