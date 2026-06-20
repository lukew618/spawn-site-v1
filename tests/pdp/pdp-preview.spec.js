const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const availablePath = '/products/70-veevus-power-thread?variant=40998159286335';
const soldPath = '/products/loctite-super-glue-extra-time-control';
const giftPath = '/products/spawn-fly-fish-gift-card?variant=39734797434943';
const zeroMediaPath = '/products/9ft-4wt-asquith-returned-brand-new';
const inStorePath = '/products/70-veevus-power-thread?view=in-store-only&variant=40998159286335';
const artifactDir = process.env.PDP_ARTIFACT_DIR || '/tmp/pdp-visuals';

fs.mkdirSync(artifactDir, { recursive: true });

function captureConsoleErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.includes('blocked by CORS policy') || text.includes('net::ERR_FAILED')) return;
    errors.push(text);
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function dispatchChecked(locator) {
  await locator.evaluate((element) => {
    element.checked = true;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function dismissConsent(page) {
  const decline = page.getByRole('button', { name: 'Decline' });
  if (await decline.count()) await decline.click({ force: true });
}

test('server-rendered purchase matrix is truthful', async ({ page }) => {
  await page.goto(availablePath);
  await expect(page.locator('product-info')).toHaveAttribute('data-state-signature', 'physical:online:available');
  await expect(page.locator('[id^="PurchaseRegion-"]')).toHaveCount(1);
  await expect(page.locator('[id^="Quantity-Form-"]')).toHaveCount(1);
  await expect(page.locator('product-form')).toHaveCount(1);
  await expect(page.locator('pickup-availability')).toHaveCount(1);
  await expect(page.locator('.product__trust-row')).toContainText('$85');

  await page.goto(soldPath);
  await expect(page.locator('product-info')).toHaveAttribute('data-state-signature', 'physical:online:sold-out');
  await expect(page.locator('.product__purchase-status')).toContainText('Sold out');
  await expect(page.locator('[id^="Quantity-Form-"], product-form, pickup-availability')).toHaveCount(0);

  await page.goto(giftPath);
  await expect(page.locator('product-info')).toHaveAttribute('data-state-signature', 'gift-card:online:available');
  await expect(page.locator('product-form')).toHaveCount(1);
  await expect(page.locator('pickup-availability, .product__trust-row')).toHaveCount(0);

  await page.goto(inStorePath);
  await expect(page.locator('product-info')).toHaveAttribute('data-state-signature', 'physical:in-store-only:available');
  await expect(page.getByText('Contact Spawn')).toBeVisible();
  await expect(page.locator('[id^="PurchaseRegion-"], product-form, pickup-availability')).toHaveCount(0);
});

test('available to sold out to available recovers one working region', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto(availablePath);
  const soldInput = page.locator('variant-selects input[type="radio"][value="Black"]');
  await dispatchChecked(soldInput);
  await expect(page.locator('product-info')).toHaveAttribute('data-state-signature', 'physical:online:sold-out');
  await expect(page.locator('.product__purchase-status')).toContainText('Sold out');
  await expect(page.locator('product-form, [id^="Quantity-Form-"]')).toHaveCount(0);

  const availableInput = page.locator('variant-selects input[type="radio"][value="Fl Chartreuse"]');
  await dispatchChecked(availableInput);
  await expect(page.locator('product-info')).toHaveAttribute('data-state-signature', 'physical:online:available');
  await expect(page.locator('[id^="PurchaseRegion-"]')).toHaveCount(1);
  await expect(page.locator('product-form')).toHaveCount(1);
  await expect(page.locator('[id^="Quantity-Form-"]')).toHaveCount(1);
  await expect(page.locator('input.product-variant-id').first()).toHaveValue('40998159286335');
  await page.locator('.quantity__input').fill('1');
  const addResponse = page.waitForResponse((response) => response.url().includes('/cart/add'));
  const cartNavigation = page.waitForURL(/\/cart$/);
  await page.locator('form[data-type="add-to-cart-form"]').evaluate((form) => form.requestSubmit());
  await addResponse;
  await cartNavigation;
  const cart = await page.evaluate(() => fetch('/cart.js').then((response) => response.json()));
  const addedLine = cart.items.find((item) => item.id === 40998159286335);
  expect(addedLine.quantity).toBe(1);
  expect(errors).toEqual([]);
});

test('gift card recipient values survive an available amount change', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto(giftPath);
  const checkbox = page.locator('[id^="Recipient-checkbox-"]');
  await expect(checkbox).toBeEnabled();
  await dispatchChecked(checkbox);
  await expect(checkbox).toBeChecked();
  await page.locator('[id^="Recipient-email-"]').fill('angler@example.com');
  await page.locator('[id^="Recipient-name-"]').fill('Test Angler');
  await page.locator('[id^="Recipient-message-"]').fill('Synthetic preview message');

  const amountInput = page.locator('variant-selects input[type="radio"][value="$50"]');
  await dispatchChecked(amountInput);
  await page.waitForTimeout(800);
  await expect(page.locator('product-info')).toHaveAttribute('data-state-signature', 'gift-card:online:available');
  await expect(page.locator('[id^="Recipient-checkbox-"]')).toBeChecked();
  await expect(page.locator('[id^="Recipient-email-"]')).toHaveValue('angler@example.com');
  await expect(page.locator('[id^="Recipient-name-"]')).toHaveValue('Test Angler');
  await expect(page.locator('input.product-variant-id').first()).toHaveValue('39734797467711');
  const addResponse = page.waitForResponse((response) => response.url().includes('/cart/add'));
  const cartNavigation = page.waitForURL(/\/cart$/);
  await page.locator('form[data-type="add-to-cart-form"]').evaluate((form) => form.requestSubmit());
  await addResponse;
  await cartNavigation;
  const cart = await page.evaluate(() => fetch('/cart.js').then((response) => response.json()));
  const giftLine = cart.items.find((item) => item.id === 39734797467711);
  expect(giftLine.properties['Recipient email']).toBe('angler@example.com');
  expect(giftLine.properties['Recipient name']).toBe('Test Angler');
  expect(giftLine.properties.Message).toBe('Synthetic preview message');
  expect(errors).toEqual([]);
});

test('in-store view survives variant normalization', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto(inStorePath);
  await page.locator('variant-selects select').selectOption({ value: 'Black' });
  await expect(page).toHaveURL(/view=in-store-only/);
  await expect(page.locator('product-info')).toHaveAttribute('data-purchase-mode', 'in-store-only');
  await expect(page.locator('product-form, [id^="PurchaseRegion-"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('media and responsive layout contracts hold', async ({ page }) => {
  await page.goto(zeroMediaPath);
  await expect(page.locator('media-gallery, .product__media-wrapper, product-modal')).toHaveCount(0);

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(availablePath);
  const media768 = await page.locator('.product__media-wrapper').boundingBox();
  const info768 = await page.locator('.product__info-wrapper').boundingBox();
  expect(info768.y).toBeGreaterThan(media768.y + media768.height - 2);

  await page.setViewportSize({ width: 990, height: 900 });
  await page.goto(availablePath);
  const media990 = await page.locator('.product__media-wrapper').boundingBox();
  const info990 = await page.locator('.product__info-wrapper').boundingBox();
  expect(Math.abs(info990.y - media990.y)).toBeLessThan(10);
  expect(info990.x).toBeGreaterThan(media990.x);

  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(availablePath);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('changed controls meet target size and screenshots are current', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(availablePath);
    await dismissConsent(page);
    const controls = page.locator('.product-form__input--pill label, .thumbnail');
    const controlCount = await controls.count();
    expect(controlCount).toBeGreaterThan(0);
    for (let index = 0; index < Math.min(controlCount, 14); index += 1) {
      const box = await controls.nth(index).boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: path.join(artifactDir, `available-${width}.png`) });
    await page.locator('.product__info-wrapper').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, `available-${width}-info.png`) });
  }

  await page.setViewportSize({ width: 375, height: 1000 });
  for (const [name, route] of [['sold-out', soldPath], ['gift-card', giftPath], ['in-store', inStorePath]]) {
    await page.goto(route);
    await dismissConsent(page);
    await page.locator('.product__info-wrapper').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, `${name}-375.png`) });
  }
});

test('enabled featured product keeps generic no-URL-update behavior', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto('/cart');
  const featured = page.locator('product-info[data-update-url="false"]');
  await expect(featured).toHaveCount(1);
  await expect(featured).not.toHaveAttribute('data-product-context', 'main-pdp');
  const initialUrl = page.url();
  const picker = featured.locator('variant-selects input[type="radio"], variant-selects select').first();
  if (await picker.count()) {
    if ((await picker.getAttribute('type')) === 'radio') await picker.check();
    else await picker.selectOption({ index: 1 });
    await expect(page).toHaveURL(initialUrl);
  }
  expect(errors).toEqual([]);
});

test('predecessor homepage, header, cards, proof band, and reduced motion remain intact', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await dismissConsent(page);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('header, sticky-header').first()).toBeVisible();
    await expect(page.locator('.why-spawn__item')).toHaveCount(3);
    const firstCardTitle = page.locator('.card__heading:visible').first();
    await firstCardTitle.scrollIntoViewIfNeeded();
    await expect(firstCardTitle).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(artifactDir, `predecessor-home-${width}.png`) });
  }
});
