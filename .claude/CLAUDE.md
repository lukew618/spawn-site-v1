# Spawn Fly Fish — Shopify Theme

## Project
Fly fishing retailer (Ilwaco, WA). Dawn v15.2.0 base theme with custom header scroll behavior, free shipping bar, and in-store-only template. Store: spawn-fly-fish.myshopify.com. `SHOPIFY_FLAG_STORE` is already exported in `~/.zshrc`.

## Commands
```bash
shopify theme dev --theme=129377796159       # local dev with hot reload
shopify theme push --theme=129377796159      # deploy to Shopify
shopify theme pull --theme=129377796159      # sync from Shopify (do before starting work)
shopify theme check                          # lint — must pass clean before every commit
```

## Architecture (OS2)
- **JSON templates** (`templates/*.json`) — define page structure, reference sections. No Liquid here.
- **Sections** (`sections/*.liquid`) — rendering logic + `{% schema %}`. Unit of merchant customization.
- **Snippets** (`snippets/*.liquid`) — single-purpose partials. Max 2 nesting levels.
- **Assets** — CSS/JS only. No Liquid in assets.

No build step. Edit files directly — no webpack, Vite, or compilation.

## Liquid Rules

**Always `{% render %}`, never `{% include %}`** — `include` is deprecated and leaks variable scope.

```liquid
{% # Correct %}
{% render 'product-card', product: product %}

{% # Wrong — never do this %}
{% include 'product-card' %}
```

**Paginate all loops over collections:**
```liquid
{% paginate collection.products by 24 %}
  {% for product in collection.products %}...{% endfor %}
{% endpaginate %}
```

**Cache repeated computations:**
```liquid
{% assign discounted = product.price | times: 0.8 %}  {%- # not repeated inline -%}
```

**Never:** iterate `all_products` or `collections.all` unpaginated, filter large arrays in Liquid (use collection filtering), nest `{% if %}` more than 3 levels deep without extracting to a snippet.

## Performance Rules

**Images — non-negotiable:**
```liquid
{%- # Above-the-fold / LCP image -%}
{{ section.settings.image | image_url: width: 1500 | image_tag:
   loading: 'eager',
   fetchpriority: 'high',
   preload: true,
   widths: '375,750,1100,1500',
   sizes: '100vw',
   alt: section.settings.image.alt | escape }}

{%- # Below-the-fold (product cards, etc.) -%}
{{ product.featured_image | image_url: width: 600 | image_tag:
   loading: 'lazy',
   widths: '200,300,400,600',
   sizes: '(min-width: 750px) 25vw, 50vw',
   alt: product.featured_image.alt | default: product.title | escape }}
```
- Always `image_url` + `image_tag` — never raw `<img src>` or hardcoded CDN URLs.
- Always `widths:` for srcset. Always explicit `alt`. Always `width` + `height` to prevent CLS.
- LCP images: `loading: 'eager'` + `fetchpriority: 'high'`. Everything else: `loading: 'lazy'`.

**CSS:**
- Load section CSS at the top of its section file: `{{ 'component-name.css' | asset_url | stylesheet_tag }}`
- Only global/critical CSS in `theme.liquid`.
- CSS custom properties for all color/spacing values — no hardcoded hex.
- No `!important` except documented third-party overrides.

**JavaScript:**
- All `<script>` tags: `defer` or `async`. No parser-blocking scripts in `<head>`.
- New JS bundles: under 16KB minified.
- Prefer CSS for transitions, hover states, toggles — only reach for JS when necessary.
- Dawn's Web Component pattern is the standard. No jQuery.
- Lazy-load third-party widgets (reviews, chat, upsells) — never block initial render.

## Accessibility (WCAG 2.1 AA — Minimum)
- Color contrast: 4.5:1 body text, 3:1 large text and interactive elements.
- Focus states: never `outline: none` without a visible custom replacement.
- All interactive elements keyboard-operable. Focus trapped inside modals/drawers.
- `aria-label` on icon-only buttons. `aria-expanded` on toggles. `aria-live="polite"` on dynamic regions (cart count, filter results, error messages).
- Every `<input>` has an associated `<label>` — not just placeholder text.
- Skip-to-content link is the first focusable element on every page.

## Section Schema Standards
- All label/info strings use `t:` translation keys — never hardcoded English in schema.
- Every setting has a `default` value.
- Use `header` type blocks to group settings in the editor.
- Blocks: composable and single-purpose (a "Button" block, not a "Hero Content" block).
- Include `{ "type": "@app" }` in blocks array for any section that could benefit from app injection.
- `disabled_on` group restrictions where appropriate (e.g., no testimonials section in header group).

