## Why

The apply workflow has three interrelated defects that undermine its core guarantees: subagent dispatch is optional in practice (no worktree isolation, no independent review), task checkboxes are batch-updated at the end (breaking session recovery), and commits happen before verification (committed code may not pass verify). These three issues together mean the workflow's assurances — isolated TDD, recoverable progress, verified commits — are not being delivered.

## What Changes

- **BREAKING**: Remove per-task `git commit` from apply Phase C2; commits now happen once at archive time after verification passes
- Add hard gate enforcement for `Skill({skill: "subagent-driven-development"})` — dispatch is mandatory when the skill file exists, not optional
- Add explicit STOP instruction after each task's checkbox update to prevent batch marking
- Change session recovery detection from `git diff --name-only` (commit-based) to `.openspec.yaml` `last_checkpoint` + `tasks.md` checkbox state
- Add final commit step to archive workflow with structured message listing all completed tasks and verification status
- Add mandatory verify gate to archive: verification must pass before archive can proceed

## Non-Goals

- Changing the 6-step TDD sub-step model (RED, Verify RED, GREEN, Verify GREEN, REFACTOR, SIMPLIFY)
- Adding new discipline levels or configuration options
- Modifying the subagent-driven-development skill itself
- Changing the delta spec sync mechanism in archive
- Adding midpoint commits for large changes (one commit per change, always)

## Decision

Option A (hard gate subagent + immediate checkbox + archive commit) — chosen because it creates a clean separation of concerns: apply dispatches and tracks, verify validates, archive commits and finalizes. The per-task commit approach was designed for checkpointing, but `.openspec.yaml` + checkbox state provides equivalent recoverability without requiring commits before verification. The subagent hard gate is justified because without isolation and independent review, the commit message's claim of "verified" would be misleading.

## Capabilities

### Modified Capabilities

- `apply-workflow`: Subagent dispatch becomes mandatory (hard gate with skill file existence check), checkbox marking becomes synchronous per-task, per-task commits removed, session recovery switches to checkpoint-based detection
- `archive-workflow`: New mandatory verify gate before archiving, new final commit step with structured multi-line message, archive blocked if verify not passed

## Impact

- `src/core/templates/workflows/apply-change.ts` — B2 hard gate rewrite, C1 immediate-mark language, C2 commit removal, session recovery rewrite
- `src/core/templates/workflows/archive-change.ts` — new verify gate step, new final commit step, renumber subsequent steps
- `schemas/specpower-driven/schema.yaml` — apply.instruction and archive.instruction sync
- `.claude/skills/openspec-apply-change/SKILL.md` — regenerated
- `.claude/skills/openspec-archive-change/SKILL.md` — regenerated
- `.claude/commands/opsx/apply.md` — regenerated
- `.claude/commands/opsx/archive.md` — regenerated
- Test files for apply-change and archive-change template generation
