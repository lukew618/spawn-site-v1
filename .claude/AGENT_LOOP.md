# Spawn Fly Fish — Agent Loop

You are running autonomously on the Spawn Fly Fish Shopify theme (Dawn v15.2.0).
Work through BACKLOG.md top-to-bottom, shipping one task at a time.
The human will review your work when they return. Make them proud.

---

## Step 0 — Prep (run once at the start)

1. `cd` into the repo: `/Users/lukewhiteman/Library/Mobile\ Documents/com~apple~CloudDocs/Projects/spawn-store`
2. Pull latest from GitHub: `git pull origin main` — incorporates any changes from cloud sessions or other machines
3. Pull latest from Shopify: `shopify theme pull --theme=129377796159` — incorporates any Theme Editor changes
4. If git detects conflicts between GitHub and Shopify pulls: commit the Shopify state with message `chore: sync Shopify theme state` before proceeding
5. Run `shopify theme check` — note any pre-existing errors (PageFly file has 3 known errors — ignore those, flag anything new)
6. Check git status — if there are uncommitted changes, commit them with message `chore: commit uncommitted work before agent loop`
7. Working tree is clean. Proceed to the loop.

---

## The Loop

Repeat the following for each task until the backlog is empty or you hit a STOP condition.

### 1. Pick a task

Read `.claude/BACKLOG.md`. Find the first unchecked item (`- [ ]`).
If no unchecked items remain, go to **Wrap-up**.
If the task is in the **Blocked** section, skip it and move to the next.

### 2. Write acceptance criteria

Before touching any code, write out the specific, testable conditions for "done."
The task description in BACKLOG.md includes acceptance criteria — expand on them if needed.
Save these mentally (or as a comment at the top of your working notes) — you will check each one before shipping.

### 3. Read the relevant code

Read the files most likely involved. Don't guess — actually read them.
Check `CLAUDE.md` for gotchas that apply to this task.

### 4. Spawn review sub-agents

Spawn **two sub-agents in parallel** to critique your implementation plan before you write a line of code:

**Designer sub-agent prompt:**
> You are reviewing a proposed change to the Spawn Fly Fish Shopify theme as a visual designer.
> The task: [paste task description]
> The proposed approach: [paste your plan]
> Review for: visual hierarchy, spacing, mobile usability, hover/interaction states, consistency with the existing black/white/uppercase aesthetic. Flag anything that would look off or feel unpolished. Be direct and brief.

**Shopify Expert sub-agent prompt:**
> You are reviewing a proposed change to the Spawn Fly Fish Shopify theme as a Shopify theme expert.
> The task: [paste task description]
> The proposed approach: [paste your plan]
> Review for: Dawn theme conventions, Liquid best practices, performance (image handling, render vs include, no unpaginated loops), accessibility (WCAG 2.1 AA), schema correctness, anything that would break the theme editor or cause shopify theme check errors. Be direct and brief.

Read both reviews. If either raises a blocking concern, revise your plan and re-evaluate before proceeding. You do NOT need to re-run sub-agents after a minor plan adjustment — use judgment.

### 5. Implement

Make the changes. Follow CLAUDE.md rules without exception:
- `{% render %}` not `{% include %}`
- `image_url` + `image_tag` for all images
- CSS custom properties, no hardcoded hex
- `defer` on all new `<script>` tags
- Never touch off-limits files (PageFly files, `config/settings_data.json`)

### 5.5. Code review gate (gstack /review)

Run `/review` on your changes before verifying. This catches structural issues the sub-agents miss — dead code, side effects, conditional logic bugs, accessibility regressions.

- Let /review AUTO-FIX any mechanical issues it finds (formatting, unused vars, etc.)
- If /review flags a CRITICAL finding: stop, fix it, then continue
- If /review flags INFORMATIONAL items only: note them but proceed
- Skip the Codex integration (adds cost and latency — not needed in autonomous loop)

### 6. Verify

Run `shopify theme check`. Requirements:
- Zero new errors beyond the 3 pre-existing PageFly ones
- Warnings are acceptable if they're in unchanged files

Go through your acceptance criteria one by one. Check each off mentally.

If theme check has new errors: **run /investigate** instead of ad-hoc debugging:
- /investigate will systematically trace the root cause (recent changes, Liquid syntax, schema)
- It follows a hypothesis → test → fix cycle with a 3-strike rule
- If /investigate cannot resolve after 3 hypotheses: add the task back to BACKLOG.md with a `[BLOCKED]` note explaining the error and the investigation findings, then move to the next task

If theme check passes: proceed to push.

### 7. Push and commit

```bash
shopify theme push --theme=129377796159 --allow-live
```

Then commit:
- Check off the task in `BACKLOG.md` (change `- [ ]` to `- [x]`)
- Write a commit with format: `type(scope): description` (see CLAUDE.md commit format)
- Commit message body should include: what changed, why, and which acceptance criteria were verified vs. need browser check

```bash
git add -A
git commit -m "type(scope): short description

Body: what changed and why.

Acceptance criteria verified:
- [x] criterion one
- [x] criterion two
- [ ] criterion three — needs browser verification

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### 7.5. Live QA smoke test (gstack /qa)

After pushing, run a quick QA pass on the live page most affected by the change:

```bash
# Example — adjust URL to the page this task changed
/qa --quick https://spawn-fly-fish.myshopify.com/[relevant-page]
```

- Use diff-aware quick mode (~30s) — not a full site audit
- Check: page loads, no console errors, changed elements render correctly, mobile viewport OK
- If /qa finds a regression: fix it, re-push, re-verify before moving on
- If /qa finds issues unrelated to this task: note them in RECAP.md under "QA Findings" but do not fix (stay scoped)
- This step resolves the "needs browser verification" gap — acceptance criteria verified by /qa should be marked `[x]` in the commit, not `[ ]`

### 8. Loop

Go back to **Step 1** and pick the next task.

---

## STOP Conditions

Stop the loop and go to **Wrap-up** immediately if:
- `shopify theme check` produces new errors you cannot fix after two attempts
- A task requires information you don't have (e.g., a specific product handle, a metafield value)
- A task would require modifying off-limits files to complete
- You've completed 8 tasks in one session (prevents runaway context; human should review)

Add a note to the relevant BACKLOG.md task explaining why you stopped.

---

## Wrap-up

When the loop ends (backlog empty or STOP condition hit):

1. Write `.claude/RECAP.md` (overwrite if exists):

```markdown
# Agent Loop Recap — [date]

## Tasks Completed
- task name — one line summary
- task name — one line summary

## Tasks Skipped / Blocked
- task name — reason

## Needs Browser Verification
- list any acceptance criteria that couldn't be verified without a browser

## QA Findings (unrelated to tasks)
- any issues /qa found that were out of scope for the current task

## Review Findings (informational)
- any INFORMATIONAL items from /review worth noting

## Notes for Luke
- anything surprising, any judgment calls made, any patterns noticed
```

2. Commit the recap:
```bash
git add .claude/RECAP.md
git commit -m "chore(agent): loop complete — write recap"
```

3. Stop. Do not start new work. Wait for the human.

---

## Reference

- Theme ID: `129377796159` (spawn-store-v1) — always use this one
- Store: `spawn-fly-fish.myshopify.com`
- Off-limits files: `sections/pf-b25451ca.liquid`, `snippets/pf-b25451ca-css.liquid`, `snippets/pagefly-main-js.liquid`, `templates/product.pf-b25451ca.json`, `config/settings_data.json`
- Pre-existing theme check errors: 3 errors in `pf-b25451ca.liquid` — ignore
- Push command always needs `--allow-live` flag
