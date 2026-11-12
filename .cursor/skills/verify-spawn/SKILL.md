---
name: verify-spawn
description: Drive the Spawn Fly Fish Shopify theme through theme check, an offline render of home, collection, product, cart, and 404, and an optional unpublished ENG- theme preview. Use when proving a theme change. Refuses the live theme.
---

# Verify Spawn

Spawn's user surface for this skill is the Shopify theme in this repository. The storefront pages a shopper opens are home, a collection, a product, the cart, and the 404. Theme Check stays the Liquid and schema gate. This skill runs that gate, then renders those five templates in a local browser. It does not replace `node scripts/check-theme-root.mjs` and it does not start `shopify theme dev` during environment boot.

Do not print `SHOPIFY_CLI_THEME_TOKEN`, an Admin API token, or any other secret. Do not spend. Do not write products, content, or locales. Do not publish, delete, or push a theme unless the command is the preview path below and the theme is an explicit unpublished or development theme whose name starts with `ENG-`. Theme id `143738535999` is the live theme. Refuse it, and refuse any theme whose role is `main` or `live`.

Only one verification instance can run. It owns a loopback port starting at `4296`. If `/tmp/spawn-verify-current.env` exists and its pid is alive, stop and run cleanup. Do not drive an instance this skill did not start.

## Launch

From the repository root:

```bash
.cursor/skills/verify-spawn/scripts/launch.sh
```

Proof goes to `/tmp/spawn-verify-evidence/<run-id>/`. Set `SPAWN_VERIFY_EVIDENCE` only when you want a different directory. The script writes `result.txt` as `FAIL` before it renders anything, builds the offline pages from the theme templates, and serves them on `127.0.0.1`. Ready means `http://127.0.0.1:<port>/verify/home.html` returns the offline home page and `/tmp/spawn-verify-current.env` records the pid, port, evidence directory, and theme root. That file has no token.

The offline page is not Shopify's storefront HTML. It loads `assets/spawn-home.css`, `assets/spawn-typography.css`, and `assets/spawn-storefront.css`, then shows the announcement bar and the copy stored in the template. Product and collection objects stay empty because they come from the shop. Theme JavaScript is not executed. A footer line says `Offline template render`.

## Doctor

Run this before the first drive, and again after a drive fails:

```bash
.cursor/skills/verify-spawn/scripts/doctor.sh
```

Doctor passes only when the recorded pid is alive, that pid owns the recorded port, and all five pages return 200 with the Spawn name, a section marker, and their own nav link. It fails if the instance file contains a secret.

## Drive

Desktop is 1440 by 900. Mobile is 390 by 844. The primary navigation is `navigation` named `Primary`. Its links are `Home`, `Collection`, `Product`, `Cart`, and `404`.

```bash
node .cursor/skills/verify-spawn/scripts/drive.mjs home
node .cursor/skills/verify-spawn/scripts/drive.mjs collection
node .cursor/skills/verify-spawn/scripts/drive.mjs product
node .cursor/skills/verify-spawn/scripts/drive.mjs cart
node .cursor/skills/verify-spawn/scripts/drive.mjs not-found
node .cursor/skills/verify-spawn/scripts/drive.mjs all
```

Each drive opens the template URL, checks the heading, the section order from that template, the nav hrefs, and the visible copy. A console error or page exception fails the drive. A missing favicon does not. A screenshot must be the requested size, and the page must not scroll sideways.

The full local run also executes Theme Check and the preview decision:

```bash
.cursor/skills/verify-spawn/scripts/run.sh
```

Theme Check uses `shopify theme check --fail-level error`. Any error fails the run. Warnings are recorded and do not fail it. An empty directory is refused before Shopify is invoked, because an empty directory makes Theme Check exit 0 with no offenses. The child process does not receive the theme token.

## Preview

Preview is optional and is the only path that may run `shopify theme push`.

