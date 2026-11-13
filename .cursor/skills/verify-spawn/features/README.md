# Spawn theme verification map

This directory is the maintained source for verifying the shopper-facing pages of the Spawn Fly Fish theme. Read the index before driving the theme, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch the offline render with `.cursor/skills/verify-spawn/scripts/launch.sh`.
- Doctor must report the loopback port and the evidence directory before a drive.
- The five pages are served from the theme templates. They are not the live store.
- Never drive an instance that was not started by this verification run.
- Do not target theme id `143738535999` or a theme whose role is `main` or `live`.

## Driving conventions

- Start every recipe from the launched offline server.
- Prefer the `Primary` navigation and the `h1` over coordinates.
- Treat every command as literal.
- Run browser checks through `node .cursor/skills/verify-spawn/scripts/drive.mjs <feature>`.
- A full local proof, including Theme Check and the preview decision, is `.cursor/skills/verify-spawn/scripts/run.sh`.
- Leave proof artifacts in place during cleanup.

## Proof and skip reporting

- Capture the opened page and the resulting heading, section order, and screenshot.
- UI proof includes a desktop screenshot at 1440 by 900 and a mobile screenshot at 390 by 844.
- A console error fails the page. A missing favicon does not.
- Theme Check proof includes the error count and the warning count.
- Record the feature id with every artifact.
- Report a skipped preview with the reason. Do not report a skipped store preview as a local render.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-spawn` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

## Features

- [Home](./home.md) covers the index template, its hero, and the announcement bar.
- [Collection](./collection.md) covers the collection template without store products.
- [Product](./product.md) covers the product template and its fixed copy.
- [Cart](./cart.md) covers the empty cart.
- [404](./not-found.md) covers the missing-page template.
