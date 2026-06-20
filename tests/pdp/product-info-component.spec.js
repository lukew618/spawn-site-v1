const { test, expect } = require('@playwright/test');
const path = require('node:path');

const productInfoScript = path.resolve(__dirname, '../../assets/product-info.js');
const pricePerItemScript = path.resolve(__dirname, '../../assets/price-per-item.js');

const selectedVariant = (variant) =>
  `<variant-selects id="Picker-main"><script type="application/json" data-selected-variant>${
    variant ? JSON.stringify(variant) : ''
  }</script></variant-selects>`;

function mainFixture({ state, variant, inventory, quantity = false, priceBreaks = false, shareUrl }) {
  const available = state.endsWith(':available');
  const inventoryMarkup = inventory ? `<p id="Inventory-main" role="status">${inventory}</p>` : '';
  const quantityMarkup = quantity
    ? `<div id="Quantity-Form-main" class="product-form__quantity">
        <label class="quantity__label">Quantity</label>
        <div class="price-per-item__container">
          <input class="quantity__input" id="Quantity-main" name="quantity" value="1" data-cart-quantity="0" data-min="1" min="1" step="1" form="product-form-main">
          ${
            priceBreaks
              ? '<price-per-item id="Price-Per-Item-main" data-section-id="main" data-variant-id="1"><div class="price-per-item"><span>$10 each</span></div></price-per-item>'
              : ''
          }
        </div>
        <div class="quantity__rules">Minimum 1</div>
        ${
          priceBreaks
            ? '<volume-pricing id="Volume-main"><ul><li><span>1+</span><span data-text="$10 each">$10 each</span></li><li><span>5+</span><span data-text="$8 each">$8 each</span></li></ul></volume-pricing>'
            : ''
        }
      </div>`
    : '';
  const region = available
    ? `<div id="PurchaseRegion-main" data-state-signature="${state}">${quantityMarkup}<product-form><form id="product-form-main"><input class="product-variant-id" name="id" value="${variant?.id || ''}"><button type="submit">Add</button></form></product-form><form id="product-form-installment-main"><input name="id" value="${variant?.id || ''}"></form></div>`
    : state.includes('in-store-only')
      ? ''
      : `<div id="PurchaseRegion-main" data-state-signature="${state}"><p class="product__purchase-status">${state.endsWith(':unavailable') ? 'Unavailable' : 'Sold out'}</p></div>`;
  const share = shareUrl ? `<share-button><input value="${shareUrl}"></share-button>` : '';

  const [productKind, purchaseMode, purchasability] = state.split(':');
  return `<product-info data-section="main" data-url="/products/fixture" data-update-url="true" data-product-context="main-pdp" data-product-kind="${productKind}" data-purchase-mode="${purchaseMode}" data-purchasability="${purchasability}" data-state-signature="${state}">
    <div class="product__info-container">
      ${selectedVariant(variant)}
      <div id="price-main">Price ${variant?.id || 'none'}</div>
      <template data-dynamic-fragment-anchor="Inventory"></template>${inventoryMarkup}
      ${share}${region}
    </div>
  </product-info>`;
}

function featuredFixture({ variantId, step, price }) {
  return `<product-info data-section="featured" data-url="/products/featured" data-update-url="false">
    <variant-selects id="FeaturedPicker" data-product-url="/products/featured"><script type="application/json" data-selected-variant>{"id":${variantId},"featured_media":null}</script></variant-selects>
    <div id="price-featured">${price}</div><p id="Sku-featured">SKU-${variantId}</p><p id="Inventory-featured">In stock</p>
    <div id="Quantity-Form-featured" class="product-form__quantity"><label class="quantity__label">Quantity</label><input class="quantity__input" id="Quantity-featured" name="quantity" value="1" data-cart-quantity="0" data-min="1" min="1" step="${step}" form="product-form-featured"><div class="quantity__rules">Step ${step}</div></div>
    <product-form><form id="product-form-featured"><input class="product-variant-id" name="id" value="${variantId}"><button type="submit">Add</button></form></product-form>
  </product-info>`;
}

