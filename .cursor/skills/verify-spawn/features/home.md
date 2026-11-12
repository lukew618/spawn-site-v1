# Home

Home is the shopper's first page. It shows the announcement, the Spawn name, and the hero and category copy from the index template.

## Sub-features

- `home-open` opens the index template.
- `home-desktop` captures the page at 1440 by 900.
- `home-mobile` captures the page at 390 by 844.
- `home-console` fails when the browser reports an error.

## How to get to it (user POV)

- Open the home URL served by this verification run.
- Choose `Home` in the `Primary` navigation.

## Driving it with verify-spawn

Preconditions:

- `launch.sh` has printed an evidence directory and a home URL.
- `doctor.sh` has passed.
- The index template still has an enabled `spawn-home` section.

- **Open home.** Open the home URL. Run `node .cursor/skills/verify-spawn/scripts/drive.mjs home`. The `h1` is the template's first heading, the announcement is visible, and the footer says `Offline template render`.
- **Check the nav.** The `Primary` navigation links to Home, Collection, Product, Cart, and 404. Each href is `/verify/<id>.html`.
- **Proof.** The drive writes `home/desktop.png`, `home/mobile.png`, and `home/result.txt`. Both screenshots match their viewport, and `home/result.txt` starts with `PASS`.

## Gotchas

- Disabled sections in `templates/index.json` are not rendered. The visible hero comes from the enabled `spawn-home` section.
- The offline page does not load the hero image. The image is a `shopify://` file that this server does not proxy.
- Theme JavaScript is not executed, so a storefront script error will not appear here.
