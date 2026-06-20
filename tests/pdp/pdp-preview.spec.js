const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const availablePath = '/products/70-veevus-power-thread?variant=40998159286335';
const soldPath = '/products/loctite-super-glue-extra-time-control';
const giftPath = '/products/spawn-fly-fish-gift-card?variant=39734797434943';
const zeroMediaPath = '/products/9ft-4wt-asquith-returned-brand-new';
const inStorePath = '/products/70-veevus-power-thread?view=in-store-only&variant=40998159286335';
const artifactDir = process.env.PDP_ARTIFACT_DIR || '/tmp/pdp-visuals';
const consentResolvedPages = new WeakSet();

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
  if (consentResolvedPages.has(page)) return;
  const consentHeading = page.getByText('Cookie consent', { exact: true });
  const decline = page.getByRole('button', { name: /^Decline$/ });

  await decline.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
  if (await decline.first().isVisible().catch(() => false)) {
    await decline.first().click({ force: true });
  }
  await page.waitForTimeout(500);
  if (await decline.first().isVisible().catch(() => false)) {
    await decline.first().click({ force: true });
  }
  await expect(consentHeading).toBeHidden({ timeout: 5000 });
  consentResolvedPages.add(page);
}

async function settleVisualPage(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await dismissConsent(page);
  await page.locator('product-info').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts?.ready);
  await expect(page.getByText('Cookie consent', { exact: true })).toBeHidden();
  await expect(page.locator('[role="dialog"]:visible').filter({ hasText: 'Cookie consent' })).toHaveCount(0);
}

async function scrollBelowHeader(page, locator) {
  await locator.evaluate((element) => {
    const header = document.querySelector('.header');
    const headerBottom = header?.getBoundingClientRect().bottom || 0;
    const top = element.getBoundingClientRect().top + window.scrollY - headerBottom - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  });
  await page.waitForTimeout(250);
  const header = await page.locator('.header').boundingBox();
  const target = await locator.boundingBox();
  expect(target.y).toBeGreaterThanOrEqual(header.y + header.height + 8);
}

async function expectValidProductChrome(page) {
  const productInfo = page.locator('product-info');
  const className = await productInfo.getAttribute('class');
  expect(className).toMatch(/(?:^|\s)color-[^\s]+/);
  const variables = await productInfo.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      foreground: styles.getPropertyValue('--color-foreground').trim(),
      button: styles.getPropertyValue('--color-button').trim(),
      background: styles.getPropertyValue('--color-background').trim(),
    };
  });
  expect(variables.foreground).not.toBe('');
  expect(variables.button).not.toBe('');
  expect(variables.background).not.toBe('');

  const cta = page.locator('.product-form__submit').first();
  await expect(cta).toBeVisible();
  const ctaStyles = await cta.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { background: styles.backgroundColor, width: element.getBoundingClientRect().width };
  });
  expect(ctaStyles.background).not.toBe('rgba(0, 0, 0, 0)');
  const regionWidth = await page.locator('.product__purchase-region').evaluate((element) => element.getBoundingClientRect().width);
  expect(ctaStyles.width).toBeGreaterThanOrEqual(regionWidth - 2);

  const pill = page.locator('.product-form__input--pill label').first();
  const pillBorder = await pill.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { style: styles.borderStyle, width: parseFloat(styles.borderWidth), color: styles.borderColor };
  });
  expect(pillBorder.style).not.toBe('none');
  expect(pillBorder.width).toBeGreaterThan(0);
  expect(pillBorder.color).not.toBe('rgba(0, 0, 0, 0)');
}

async function submitAndReadCart(page, form) {
  const addResponse = page.waitForResponse((response) => response.url().includes('/cart/add'));
  const navigation = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => null);
  await form.evaluate((element) => element.requestSubmit());
  expect((await addResponse).ok()).toBe(true);
  await navigation;
  return page.evaluate(() => fetch('/cart.js').then((response) => response.json()));
}

