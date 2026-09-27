# Spawn storefront agent instructions

Read `.claude/CLAUDE.md` for theme architecture and coding rules. Read `.agents/repo-context.md` when the shared team is available.

## Choose the right system

| Request | Where to work |
| --- | --- |
| Product titles, descriptions, prices, variants, inventory, media, collections, discounts, and product metafields | Shopify Admin data. Use a supported Caddis read or staged action when available. |
| Page structure, Liquid, section schemas, snippets, CSS, JavaScript, and theme templates | This Git repository. Create a branch and pull request. |
| Theme Editor settings, section order, and editor-managed template content | Inspect the current Shopify setting and its theme file. Preserve editor-owned changes. |

Caddis MCP offers Shopify reads and specific staged actions. It is not a general Shopify Admin editor. Discover the available tools before promising an Admin change. A staged action needs its normal approval and execution path. If no supported action exists, report that limit and use an explicitly authorized Admin workflow. Do not change theme code to imitate a product or inventory update.

## Theme workflow

- Start from the current GitHub base in a clean checkout. Leave unrelated local edits alone.
- Keep theme changes on a branch. Open a pull request and inspect the combined preview before merge.
- Resolve PR conflicts on that branch. Preserve both edits when possible. Ask the owner when the edits require different product choices.
- Compare changed-file Theme Check results with the current baseline. The imported live theme has existing Theme Check failures; do not claim a clean whole-theme check.
- When the approved task permits a Shopify-rendered preview, use an isolated development or unpublished theme. Never use live theme `129377796159` as a development or preview target.
- Do not run `shopify theme push --allow-live` or upload files to the live theme during coding or review.
- Do not overwrite `config/settings_data.json` or other editor-owned settings with stale local data. Inspect live editor changes before a planned settings edit.

Luke selected Shopify's native GitHub integration as the intended publishing path. The live theme was imported into GitHub on September 26, 2026. The integration is not active yet. Do not assume a merge publishes the store. Activation, live publication, and other production changes need Luke's explicit direction.
