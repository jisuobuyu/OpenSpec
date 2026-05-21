## Context

The apply and archive workflows are defined as TypeScript template functions (`apply-change.ts`, `archive-change.ts`) that generate skill files (`.claude/skills/openspec-*-change/SKILL.md`) and command files (`.claude/commands/opsx/*.md`). These generated files are read by Claude as behavioral instructions.

The current apply workflow has three defects: subagent dispatch is phrased as optional, task checkbox marking has no immediate-enforcement mechanism, and per-task commits happen before verification. The archive workflow currently has no commit step and no hard verify gate.

## Goals / Non-Goals

**Goals:**
- Rewrite B2 (execution wrapper) in apply-change.ts with hard gate language that mandates `Skill({skill: "subagent-driven-development"})` when the skill file exists
- Rewrite C1 (checkbox update) with IMMEDIATE and STOP directives to prevent batch deferral
- Remove C2 (commit task work) from apply-change.ts entirely
- Rewrite session recovery (step 6) to use `.openspec.yaml` `last_checkpoint` + `tasks.md` checkboxes instead of `git diff`
- Add mandatory verify gate to archive-change.ts (step 4 becomes non-optional on verify failure)
- Add final commit step to archive-change.ts (new step between sync and directory move)
- Sync schema.yaml `apply.instruction` and `archive.instruction` with the updated templates
- Regenerate all four output files (2 skills + 2 commands)

**Non-Goals:**
- Changing the 6-step TDD model (RED, Verify RED, GREEN, Verify GREEN, REFACTOR, SIMPLIFY)
- Modifying the `subagent-driven-development` skill itself
- Adding new CLI commands or config options
- Changing discipline level definitions

## Decisions

| Decision | Rationale | Alternatives |
|----------|-----------|--------------|
| Hard gate via instruction language, not programmatic enforcement | The apply workflow is executed by Claude reading skill instructions — there is no Node.js controller loop. The only enforcement point is the text Claude reads. Using MUST/SHALL/HARD GATE framing with explicit "why this is not optional" explanation is the strongest available mechanism. | Programmatic pre-commit hook — rejected because Claude's apply loop is not driven by Node.js code; a git hook would fire too late and can't detect whether subagent was used. |
| Checkbox immediate-mark enforced by STOP directive | LLMs optimize for efficiency and will batch updates unless explicitly told to stop. Adding "⏸ STOP. Report progress. Wait for user confirmation." after C1 creates a natural break point. | Timer/interrupt mechanism — impossible in current architecture since there's no event loop watching tasks. |
| Single commit at archive with structured multi-line message | One commit per change keeps git history clean. The structured message lists all tasks, providing the same traceability as per-task commits without polluting history with intermediate commits that pre-date verification. | Per-task commits — rejected by user preference. Squash during archive — would require rebase, adds complexity, and loses the per-task breakdown in the final message. |
| Final commit before directory move | If the commit fails, the change directory is still in place for retry. If the move fails after commit, the commit is still valid (directory exists in git). | Commit after move — rejected because if move succeeds but commit fails, the change is orphaned in archive with no git record. |
| Verify gate blocks archive on failure, warns on not-run | Failed verify means the code has known issues — archiving would be misleading. Not-run verify may mean the user forgot — a prompt is friendlier. | Always block — too aggressive for simple changes where user is confident. Never block — defeats the purpose of verify. |

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/core/templates/workflows/apply-change.ts` | Rewrite B2 (hard gate), C1 (immediate-mark + STOP), remove C2, rewrite session recovery (step 6) |
| Modify | `src/core/templates/workflows/archive-change.ts` | Add hard verify gate (step 4), add final commit step (new step 6), renumber subsequent steps |
| Modify | `schemas/specpower-driven/schema.yaml` | Sync apply.instruction and archive.instruction with template changes |
| Regenerate | `.claude/skills/openspec-apply-change/SKILL.md` | Regenerated from `getApplyChangeSkillTemplate()` |
| Regenerate | `.claude/skills/openspec-archive-change/SKILL.md` | Regenerated from `getArchiveChangeSkillTemplate()` |
| Regenerate | `.claude/commands/opsx/apply.md` | Regenerated from `getOpsxApplyCommandTemplate()` |
| Regenerate | `.claude/commands/opsx/archive.md` | Regenerated from `getOpsxArchiveCommandTemplate()` |
| Create | `test/core/templates/workflows/apply-change.test.ts` | Verify hard gate language present, C2 commit absent, C1 STOP directive present, recovery uses checkpoint |
| Create | `test/core/templates/workflows/archive-change.test.ts` | Verify verify gate present, final commit step present, commit format includes task list |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Without per-task commits, a session crash loses all uncommitted work | `.openspec.yaml` `last_checkpoint` and `tasks.md` checkboxes track progress; the user can `git stash` manually at any point. The outer loop's STOP directive also creates natural pause points where the user can commit manually if desired. |
| Subagent skill file check is a filesystem operation Claude may skip | The instruction explicitly lists the exact file paths to check and the check is a prerequisite to the Skill call. Claude reads files throughout the apply flow (contextFiles, config.yaml, tasks.md) — adding two more path checks is consistent with existing behavior. |
| One commit for the entire change may produce a large diff | The commit message lists every task with descriptions, making it reviewable. For extremely large changes (20+ tasks), users can split into multiple changes. |
| Hard gate removes flexibility for trivial tasks | Mechanical tasks (1 file, simple change) still benefit from isolation and independent review. The subagent model selection (cheap/standard/capable) matches subagent cost to task complexity. |

## Migration Plan

1. Modify `apply-change.ts` and `archive-change.ts` source templates
2. Run `node build.js` to compile TypeScript
3. Run skill generation to regenerate `.claude/skills/` and `.claude/commands/` files
4. Existing in-progress changes: the new instructions take effect on the next `/opsx:apply` invocation. Uncommitted work from the old flow should be committed or stashed manually before starting.
5. Rollback: revert the two source files and regenerate skills — no data migration needed.

## Open Questions

- For the commit message format, should the task list use `X.Y` task IDs (from tasks.md) or flattened numbering (1, 2, 3)? Decision: use `X.Y` format matching tasks.md for direct traceability.