- Without `SHOPIFY_CLI_THEME_TOKEN`, the run still passes the local checks and writes `preview mode skipped: SHOPIFY_CLI_THEME_TOKEN is unset`.
- With the token but without `SPAWN_VERIFY_THEME_ID`, it writes `preview mode skipped: no explicit unpublished ENG- theme id` and does not call Shopify.
- With both, it lists that one theme, refuses anything except an `unpublished` or `development` theme whose name matches `ENG-` plus a label, then pushes with `--theme <id> --nodelete`. It never passes `--allow-live`, `--live`, `--publish`, `--unpublished`, or `--development`. After the push it opens the preview URL and requires Shopify's preview bar on home, collection, product, cart, and a missing page.

`SPAWN_VERIFY_SHOPIFY_BIN` is ignored unless `SPAWN_VERIFY_ALLOW_FAKE_SHOPIFY=1`. The self-test is the only caller that sets that flag, and only to prove the live theme never starts a process.

## Mutation self-test

With no verification server running:

```bash
node .cursor/skills/verify-spawn/scripts/mutation-self-test.mjs
```

The script restores the theme when it finishes. It checks two mutations, each in its own evidence directory:

- `sections/verify-spawn-mutation.liquid` is added with an unclosed `if`. Theme Check exits non-zero and `result.txt` starts with `FAIL`. The file is removed afterward.
- `preview.mjs --theme 143738535999 --execute` exits non-zero, `result.txt` starts with `FAIL`, and the Shopify process count is 0.

The same command runs `test-fences.mjs`, which also refuses role `main` and `live`, a name that does not start with `ENG-`, publish, delete, `--allow-live`, a push with no theme id, and a preview URL that carries a token or points at the live theme. The harness exits 0 only when every one of those runs went red and the mutated file is gone.

## Evidence

Proof for a run is the action and the resulting state:

- `result.txt`, whose first line is `PASS` or `FAIL`. `FAIL` is written when the directory is created. `PASS` is written only after Theme Check, every page, and the preview decision have succeeded.
- `theme-check/summary.json` with the error and warning counts.
- Desktop and mobile screenshots, `console.txt`, and the DOM state for each page.
- `preview.txt` saying the preview was skipped, or the preview screenshots when an `ENG-` theme was uploaded.

Tokens are redacted before those files are written, and the run scans the evidence directory before it can pass. Cleanup must not delete that directory. After cleanup, `result.txt` and the screenshots still have to be there. The latest path is also in `/tmp/spawn-verify-latest.txt`.

## Cleanup

```bash
.cursor/skills/verify-spawn/scripts/cleanup.sh
```

This sends `SIGTERM`, then `SIGKILL` if needed, to the server process group recorded for this run. It removes `/tmp/spawn-verify-current.env` and `/tmp/spawn-verify-runs/<run-id>`. It does not delete the evidence directory. Run it after a failed launch too, so a broken attempt does not keep the port.

## Helpers

| Script | Invocation |
| --- | --- |
| `scripts/launch.sh` | `.cursor/skills/verify-spawn/scripts/launch.sh` |
| `scripts/doctor.sh` | `.cursor/skills/verify-spawn/scripts/doctor.sh` |
| `scripts/drive.mjs` | `node .cursor/skills/verify-spawn/scripts/drive.mjs <feature>` |
| `scripts/cleanup.sh` | `.cursor/skills/verify-spawn/scripts/cleanup.sh` |
| `scripts/run.sh` | `.cursor/skills/verify-spawn/scripts/run.sh` |
| `scripts/theme-check.mjs` | `node .cursor/skills/verify-spawn/scripts/theme-check.mjs` |
| `scripts/preview.mjs` | `node .cursor/skills/verify-spawn/scripts/preview.mjs --from-env` |
| `scripts/test-fences.mjs` | `node .cursor/skills/verify-spawn/scripts/test-fences.mjs` |
| `scripts/mutation-self-test.mjs` | `node .cursor/skills/verify-spawn/scripts/mutation-self-test.mjs` |

`node scripts/check-theme-root.mjs` remains the repository's Theme Check entry. Locale parity and the worker tests stay outside this skill.

When these pages change, run `/maintain-verification-skill` against `.cursor/skills/verify-spawn/` so the feature map stays honest.
