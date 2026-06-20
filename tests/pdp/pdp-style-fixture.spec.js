const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const baseCss = fs.readFileSync(path.resolve(__dirname, '../../assets/base.css'), 'utf8');
const productCss = fs.readFileSync(path.resolve(__dirname, '../../assets/section-main-product.css'), 'utf8');
const variantCss = fs.readFileSync(path.resolve(__dirname, '../../assets/component-product-variant-picker.css'), 'utf8');
const artifactDir = process.env.PDP_LOCAL_ARTIFACT_DIR || '/tmp/pdp-local-visuals';
const evidencePath = path.join(artifactDir, 'capture-evidence.json');

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
    html { font-size: 62.5%; } body { margin: 0; min-height: 180rem; } .page-width { max-width: 120rem; margin: auto; padding: 3rem; } media-gallery { display: block; } .fixture-media-container { height: var(--pdp-tablet-media-height, 32rem); max-height: var(--pdp-tablet-media-height, 32rem); overflow: hidden; background: linear-gradient(135deg, #6ccf63, #257a3e); } .fixture-media-container .product__media { height: 100%; padding-top: 0; } .fixture-shell { position: fixed; inset: 0 0 auto; z-index: 20; color: #fff; } .fixture-announcement { height: 3.2rem; display: grid; place-items: center; background: #fff; color: #111; font-size: 1.1rem; letter-spacing: 0.08em; text-transform: uppercase; } .header { height: 7rem; display: flex; align-items: center; justify-content: space-between; padding-inline: 3rem; background: #111; color: #fff; font-size: 1.3rem; letter-spacing: 0.08em; text-transform: uppercase; } .fixture-brand { font-weight: 700; font-size: 1.6rem; } .fixture-breadcrumb { padding: 1.2rem 3rem; font-size: 1.1rem; letter-spacing: 0.05em; text-transform: uppercase; } .fixture-page-end { height: 70rem; border-top: 0.1rem solid #ddd; margin-top: 4rem; } product-info { padding-top: 12rem; } .fixture-consent { position: fixed; inset: auto 2rem 2rem; z-index: 30; display: none; max-width: 42rem; padding: 2rem; background: #202020; color: #fff; box-shadow: 0 0.8rem 2.4rem rgba(0,0,0,0.25); } .fixture-consent[data-open='true'] { display: block; } .fixture-consent button { min-height: 4.4rem; width: 100%; margin-top: 1rem; border: 0.1rem solid #fff; background: transparent; color: #fff; }
  </style></head><body><div class="fixture-shell" data-shell-state="ready"><div class="fixture-announcement">Free shipping on $85+ orders</div><header class="header"><span>Shop</span><span class="fixture-brand">Spawn Fly Fish</span><span>Search &nbsp; Cart</span></header></div>
    <div class="fixture-consent" role="dialog" aria-label="Cookie consent" data-open="false"><strong>Cookie consent</strong><p>Choose whether this deterministic preview stores optional cookies.</p><button type="button" data-decline-consent>Decline</button></div>
    <product-info class="color-scheme-1 product-color-scheme--fallback" data-product-context="main-pdp" data-product-kind="${productKind}" data-purchase-mode="${purchaseMode}">
      <div class="fixture-breadcrumb">Home / Fly Fishing / 70 Veevus Power Thread</div><div class="page-width"><div class="product product--medium grid grid--1-col grid--2-col-tablet">
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
    <div class="fixture-page-end" aria-hidden="true"></div>
    <script>setTimeout(() => document.querySelector('.fixture-consent').dataset.open = 'true', 50); document.querySelector('[data-decline-consent]').addEventListener('click', () => { document.querySelector('.fixture-consent').dataset.open = 'false'; document.querySelector('.fixture-shell').dataset.consent = 'dismissed'; });</script>
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

async function dismissFixtureConsent(page) {
  const consent = page.locator('.fixture-consent');
  await expect(consent).toHaveAttribute('data-open', 'true');
  await page.locator('[data-decline-consent]').click();
  await expect(consent).toHaveAttribute('data-open', 'false');
  await expect(page.locator('.fixture-shell')).toHaveAttribute('data-consent', 'dismissed');
}

async function shellEvidence(page, label, requireScroll) {
  const evidence = await page.evaluate(({ label }) => {
    const header = document.querySelector('.header').getBoundingClientRect();
    const shell = document.querySelector('.fixture-shell');
    const consent = document.querySelector('.fixture-consent');
    const target = document.querySelector('.product__title').getBoundingClientRect();
    return {
      label,
      viewport: { width: innerWidth, height: innerHeight },
      scrollY,
      documentHeight: document.documentElement.scrollHeight,
      header: { top: header.top, bottom: header.bottom, visible: header.width > 0 && header.height > 0 },
      targetTop: target.top,
      shellState: shell.dataset.shellState,
      consentState: shell.dataset.consent,
      consentOpen: consent.dataset.open,
    };
  }, { label });
  if (requireScroll) {
    expect(evidence.scrollY).toBeGreaterThan(0);
    expect(evidence.targetTop).toBeGreaterThanOrEqual(evidence.header.bottom + 8);
  }
  expect(evidence.header.visible).toBe(true);
  expect(evidence.consentState).toBe('dismissed');
  expect(evidence.consentOpen).toBe('false');
  console.log(`PDP fixture evidence ${JSON.stringify(evidence)}`);
  return evidence;
}

async function scrollBelowFixtureHeader(page, locator, label) {
  await locator.evaluate((element) => {
    const headerBottom = document.querySelector('.header').getBoundingClientRect().bottom;
    window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - headerBottom - 16);
  });
  return shellEvidence(page, label, true);
}

test('fallback product chrome is visible and decision content is compact', async ({ page }) => {
  const captureEvidence = [];
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.setContent(fixture());
    await dismissFixtureConsent(page);
    await page.evaluate(() => window.scrollTo(0, 0));
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
    captureEvidence.push(await shellEvidence(page, `available-${width}-top`, false));
    const topImage = await page.screenshot({ path: path.join(artifactDir, `local-available-${width}.png`) });
    captureEvidence.push(await scrollBelowFixtureHeader(page, page.locator('.product__title'), `available-${width}-info`));
    const infoImage = await page.screenshot({ path: path.join(artifactDir, `local-available-${width}-info.png`) });
    expect(topImage.equals(infoImage)).toBe(false);
  }

  await page.setViewportSize({ width: 375, height: 1000 });
  await page.setContent(fixture('sold-out'));
  await dismissFixtureConsent(page);
  await expectOpaqueChrome(page, 'sold-out');
  captureEvidence.push(await scrollBelowFixtureHeader(page, page.locator('.product__title'), 'sold-out-375-info'));
  await page.screenshot({ path: path.join(artifactDir, 'local-sold-out-375.png') });

  await page.setContent(fixture('gift-card'));
  await dismissFixtureConsent(page);
  await expectOpaqueChrome(page, 'gift-card');
  await expect(page.locator('pickup-availability, .product__trust-row')).toHaveCount(0);
  captureEvidence.push(await scrollBelowFixtureHeader(page, page.locator('.product__title'), 'gift-card-375-info'));
  await page.screenshot({ path: path.join(artifactDir, 'local-gift-card-375.png') });

  await page.setContent(fixture('in-store-only'));
  await dismissFixtureConsent(page);
  await expect(page.locator('.product-form__submit, quantity-input')).toHaveCount(0);
  await expect(page.getByText('Contact Spawn')).toBeVisible();
  captureEvidence.push(await scrollBelowFixtureHeader(page, page.locator('.product__title'), 'in-store-375-info'));
  await page.screenshot({ path: path.join(artifactDir, 'local-in-store-375.png') });

  fs.writeFileSync(evidencePath, `${JSON.stringify(captureEvidence, null, 2)}\n`);
});
