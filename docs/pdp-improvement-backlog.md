# PDP Improvement Backlog

Status as of 2026-07-02. Written for whoever (human or agent) picks up product
detail page work next. Read `.claude/CLAUDE.md` first for theme rules and the
deploy workflow; note theme `129377796159` currently reports `role: "live"` on
push, so every push is a production deploy.

## Shipped 2026-07-02 (context, don't redo)

Conversion release combining Amazon buy-box mechanics and Filson editorial
layout — commits `b009bdb`..`fb1e318`:

- **Sticky add-to-cart bar** — `sections/sticky-atc-bar.liquid`,
  `assets/sticky-atc.js`, `assets/component-sticky-atc.css`. Appears after
  scrolling past the buy buttons (rAF scroll listener, not
  IntersectionObserver — see Gotchas in CLAUDE.md), mirrors the main form's
  price/disabled/sold-out state via MutationObserver, submits the main
  product form so the cart drawer opens.
- **"Save N%" badge** — `snippets/price.liquid` `show_savings` param, passed
  only from `sections/main-product.liquid`. Sold-out badge wins over it
  (stock Dawn behavior, intentional).
- **Buy-box reorder** in `templates/product.json`: price → variant picker →
  quantity → inventory urgency → buy buttons → trust icons ($75 shipping /
  free returns / ships from Ilwaco) → complementary "WORKS WITH" block.
- **Editorial band** — `sections/product-editorial.liquid`. Full-width,
  below the gallery: small uppercase title, description intro row, then a
  3-column row (Key Features | Product Details | Brand + Shipping stack)
  split server-side from the description's `<h2>` structure. Falls back
  gracefully for unstructured descriptions. Brand/shipping copy are section
  settings.
- **`sections/product-specs.liquid` exists but is unused** — removed from the
  template in favor of the editorial columns; still available in the Theme
  Editor.
- The old DESCRIPTION & FEATURES accordion block is kept `disabled` in
  `templates/product.json` for recovery.

## Backlog, in priority order

### 1. Reviews (highest impact, no theme code)
The rating block in `main-product` is already wired to
`product.metafields.reviews.rating` and renders a "Be the first to review"
placeholder. Install a review app (Judge.me or Shopify Reviews) that writes
those metafields and the block lights up, plus SERP stars via existing
structured data. Consider hiding the placeholder until an app is installed —
a prior audit (vault: Spawn-PDP-Enhancements) flagged the empty-stars state
as noise.

### 2. Complementary products data (no theme code)
The "WORKS WITH" block (`complementary_worksWith` in `templates/product.json`,
quick-add enabled) renders nothing until complementary relationships are set
in the Search & Discovery app. Merchandising task: dubbing → hooks + cement,
rods → lines + reels, etc.

### 3. Free-shipping threshold consistency — NEEDS LUKE'S DECISION
Announcement bar says **$85**; cart drawer math
(`snippets/cart-drawer.liquid`, `free_shipping_threshold = 7500`), footer
multicolumn, and PDP trust icons all say **$75**. A prior audit also found
$49 in in-store template content. Confirm the real policy, then align the
announcement bar (in `sections/header-group.json` / theme editor content)
and any stragglers.

### 4. Product videos from the YouTube channel
Spawn has a YouTube channel with product/tying content. Add a metafield-driven
video section (e.g. `custom.product_video_url`), same hidden-when-empty
pattern as `product-editorial`. Start by populating the top ~20 sellers.

### 5. Variant image swatches
Color-heavy products (e.g. `mfc-mottled-schlappen`, 27 colorways) render as
text pills; shoppers can't see colors. Dawn 15 supports swatches via variant
images or color metafields (`variant_picker` block, `swatch_shape` setting +
swatch data). Also from the prior audit: pills measure ~36px, below the 44px
touch-target standard; unavailable variants rely on strikethrough only.

### 6. Selected-variant-only description
`custom_liquid_nE4Abq` in `templates/product.json` loops ALL variants and
prints every `variant.metafields.custom.variant_description` stacked. Should
render only the selected variant's and update on variant change (Dawn
re-renders the section on variant change, so a Liquid-side filter on
`product.selected_or_first_available_variant` may be enough).

### 7. Spec tables for rods/reels
Big-ticket purchases are spec-driven (length, weight, action, capacity).
Metafield-driven spec table, could reuse the dormant
`sections/product-specs.liquid`. Main cost is catalog data entry.

### 8. Data cleanup
- Trailing empty items in `custom.all_product_features_bullets` (visible on
  spawn-unreal-dub).
- Populate `descriptors.subtitle` on flagship products — the editorial band
  uses it as a per-product headline instead of the generic
  "Description & Features".

## Related prior work
- Vault note `Memory/Projects/Spawn-PDP-Enhancements.md` (2026-06-19 audit):
  correctness gaps on sold-out/gift-card/in-store-only states, tablet
  750–989px compression, generic SEO banner weight. Still mostly unaddressed.
- Draft plans in `.agents/plans/draft/pdp-*.md` cover overlapping ground.
