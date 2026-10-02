# Spawn storefront agent instructions

Read `.claude/CLAUDE.md` for theme architecture and coding rules. Read `.agents/repo-context.md` when the shared team is available.

## Choose the right system

| Request | Where to work |
| --- | --- |
| Product titles, descriptions, prices, variants, inventory, media, collections, discounts, and product metafields | Shopify Admin data. Use a supported Caddis read or staged action when available. |
| Page structure, Liquid, section schemas, snippets, CSS, JavaScript, and theme templates | This Git repository. Create a branch and pull request. |
| Theme Editor settings, section order, and editor-managed template content | Inspect the current Shopify setting and its theme file. Preserve editor-owned changes. |

Caddis MCP offers Shopify reads and specific staged actions. It is not a general Shopify Admin editor. Discover its tools before promising an Admin change. Only a write staged through Caddis needs Caddis approval. If no supported action exists, report that limit and use an authorized Shopify Admin workflow. Do not change theme code to imitate a product or inventory update.

**Do not apply Caddis approval to theme work.** Reading or editing this repo, checking or previewing a development theme, committing, pushing a branch, opening a PR, resolving conflicts, and merging a PR do not use Caddis approval. Follow the requester's authorization and GitHub review rules for the PR and merge. A merge to the branch connected to the published theme may publish the change; check that branch and the reviewed result before merging. Do not invent an extra approval step because Caddis is installed.

## Theme workflow

- Start from the current GitHub base in a clean checkout. Leave unrelated local edits alone.
- Fetch Theme Editor changes from GitHub. Do not routinely run `shopify theme pull` into a working checkout. For sync recovery, pull a verified theme into a separate empty directory, compare it with GitHub, and bring intended changes through a PR.
- Keep theme changes on a branch. Open a pull request and inspect the combined preview before merge.
- Resolve PR conflicts on that branch. Preserve both edits when possible. Ask the owner when the edits require different product choices.
- Compare changed-file Theme Check results with the current baseline. The imported live theme has existing Theme Check failures; do not claim a clean whole-theme check.
- For a requested theme change, use an isolated development or unpublished theme for its Shopify-rendered preview. Never use the current published theme as a development or preview target.
- Do not run `shopify theme push --allow-live` or upload files to the live theme during coding or review.
- Do not overwrite `config/settings_data.json` or other editor-owned settings with stale local data. Inspect live editor changes before a planned settings edit.

Luke selected Shopify's native GitHub integration for theme publishing. The live theme was imported into GitHub on September 26, 2026. Luke reported the integration setup complete on October 2, 2026. Verify the current published theme and connected branch in Shopify before a release. Shopify commits Theme Editor changes to that branch and syncs branch changes to the theme. GitHub Actions may run checks, but must not publish the theme. Caddis does not approve this GitHub workflow.
