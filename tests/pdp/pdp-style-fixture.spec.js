const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const baseCss = fs.readFileSync(path.resolve(__dirname, '../../assets/base.css'), 'utf8');
const productCss = fs.readFileSync(path.resolve(__dirname, '../../assets/section-main-product.css'), 'utf8');
const variantCss = fs.readFileSync(path.resolve(__dirname, '../../assets/component-product-variant-picker.css'), 'utf8');
const artifactDir = process.env.PDP_LOCAL_ARTIFACT_DIR || '/tmp/pdp-local-visuals';

fs.mkdirSync(artifactDir, { recursive: true });

function fixture(state = 'available') {
  const available = state === 'available' || state === 'gift-card';
  const purchaseMode = state === 'in-store-only' ? 'in-store-only' : 'online';
  const productKind = state === 'gift-card' ? 'gift-card' : 'physical';
  let purchaseMarkup = '<p class="product__purchase-status">Sold out</p>';
  if (state === 'in-store-only') {
    purchaseMarkup = '<p class="product__text">Available for in-store purchase. <a href="#">Contact Spawn</a> to confirm current stock.</p>';
  } else if (available) {
    purchaseMarkup = `<div class="product-form__input product-form__quantity"><label class="form__label">Quantity</label><quantity-input class="quantity"><button class="quantity__button">-</button><input class="quantity__input" value="1"><button class="quantity__button">+</button></quantity-input></div><product-form class="product-form">${state === 'gift-card' ? '<label class="recipient-checkbox"><input type="checkbox"> I want to send this as a gift</label>' : ''}<div class="product-form__buttons"><button class="product-form__submit button button--full-width button--primary">Add to cart</button></div></product-form><form class="installment caption-large">Pay over time with Shop Pay</form>${state === 'gift-card' ? '' : '<pickup-availability class="product__pickup-availabilities">Pickup available at Ilwaco Fly Shop</pickup-availability><div class="product__trust-row"><a href="#">Free shipping on orders of $85 or more</a><a href="#">Straightforward returns</a></div>'}`;
  }
  return `<!doctype html><html><head><style>
    ${baseCss}\n${productCss}\n${variantCss}
    :root { --font-body-scale: 1; --font-heading-scale: 1; --font-body-family: Arial, sans-serif; --font-heading-family: Arial, sans-serif; --font-body-style: normal; --font-body-weight: 400; --font-heading-style: normal; --font-heading-weight: 600; --duration-short: 100ms; --buttons-radius: 2px; --buttons-radius-outset: 2px; --buttons-border-width: 1px; --buttons-border-opacity: 1; --buttons-shadow-horizontal-offset: 0px; --buttons-shadow-vertical-offset: 0px; --buttons-shadow-blur-radius: 0px; --buttons-shadow-opacity: 0; --buttons-shadow-visible: 0; --inputs-radius: 2px; --inputs-radius-outset: 2px; --inputs-border-width: 1px; --inputs-border-opacity: 0.35; --inputs-shadow-horizontal-offset: 0px; --inputs-shadow-vertical-offset: 0px; --inputs-shadow-blur-radius: 0px; --inputs-shadow-opacity: 0; --variant-pills-border-width: 1px; --variant-pills-border-opacity: 0.3; --variant-pills-radius: 2px; --variant-pills-shadow-horizontal-offset: 0px; --variant-pills-shadow-vertical-offset: 0px; --variant-pills-shadow-blur-radius: 0px; --variant-pills-shadow-opacity: 0; }
    html { font-size: 62.5%; } body { margin: 0; } .page-width { max-width: 120rem; margin: auto; padding: 3rem; } media-gallery { display: block; } .fixture-media-container { height: var(--pdp-tablet-media-height, 32rem); max-height: var(--pdp-tablet-media-height, 32rem); overflow: hidden; background: linear-gradient(135deg, #6ccf63, #257a3e); } .fixture-media-container .product__media { height: 100%; padding-top: 0; } .header { position: fixed; inset: 0 0 auto; height: 7rem; background: #111; z-index: 10; } product-info { padding-top: 8rem; }
  </style></head><body><div class="header"></div>
    <product-info class="color-scheme-1 product-color-scheme--fallback" data-product-context="main-pdp" data-product-kind="${productKind}" data-purchase-mode="${purchaseMode}">
      <div class="page-width"><div class="product product--medium grid grid--1-col grid--2-col-tablet">
        <div class="product__media-wrapper grid__item"><media-gallery class="product__column-sticky"><div class="product-media-container constrain-height media-fit-contain fixture-media-container" style="--preview-ratio: 1"><div class="product__media media"></div></div></media-gallery></div>
        <div class="product__info-wrapper grid__item"><section class="product__info-container product__column-sticky">
          <div class="product__title"><h1>70 Veevus Power Thread</h1></div><div id="price-main"><div class="price price--large">$4.25 USD</div></div>
          <variant-selects><fieldset class="product-form__input product-form__input--pill"><legend class="form__label">Color: Fl Chartreuse</legend><input id="black" type="radio" name="color"><label for="black">Black<span class="label-unavailable">Unavailable</span></label><input id="chartreuse" type="radio" name="color" checked><label for="chartreuse">Fl Chartreuse</label></fieldset></variant-selects>
          <div class="product__purchase-region">
            ${purchaseMarkup}
          </div>
        </section></div>
      </div></div>
    </product-info>
  </body></html>`;
}