async function expectNoBlankReviewOrTextChrome(page) {
  await expect(page.locator('.rating-wrapper, .rating-wrapper--placeholder')).toHaveCount(0);
  await expect(page.getByText('Be the first to review', { exact: true })).toHaveCount(0);
  const blankTextWrappers = await page.locator('.product__text').evaluateAll((elements) =>
    elements.filter((element) => !element.textContent.trim()).length,
  );
  expect(blankTextWrappers).toBe(0);
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

test('blank reviews and text blocks render no chrome', async ({ page }) => {
  for (const route of [availablePath, soldPath, giftPath, zeroMediaPath, inStorePath]) {
    await page.goto(route);
    await expectNoBlankReviewOrTextChrome(page);
  }
});

test('unavailable options use visible text without whole-label strike-through', async ({ page }) => {
  await page.goto(availablePath);
  const unavailableLabel = page.locator('.product-form__input--pill input.disabled + label').first();
  await expect(unavailableLabel).toBeVisible();
  await expect(unavailableLabel.locator('.label-unavailable')).toContainText(/Unavailable|Sold out/);
  await expect(unavailableLabel).toHaveCSS('text-decoration-line', 'none');
});

test('available to sold out to available recovers one working region', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto(availablePath);
  const soldInput = page.locator('variant-selects input[type="radio"][value="Black"]');
  await dispatchChecked(soldInput);
  await expect(page.locator('product-info')).toHaveAttribute('data-state-signature', 'physical:online:sold-out');
  await expect(page.locator('.product__purchase-status')).toContainText('Sold out');
  await expect(page.locator('product-form, [id^="Quantity-Form-"]')).toHaveCount(0);
  await expect(page.locator('[id^="Inventory-"]')).toHaveCount(0);

  const availableInput = page.locator('variant-selects input[type="radio"][value="Fl Chartreuse"]');
  await dispatchChecked(availableInput);
  await expect(page.locator('product-info')).toHaveAttribute('data-state-signature', 'physical:online:available');
  await expect(page.locator('[id^="PurchaseRegion-"]')).toHaveCount(1);
  await expect(page.locator('product-form')).toHaveCount(1);
  await expect(page.locator('[id^="Quantity-Form-"]')).toHaveCount(1);
  await expect(page.locator('[id^="Inventory-"]')).toHaveCount(1);
  await expect(page.locator('input.product-variant-id').first()).toHaveValue('40998159286335');
  await page.locator('.quantity__input').fill('1');
  const cart = await submitAndReadCart(page, page.locator('form[data-type="add-to-cart-form"]'));
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
  const cart = await submitAndReadCart(page, page.locator('form[data-type="add-to-cart-form"]'));
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
    await settleVisualPage(page, availablePath);
    await expectValidProductChrome(page);
    const controls = page.locator('.product-form__input--pill label, .thumbnail');
    const controlCount = await controls.count();
    expect(controlCount).toBeGreaterThan(0);
    for (let index = 0; index < Math.min(controlCount, 14); index += 1) {
      const box = await controls.nth(index).boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    if (width === 768) {
      for (const locator of [page.locator('.product__title'), page.locator('[id^="price-"]'), page.locator('variant-selects')]) {
        const box = await locator.boundingBox();
        expect(box.y).toBeLessThan(1000);
      }
      const stickyPositions = await page.locator('.product__column-sticky').evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).position),
      );
      expect(stickyPositions.every((position) => position === 'static')).toBe(true);
    }
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: path.join(artifactDir, `available-${width}.png`) });
    const infoEvidence = page.locator('.product__title');
    await scrollBelowHeader(page, infoEvidence);
    await page.screenshot({ path: path.join(artifactDir, `available-${width}-info.png`) });
  }

  await page.setViewportSize({ width: 375, height: 1000 });
  for (const [name, route] of [['sold-out', soldPath], ['gift-card', giftPath], ['in-store', inStorePath]]) {
    await settleVisualPage(page, route);
    await scrollBelowHeader(page, page.locator('.product__title'));
    if (name === 'sold-out') {
      const statusBorder = await page.locator('.product__purchase-status').evaluate((element) => {
        const styles = getComputedStyle(element);
        return { style: styles.borderStyle, width: parseFloat(styles.borderWidth), color: styles.borderColor };
      });
      expect(statusBorder.style).not.toBe('none');
      expect(statusBorder.width).toBeGreaterThan(0);
      expect(statusBorder.color).not.toBe('rgba(0, 0, 0, 0)');
    } else if (name === 'gift-card') {
      await expectValidProductChrome(page);
    }
    await page.screenshot({ path: path.join(artifactDir, `${name}-375.png`) });
  }
});

test('enabled featured product adds through the generic path without URL leakage', async ({ page }) => {
  const errors = captureConsoleErrors(page);
  await page.goto('/cart');
  const featured = page.locator('product-info[data-update-url="false"]');
  await expect(featured).toHaveCount(1);
  await expect(featured).not.toHaveAttribute('data-product-context', 'main-pdp');
  const initialUrl = page.url();
  const variantInput = featured.locator('form[data-type="add-to-cart-form"] input[name="id"]');
  const initialVariantId = await variantInput.inputValue();
  const picker = featured.locator('variant-selects input[type="radio"], variant-selects select').first();
  if (await picker.count()) {
    if ((await picker.getAttribute('type')) === 'radio') {
      const alternate = featured.locator('variant-selects input[type="radio"]:not(:checked)').first();
      if (await alternate.count()) await dispatchChecked(alternate);
    } else if ((await picker.locator('option').count()) > 1) {
      await picker.selectOption({ index: 1 });
    }
    await expect(page).toHaveURL(initialUrl);
  }
  const selectedVariantId = Number(await variantInput.inputValue());
  expect(selectedVariantId).toBeGreaterThan(0);
  const cart = await submitAndReadCart(page, featured.locator('form[data-type="add-to-cart-form"]'));
  expect(cart.items.some((item) => item.id === selectedVariantId)).toBe(true);
  expect(page.url()).toBe(initialUrl);
  expect(page.url()).not.toMatch(/[?&](view|variant|option_values)=/);
  expect(initialVariantId).not.toBe('');
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
