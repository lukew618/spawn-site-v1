# Spawn Fly Fish — Agent Backlog

Tasks are worked top-to-bottom. Bugs before improvements before enhancements.
Check off each task when shipped. Add new tasks at the appropriate priority level.

---

## Bugs

- [x] **Skip-to-content link hidden** — `layout/theme.liquid` has a skip-to-content link with `hidden` attribute. Remove `hidden`, style it as visually-hidden by default and visible on focus (WCAG 2.1 AA). Acceptance: keyboard Tab from any page focuses the skip link first, pressing Enter jumps to `#MainContent`.

- [x] **Mobile nav drawer focus trap missing** — When the mobile drawer is open, Tab should cycle only within the drawer. Currently focus escapes to the page behind. Fix in `assets/drawer-menu.js`: trap focus on open, release on close. Acceptance: with drawer open, repeated Tab never leaves the drawer; Escape closes it.

- [ ] **Cart drawer missing aria-live region** — Cart item count updates silently. Wrap the count element in `aria-live="polite"` so screen readers announce changes. Acceptance: `shopify theme check` passes, count element has live region.

---

## Improvements

- [ ] **Variant picker swatches on PDP** — Replace the default Dawn dropdown variant picker with visual color swatches. Use CSS-only approach: render a swatch `<button>` for each variant option value, style with `background-color` from variant option name (map common color names to hex). Out-of-stock variants: strikethrough style + `disabled`. Acceptance: PDP shows swatches not a `<select>`, selecting a swatch updates price/image, OOS variants are visually distinct.

- [ ] **Collection descriptions** — Collection pages currently show no description text. Add a description block below the collection heading in `sections/main-collection-banner.liquid` (or equivalent). Pull from `collection.description`. Only render if non-empty. Acceptance: a collection with a description set in Shopify admin shows it on the page.

- [ ] **Mobile product thumbnails** — On PDP mobile, the thumbnail strip below the main image is too small and clips. Increase thumb size to min 60px, ensure horizontal scroll works with touch. Acceptance: at 375px viewport, thumbnails are visible and scrollable.

- [ ] **Duplicate SEO meta copy** — The page `<title>` and `og:title` are duplicating the store name (e.g. "Product Name — Spawn Fly Fish — Spawn Fly Fish"). Audit `layout/theme.liquid` meta tags and fix the duplication. Acceptance: `<title>` on a product page contains the product name + store name exactly once each.

- [ ] **Footer: add navigation links** — Footer currently has minimal content. Add a nav section with columns: Shop (link to /collections/all), About (link to /pages/about if exists, else skip), Contact (link to /pages/contact if exists), and social icons (Instagram, Facebook — use existing SVG assets if present). Acceptance: footer renders columns at desktop, stacks at mobile.

- [ ] **Collection page: empty state** — If a collection has no products (e.g. filtered to zero), there's no message. Add a friendly "No products found" empty state with a "Clear filters" link. Acceptance: empty collection shows the message, not a blank grid.

- [ ] **Product card: hover quick-view indicator** — On desktop, hovering a product card should show a subtle overlay with "Quick view" or just darken the image. CSS-only. No modal needed — just a visual cue that the card is interactive. Acceptance: hover produces visible feedback, no JS required.

---

## Enhancements

- [ ] **Breadcrumbs on PDP and collection pages** — Add a breadcrumb trail (`Home > Collection > Product`) above the page heading on product and collection templates. Use `breadcrumb` schema markup for SEO. Acceptance: breadcrumbs render on product and collection pages, schema markup present in source.

- [ ] **Homepage: add "Why Spawn" section** — Below the hero, add a simple 3-column trust/values section: icons + short copy (e.g. "Expert-Curated Gear", "Ships from the Pacific NW", "Fly Fishing Specialists"). Use inline SVGs. Make it a proper Shopify section with editable text in the theme editor. Acceptance: section renders on homepage, all 3 blocks editable in theme editor.

- [ ] **Collection page: improve grid spacing** — Product grid has inconsistent gap at mobile (gaps collapse too tight). Standardize to `gap: 1.5rem` on mobile, `gap: 2rem` on desktop. Acceptance: grid looks even at 375px and 1280px.

- [ ] **Product reviews placeholder** — `show_rating: true` is not yet enabled and no reviews app is installed. Until an app is installed, add a placeholder star rating display (5 empty stars + "Be the first to review") below the product title. Make it conditional: only show if no metafield review data exists. Acceptance: PDP shows placeholder when no reviews present, placeholder disappears gracefully once an app provides data.

---

## Blocked (requires manual action)

- [ ] **Install product reviews app** — Needs a decision on Judge.me vs Okendo and manual install from Shopify App Store. Not automatable. Flag for Luke.
