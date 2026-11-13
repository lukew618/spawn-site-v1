# Collection

Collection shows the collection template's structure. The product grid comes from the shop, so the offline page shows the empty-collection copy and the template's filter and sort settings.

## Sub-features

- `collection-open` opens the collection template.
- `collection-empty` shows the locale empty state.
- `collection-desktop` captures the page at 1440 by 900.
- `collection-mobile` captures the page at 390 by 844.

## How to get to it (user POV)

- Open the collection URL served by this verification run.
- From home, choose `Collection` in the `Primary` navigation.

## Driving it with verify-spawn

Preconditions:

- The verification server is healthy.
- `templates/collection.json` orders an enabled `collection-premium` section.

- **Open collection.** Choose `Collection`. Run `node .cursor/skills/verify-spawn/scripts/drive.mjs collection`. The `h1` reads `Collection`, the page says `No products found`, and the section marker is `collection-premium`.
- **Check the settings.** The page shows the template's products per page, that filtering is on, and that sorting is on.
- **Proof.** `collection/desktop.png` and `collection/mobile.png` exist at the two viewports, and `collection/result.txt` starts with `PASS`.

## Gotchas

- A real collection title is `collection.title`. This render has no collection object, so it uses the locale title `Collection` and the empty state.
- Do not treat this page as proof that a shop collection has products.