async function boot(page, markup) {
  await page.route('http://fixture.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<main></main>' }),
  );
  await page.goto('http://fixture.test/');
  await page.addScriptTag({
    content: `
      window.PUB_SUB_EVENTS = { optionValueSelectionChange: 'option', cartUpdate: 'cart', quantityUpdate: 'quantity', variantChange: 'variant' };
      window.__subscribers = new Map();
      window.subscribe = (event, callback) => {
        const listeners = window.__subscribers.get(event) || [];
        listeners.push(callback);
        window.__subscribers.set(event, listeners);
        return () => window.__subscribers.set(event, (window.__subscribers.get(event) || []).filter((listener) => listener !== callback));
      };
      window.publish = (event, payload) => (window.__subscribers.get(event) || []).forEach((callback) => callback(payload));
      window.HTMLUpdateUtility = { viewTransition(current, updated) { current.replaceWith(updated.cloneNode(true)); } };
      window.SectionId = { parseId: (id) => id, getIdForSection: (id) => id };
      window.Shopify = { PaymentButton: { init() {} } };
      window.ProductModel = { loadShopifyXR() {} };
      window.variantStrings = { soldOut: 'Sold out', unavailable: 'Unavailable' };
      window.__cart = [];
      customElements.define('product-form', class extends HTMLElement {
        connectedCallback() {
          const form = this.querySelector('form');
          if (!form || form.dataset.fixtureBound) return;
          form.dataset.fixtureBound = 'true';
          form.addEventListener('submit', (event) => {
            event.preventDefault();
            const info = this.closest('product-info');
            window.__cart.push({
              id: Number(form.querySelector('[name="id"]').value),
              quantity: Number(info.querySelector('[name="quantity"]')?.value || 1),
            });
          });
        }
        get variantIdInput() { return this.querySelector('[name="id"]'); }
        toggleSubmitButton() {}
        handleErrorMessage() {}
      });
      customElements.define('share-button', class extends HTMLElement {
        updateUrl(url) { this.querySelector('input').value = url; this.urlToShare = url; }
      });
    `,
  });
  await page.addScriptTag({ path: pricePerItemScript });
  await page.addScriptTag({ path: productInfoScript });
  await page.locator('main').evaluate((node, html) => { node.innerHTML = html; }, markup);
}

async function applyMainResponse(page, markup) {
  await page.locator('product-info').evaluate((info, html) => {
    const response = new DOMParser().parseFromString(html, 'text/html');
    info.handleMainPdpUpdate(response, '/products/fixture');
  }, markup);
}

test('actual product-info removes stale inventory and inserts recovered inventory', async ({ page }) => {
  const available = mainFixture({ state: 'physical:online:available', variant: { id: 1 }, inventory: 'Low stock: 1 left', quantity: true });
  const soldOut = mainFixture({ state: 'physical:online:sold-out', variant: { id: 2 } });
  await boot(page, available);
  await applyMainResponse(page, soldOut);
  await expect(page.locator('#Inventory-main')).toHaveCount(0);

  await applyMainResponse(page, available);
  await expect(page.locator('#Inventory-main')).toHaveText('Low stock: 1 left');
});

for (const [label, state] of [
  ['null variant', 'physical:online:unavailable'],
  ['quantity-rule sold out', 'physical:online:sold-out'],
]) {
  test(`actual product-info recovers from ${label} to one working region`, async ({ page }) => {
    await boot(page, mainFixture({ state, variant: state.endsWith(':unavailable') ? null : { id: 2 } }));
    await applyMainResponse(page, mainFixture({ state: 'physical:online:available', variant: { id: 7 }, inventory: 'In stock', quantity: true }));
    await expect(page.locator('#PurchaseRegion-main')).toHaveCount(1);
    await expect(page.locator('#Quantity-main')).toHaveValue('1');
    await expect(page.locator('#product-form-main [name="id"]')).toHaveValue('7');
    await page.locator('#Quantity-main').fill('3');
    await page.locator('#product-form-main').evaluate((form) => form.requestSubmit());
    expect(await page.evaluate(() => window.__cart)).toEqual([{ id: 7, quantity: 3 }]);
  });
}

