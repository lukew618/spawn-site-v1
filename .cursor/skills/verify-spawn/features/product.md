# Product

Product shows the product template's fixed copy. The product title, price, and media come from the shop and are absent here.

## Sub-features

- `product-open` opens the product template.
- `product-copy` shows the editorial headings stored on the template.
- `product-desktop` captures the page at 1440 by 900.
- `product-mobile` captures the page at 390 by 844.

## How to get to it (user POV)

- Open the product URL served by this verification run.
- From home, choose `Product` in the `Primary` navigation.

## Driving it with verify-spawn

Preconditions:

- The verification server is healthy.
- `templates/product.json` still enables the main product, editorial, and related-products sections.

- **Open product.** Choose `Product`. Run `node .cursor/skills/verify-spawn/scripts/drive.mjs product`. The `h1` reads `Product`.
- **Check fixed copy.** The page includes `Details that matter`, `More for the water`, and the shipping text from the editorial section.
- **Proof.** `product/desktop.png` and `product/mobile.png` exist at the two viewports, and `product/result.txt` starts with `PASS`.

## Gotchas

- Disabled sections are omitted. A disabled banner's copy is not proof.
- Liquid such as `{{ product.vendor }}` is store data and is not printed as if it had rendered.
