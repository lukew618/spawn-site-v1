# Cart

Cart shows the empty cart. The offline server has no cart session, so the empty state is the page a shopper sees with nothing in the bag.

## Sub-features

- `cart-open` opens the cart template.
- `cart-empty` shows the empty heading and message.
- `cart-desktop` captures the page at 1440 by 900.
- `cart-mobile` captures the page at 390 by 844.

## How to get to it (user POV)

- Open the cart URL served by this verification run.
- From home, choose `Cart` in the `Primary` navigation.

## Driving it with verify-spawn

Preconditions:

- The verification server is healthy.
- `templates/cart.json` orders the cart item and cart footer sections.

- **Open cart.** Choose `Cart`. Run `node .cursor/skills/verify-spawn/scripts/drive.mjs cart`. The `h1` reads `Your cart` and the page says `Your cart is empty`.
- **Proof.** `cart/desktop.png` and `cart/mobile.png` exist at the two viewports, and `cart/result.txt` starts with `PASS`.

## Gotchas

- This does not add a line item or open checkout. Checkout would leave the local render.
- The cart drawer is a storefront script. It is not part of this offline page.