test('actual product-info and price-per-item update variant rules and quantity-break price', async ({ page }) => {
  await boot(page, mainFixture({ state: 'physical:online:available', variant: { id: 1 }, inventory: 'In stock', quantity: true, priceBreaks: true }));
  const response = mainFixture({ state: 'physical:online:available', variant: { id: 9 }, inventory: 'In stock', quantity: true, priceBreaks: true })
    .replaceAll('step="1"', 'step="2"')
    .replace('Minimum 1', 'Multiples of 2')
    .replace('data-variant-id="1"', 'data-variant-id="9"')
    .replaceAll('$10 each', '$12 each')
    .replaceAll('5+', '4+')
    .replaceAll('$8 each', '$9 each');
  await applyMainResponse(page, response);
  await expect(page.locator('#Quantity-main')).toHaveAttribute('step', '2');
  await expect(page.locator('#product-form-main [name="id"]')).toHaveValue('9');
  await expect(page.locator('#Price-Per-Item-main')).toHaveAttribute('data-variant-id', '9');
  await page.locator('#Quantity-main').fill('4');
  await page.locator('#Quantity-main').dispatchEvent('change');
  await expect(page.locator('#Price-Per-Item-main .price-per-item span')).toHaveText('$9 each');
});

test('actual product-info request token keeps the final response', async ({ page }) => {
  await boot(page, mainFixture({ state: 'physical:online:available', variant: { id: 1 }, quantity: true }));
  await page.evaluate(() => {
    const pending = [];
    window.fetch = (url) => new Promise((resolve) => pending.push({ url, resolve }));
    window.__pendingFetches = pending;
    const info = document.querySelector('product-info');
    info.renderProductInfo({ requestUrl: '/first', targetId: 'none', callback: () => { info.dataset.applied = 'first'; } });
    info.renderProductInfo({ requestUrl: '/second', targetId: 'none', callback: () => { info.dataset.applied = 'second'; } });
  });
  await page.evaluate(() => window.__pendingFetches[1].resolve({ text: async () => '<html></html>' }));
  await expect(page.locator('product-info')).toHaveAttribute('data-applied', 'second');
  await page.evaluate(() => window.__pendingFetches[0].resolve({ text: async () => '<html></html>' }));
  await page.waitForTimeout(20);
  await expect(page.locator('product-info')).toHaveAttribute('data-applied', 'second');
});

test('in-store share URL is correct initially and preserves view after variant update', async ({ page }) => {
  const initialUrl = 'https://example.test/products/fixture?variant=1&view=in-store-only';
  await boot(page, mainFixture({ state: 'physical:in-store-only:available', variant: { id: 1 }, shareUrl: initialUrl }));
  await expect(page.locator('share-button input')).toHaveValue(initialUrl);
  await applyMainResponse(page, mainFixture({ state: 'physical:in-store-only:available', variant: { id: 2 }, shareUrl: initialUrl }));
  const updated = await page.locator('share-button input').inputValue();
  expect(updated).toContain('variant=2');
  expect(updated).toContain('view=in-store-only');
});

test('featured product uses actual generic component path without URL or query leakage', async ({ page }) => {
  await boot(page, featuredFixture({ variantId: 11, step: 1, price: '$11' }));
  const initialUrl = page.url();
  const response = featuredFixture({ variantId: 22, step: 2, price: '$22' });
  await page.evaluate((html) => {
    window.fetch = async () => ({ text: async () => html });
    const picker = document.querySelector('#FeaturedPicker');
    publish(PUB_SUB_EVENTS.optionValueSelectionChange, {
      data: { event: { target: picker }, target: picker, selectedOptionValues: ['22'] },
    });
  }, response);
  await expect(page.locator('#product-form-featured [name="id"]')).toHaveValue('22');
  await expect(page.locator('#Quantity-featured')).toHaveAttribute('step', '2');
  await page.locator('#Quantity-featured').fill('4');
  await page.locator('#product-form-featured').evaluate((form) => form.requestSubmit());
  expect(await page.evaluate(() => window.__cart)).toEqual([{ id: 22, quantity: 4 }]);
  expect(page.url()).toBe(initialUrl);
  expect(page.url()).not.toContain('view=');
  expect(page.url()).not.toContain('variant=');
  expect(page.url()).not.toContain('option_values=');
});