async function expectOpaqueChrome(page, state) {
  const info = page.locator('product-info');
  for (const property of ['--color-foreground', '--color-background', '--color-button']) {
    expect((await info.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name).trim(), property))).not.toBe('');
  }
  const bordered = state === 'sold-out' ? page.locator('.product__purchase-status') : page.locator('label[for="chartreuse"]');
  await expect(bordered).toHaveCSS('border-style', 'solid');
  if (state === 'available' || state === 'gift-card') {
    const button = page.locator('.product-form__submit');
    expect(await button.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    const [buttonBox, regionBox] = await Promise.all([button.boundingBox(), page.locator('.product__purchase-region').boundingBox()]);
    expect(buttonBox.width).toBeGreaterThanOrEqual(regionBox.width - 2);
  }
}

async function scrollBelowFixtureHeader(page, locator) {
  await locator.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 86));
  const [headerBottom, target] = await Promise.all([
    page.locator('.header').evaluate((element) => element.getBoundingClientRect().bottom),
    locator.boundingBox(),
  ]);
  expect(target.y).toBeGreaterThanOrEqual(headerBottom + 8);
}

test('fallback product chrome is visible and decision content is compact', async ({ page }) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.setContent(fixture());
    await expectOpaqueChrome(page, 'available');
    if (width === 768) {
      const stickyPositions = await page.locator('.product__column-sticky').evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).position),
      );
      expect(stickyPositions.every((position) => position === 'static')).toBe(true);
      const mediaMetrics = await page.locator('.fixture-media-container').evaluate((element) => {
        const styles = getComputedStyle(element);
        return { boxHeight: element.getBoundingClientRect().height, height: styles.height, maxHeight: styles.maxHeight };
      });
      const mediaHeight = mediaMetrics.boxHeight;
      expect(mediaHeight).toBeGreaterThanOrEqual(280);
      expect(mediaHeight, JSON.stringify(mediaMetrics)).toBeLessThanOrEqual(340);
      for (const locator of [page.locator('.product__title'), page.locator('#price-main'), page.locator('variant-selects')]) {
        expect((await locator.boundingBox()).y).toBeLessThan(1000);
      }
    }
    await page.screenshot({ path: path.join(artifactDir, `local-available-${width}.png`) });
    await scrollBelowFixtureHeader(page, page.locator('.product__title'));
    await page.screenshot({ path: path.join(artifactDir, `local-available-${width}-info.png`) });
  }

  await page.setViewportSize({ width: 375, height: 1000 });
  await page.setContent(fixture('sold-out'));
  await expectOpaqueChrome(page, 'sold-out');
  await scrollBelowFixtureHeader(page, page.locator('.product__title'));
  await page.screenshot({ path: path.join(artifactDir, 'local-sold-out-375.png') });

  await page.setContent(fixture('gift-card'));
  await expectOpaqueChrome(page, 'gift-card');
  await expect(page.locator('pickup-availability, .product__trust-row')).toHaveCount(0);
  await scrollBelowFixtureHeader(page, page.locator('.product__title'));
  await page.screenshot({ path: path.join(artifactDir, 'local-gift-card-375.png') });

  await page.setContent(fixture('in-store-only'));
  await expect(page.locator('.product-form__submit, quantity-input')).toHaveCount(0);
  await expect(page.getByText('Contact Spawn')).toBeVisible();
  await scrollBelowFixtureHeader(page, page.locator('.product__title'));
  await page.screenshot({ path: path.join(artifactDir, 'local-in-store-375.png') });
});