## Cart & UX Patterns
- Add-to-cart opens cart drawer — never redirect to `/cart`.
- Cart updates via Section Rendering API — not manual DOM manipulation.
- Out-of-stock surfaced at variant selection, not at add-to-cart.
- Errors display inline — never `alert()`.
- Free shipping threshold bar visible in cart drawer ($49 threshold).
- Checkout button always visible on mobile without scrolling.

## Mobile-First
- Base styles for mobile, `min-width` media queries up. Dawn breakpoints: `750px` / `990px` / `1200px`.
- Minimum touch target: 44×44px.
- All `<input>` elements: `font-size: 16px` minimum (prevents iOS auto-zoom).
- No hover-only interactions — always a tap equivalent.

## Off-Limits Files
Handle with care (Theme Editor owns these):
- `config/settings_data.json` — prefer editing section/template JSON directly.

## Key Customizations — Don't Break
- **Scroll header:** `assets/header-scroll.js` + `.site-header--homepage` class in `sections/header.liquid` — transparent on homepage, solid on scroll/other pages.
- **Free shipping bar:** `assets/component-free-shipping-bar.css` rendered in `snippets/cart-drawer.liquid`.
- **In-store-only template:** `templates/product.in-store-only.json` — no buy buttons by design.
- **Hero collection template:** `templates/collection.hero-collection.json` — image from `collection.metafields.custom.collection_hero_image`.

## Metafield Namespaces
- `custom.*` — site-specific (product features, description, bullets, variant descriptions, collection hero)
- `mm-google-shopping.*` — Google Shopping feed (don't modify)
- `shopify--discovery--*` — Shopify native search/recommendations (don't modify)
- `descriptors.*` — Shopify standard subtitle, etc.

## Pre-Commit Checklist
Run before every commit, no exceptions:
- [ ] `shopify theme check` — zero errors, zero unacknowledged warnings
- [ ] All images: `alt` attribute present, `image_url` + `image_tag` used
- [ ] No `{% include %}` anywhere in changed files
- [ ] No hardcoded hex colors — CSS custom properties only
- [ ] New `<script>` tags have `defer` or `async`
- [ ] LCP image (if modified): `loading: 'eager'`, `fetchpriority: 'high'`
- [ ] New schema settings use `t:` translation keys with `default` values
- [ ] Interactive elements keyboard-accessible
- [ ] Tested at 375px mobile viewport

## Commit Format
```
type(scope): short description

Types: feat | fix | perf | refactor | style | chore
Scope: section, snippet, asset, template, config

Examples:
feat(product-card): add metafield block for size chart
fix(cart-drawer): resolve focus trap on mobile
perf(hero): preload LCP image, add proper srcset
chore(snippets): migrate include to render in featured-collection
```

## Security
- Never commit `.env`, API keys, or Shopify Admin credentials — store secrets in environment variables only.
- Never put Admin API tokens in Liquid, JS assets, or any file that ships to the browser.
- `SHOPIFY_FLAG_STORE` is safe to export in `~/.zshrc` — it's a store domain, not a secret.
- `.shopifyignore` controls what gets pushed — check it before adding sensitive config files.

## Gotchas
- **Unused React in `package.json`** — `react` and `@types/react` are installed but not used. Don't add React-based code to this theme.
- **`git_commit_template.md` in `/assets/`** — accidentally committed, not a theme file. Do not reference or deploy it.
- **Theme Editor vs. code** — changes made in the Shopify Theme Editor land in `config/settings_data.json`. Always `shopify theme pull` before starting work or you'll clobber editor changes.
- **Shopify's strict Liquid parser** — all Liquid must be syntactically valid or the theme will fail to publish. `shopify theme check` catches this.
- **Three theme IDs exist** (main live: `128853147711`, staging: `128878903359`) — but this repo tracks spawn-store-v1 (`129377796159`) exclusively. Never push to the other IDs from this workflow.

## Workflow
1. `shopify theme pull --theme=129377796159` — sync before starting
2. Make changes
3. Run pre-commit checklist
4. `shopify theme push --theme=129377796159` — deploy
5. Commit + push to GitHub

## Self-Improvement Rule
After any correction or mistake by Claude: append the fix as a new rule to this file so the same mistake never happens twice. Claude writes the rule itself at the end of the relevant section.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
