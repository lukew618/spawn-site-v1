# 404

The 404 page is what a shopper sees for a missing URL. It shows the locale missing-page copy and the sections ordered by `templates/404.json`.

## Sub-features

- `not-found-open` opens the 404 template.
- `not-found-copy` shows the missing-page heading and the template's section titles.
- `not-found-desktop` captures the page at 1440 by 900.
- `not-found-mobile` captures the page at 390 by 844.

## How to get to it (user POV)

- Open the 404 URL served by this verification run.
- From home, choose `404` in the `Primary` navigation.

## Driving it with verify-spawn

Preconditions:

- The verification server is healthy.
- `templates/404.json` orders the `main-404` section before the other enabled sections.

- **Open the missing page.** Choose `404`. Run `node .cursor/skills/verify-spawn/scripts/drive.mjs not-found`. The `h1` reads `Page not found` and the page shows `404`.
- **Check the following sections.** The page includes the template titles `Deals` and `You might be interested in...`.
- **Proof.** `not-found/desktop.png` and `not-found/mobile.png` exist at the two viewports, and `not-found/result.txt` starts with `PASS`.

## Gotchas

- The drive id is `not-found`. The template file is `templates/404.json`.
- A real store 404 is covered only by the optional `ENG-` preview, and only when that preview is actually run.
