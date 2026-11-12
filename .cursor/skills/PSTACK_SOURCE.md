# Pstack source

Vendored on 2026-11-12 from https://github.com/cursor/plugins/tree/2eaf46574b25cdf7ef8c849837099b866b7438ce/pstack.

Pinned commit: `2eaf46574b25cdf7ef8c849837099b866b7438ce` (committed 2026-11-11).

Upstream license: MIT, Copyright (c) 2026 Lauren Tan. The license text is unchanged in `PSTACK_LICENSE`.

`pstack/README.md` and `pstack/docs/` are copied unchanged to `.cursor/skills/pstack/`. Skill files are not edited, so a skill link such as `../../README.md` or `../../docs/...` still points at `.cursor/README.md` or `.cursor/docs/`, which this repo does not add. `automations/`, `agents/`, and `assets/` are not copied: no skill reads those directories.

## Skills (58)

- architect
- arena
- automate-me
- benchmark-checklist
- blast-radius
- bro
- correct
- create-formal-verification-skill
- create-verification-skill
- figure-it-out
- how
- in-your-own-words
- interrogate
- ketchup
- ketchup-video
- maintain-formal-verification-skill
- maintain-verification-skill
- make-bot-ui
- no-comments
- poteto-help
- poteto-mode
- principle-attack-the-premise
- principle-boundary-discipline
- principle-build-the-lever
- principle-encode-lessons-in-structure
- principle-exhaust-the-design-space
- principle-experience-first
- principle-explain-the-number
- principle-fix-root-causes
- principle-foundational-thinking
- principle-guard-the-context-window
- principle-laziness-protocol
- principle-make-operations-idempotent
- principle-migrate-callers-then-delete-legacy-apis
- principle-minimize-reader-load
- principle-model-the-domain
- principle-never-block-on-the-human
- principle-outcome-oriented-execution
- principle-prove-it-works
- principle-redesign-from-first-principles
- principle-separate-before-serializing-shared-state
- principle-sequence-verifiable-units
- principle-subtract-before-you-add
- principle-test-behavior-not-implementation
- principle-type-system-discipline
- recall
- reflect
- setup-pstack
- sharpen
- show-me-your-work
- statechart
- swarm
- tdd
- teach
- technical-writing
- typescript-best-practices
- unslop
- why

To re-sync, check out that commit of https://github.com/cursor/plugins and replace each `.cursor/skills/<skill>/` from `pstack/skills/<skill>/` byte-for-byte, skip any skill directory this repo already owns, refresh `.cursor/skills/pstack/` from `pstack/README.md` and `pstack/docs/`, and replace `PSTACK_LICENSE` from `pstack/LICENSE`.

In this repo, setup-pstack may only pick models from the ENG-037 model set, and only with Luke's approval.
