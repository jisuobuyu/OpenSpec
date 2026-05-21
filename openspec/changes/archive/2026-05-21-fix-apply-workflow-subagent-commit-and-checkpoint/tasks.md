## TDD is Mandatory — The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

If you wrote code before the test, delete it. Start over. No exceptions.

Every task embeds the full TDD cycle directly as sub-steps. Follow each sub-step
in order. If you didn't watch the test fail, you don't know if it tests the right thing.

  - [x] RED: Write one minimal failing test showing what should happen
  - [x] Verify RED: Run the test — confirm it fails for the expected reason (feature missing, not typo)
  - [x] GREEN: Write the minimum code to make the test pass
  - [x] Verify GREEN: Run the test — confirm it passes and all other tests still pass
  - [x] REFACTOR: Clean up code: remove duplication, improve names, extract helpers. Keep tests green.
  - [x] SIMPLIFY: Review all changed files for clarity, consistency, and dead code

**Violating the letter of the rules is violating the spirit of the rules.**

## Testing Anti-Patterns

When writing tests:
- Test real behavior, not mocks (avoid `jest.fn()` unless unavoidable)
- One behavior per test — "and" in test name = split it
- Clear test name describes the behavior being tested
- Never add test-only methods to production classes

## Spec Reference Annotations

Each task may reference a spec requirement for precise context injection during apply:
- `[Spec: REQ-xxx]` — Links task to a specific requirement. The apply workflow extracts
  the corresponding requirement block (description + scenarios) and injects it as pre-context.
- Multiple references: `[Spec: REQ-001, REQ-003]` — injects all referenced requirements.
- No `[Spec: ...]` annotation → falls back to full spec summary injection.

## 1. Apply Workflow — Subagent Hard Gate & Checkpoint Fix

- [x] 1.1 [Spec: REQ-Subagent-Dispatch-Must-Be-Mandatory] Rewrite B2 execution wrapper with hard gate subagent dispatch
  - [x] RED: Write a test in `test/core/templates/apply-change.test.ts` verifying the generated skill template contains mandatory subagent dispatch language ("MUST call", "NOT OPTIONAL", "HARD GATE") and the skill file existence check at both paths
  - [x] Verify RED: Run test — confirm it fails (current template lacks hard gate language)
  - [x] GREEN: In `src/core/templates/workflows/apply-change.ts`, rewrite B2 section (lines 177-233) to add hard gate: mandatory `Skill({skill: "subagent-driven-development"})` when skill file exists, with explicit "why this is not optional" justification block, keeping the degradation path only for genuinely missing skill files
  - [x] Verify GREEN: Run test — confirm pass + no regressions in existing tests
  - [x] REFACTOR: Ensure B2 hard gate language is consistent between skill template and command template functions
  - [x] SIMPLIFY: Review apply-change.ts for dead references to removed sections

- [x] 1.2 [Spec: REQ-Task-Checkbox-Must-Be-Marked-Immediately] Rewrite C1 checkbox update with immediate-mark + STOP directive
  - [x] RED: Write a test verifying the generated skill template contains "IMMEDIATELY" and "DO NOT defer" / "STOP" directives in the C1 checkbox section
  - [x] Verify RED: Run test — confirm it fails (current C1 has no enforcement language)
  - [x] GREEN: In `apply-change.ts`, rewrite C1 section (lines 269-271) with explicit immediate-mark instruction, including STOP/PAUSE after marking
  - [x] Verify GREEN: Run test — confirm pass + no regressions
  - [x] REFACTOR: Ensure C1 language is concise but commanding
  - [x] SIMPLIFY: Verify no residual batch-mark language elsewhere in template

- [x] 1.3 [Spec: REQ-No-Per-Task-Git-Commits-During-Apply] Remove C2 commit step from apply workflow
  - [x] RED: Write a test verifying the generated skill template does NOT contain `git commit` or `git add` instructions in the post-checkpoint phase
  - [x] Verify RED: Run test — confirm it fails (current template has C2 git commit)
  - [x] GREEN: In `apply-change.ts`, remove C2 section (lines 273-280) entirely. Update post-checkpoint numbering from C0/C1/C2/C3/C4 to C0/C1/C2/C3
  - [x] Verify GREEN: Run test — confirm pass + no regressions
  - [x] REFACTOR: Update the Guardrails section at the bottom to remove references to commit
  - [x] SIMPLIFY: Check for any remaining commit-related references in the template

- [x] 1.4 [Spec: REQ-Session-Recovery-Uses-Checkpoint-State] Rewrite session recovery to use `.openspec.yaml` `last_checkpoint` + `tasks.md` checkboxes
  - [x] RED: Write a test verifying session recovery section references `.openspec.yaml` `last_checkpoint` and `tasks.md` checkboxes instead of `git diff --name-only`
  - [x] Verify RED: Run test — confirm it fails (current recovery uses git diff)
  - [x] GREEN: In `apply-change.ts`, rewrite step 6 (lines 70-92) to check `.openspec.yaml` `last_checkpoint` and scan `tasks.md` for first unmarked task, removing `git diff --name-only` dependency
  - [x] Verify GREEN: Run test — confirm pass + no regressions
  - [x] REFACTOR: Update recovery display template to show checkpoint-based progress
  - [x] SIMPLIFY: Verify no other code paths depend on git diff for progress detection

## 2. Archive Workflow — Verify Gate & Commit

- [x] 2.1 [Spec: REQ-Verification-Must-Pass-Before-Archive] Add mandatory verify gate to archive workflow
  - [x] RED: Write a test in `test/core/templates/workflows/archive-change.test.ts` verifying the generated archive template contains "Verification failed. Fix issues and re-verify before archiving." and blocks archive when verify has failed
  - [x] Verify RED: Run test — confirm it fails (current archive has no verify failure block)
  - [x] GREEN: In `src/core/templates/workflows/archive-change.ts`, rewrite step 4 to check verification status: not-run → prompt to verify; failed → block with error; passed → proceed
  - [x] Verify GREEN: Run test — confirm pass + no regressions
  - [x] REFACTOR: Ensure consistent language between skill and command templates
  - [x] SIMPLIFY: Review for clarity of the three-way state routing (not-run / failed / passed)

- [x] 2.2 [Spec: REQ-Single-Commit-Created-at-Archive-Time] Add final commit step to archive workflow
  - [x] RED: Write a test verifying the generated archive template contains a step to create `git commit` with multi-line message including task list, verify status, and review status
  - [x] Verify RED: Run test — confirm it fails (current archive has no commit step)
  - [x] GREEN: In `archive-change.ts`, add new step between spec sync and directory move that creates a single git commit with the structured format: `feat(<change-name>): <summary>` followed by Changes list, Verify status, Review status, and Co-Authored-By trailer
  - [x] Verify GREEN: Run test — confirm pass + no regressions
  - [x] REFACTOR: Renumber subsequent steps (archive → 7, cleanup → 8, display → 9) consistently
  - [x] SIMPLIFY: Verify commit message format matches spec exactly

## 3. Schema & Regeneration Sync

- [x] 3.1 [Spec: REQ-Subagent-Dispatch-Must-Be-Mandatory,REQ-No-Per-Task-Git-Commits-During-Apply] Sync schema.yaml apply.instruction with template changes
  - [x] RED: Write a test reading `schemas/specpower-driven/schema.yaml` and verifying `apply.instruction` contains hard gate language and does NOT contain per-task commit instruction
  - [x] Verify RED: Run test — confirm it fails (current schema still has old instruction)
  - [x] GREEN: Update `apply.instruction` in `schemas/specpower-driven/schema.yaml` to match the rewritten template: hard gate B2, immediate-mark C1, no C2 commit, checkpoint-based recovery
  - [x] Verify GREEN: Run test — confirm pass + no regressions
  - [x] REFACTOR: Keep instruction concise — schema instruction is the terse version, not the full skill text
  - [x] SIMPLIFY: Verify schema apply instruction is consistent with apply-change.ts template

- [x] 3.2 [Spec: REQ-Verification-Must-Pass-Before-Archive,REQ-Single-Commit-Created-at-Archive-Time] Sync schema.yaml archive.instruction with template changes
  - [x] RED: Write a test reading schema and verifying `archive.instruction` contains verify gate and final commit step
  - [x] Verify RED: Run test — confirm it fails (current schema archive instruction lacks verify gate and commit)
  - [x] GREEN: Update `archive.instruction` in `schemas/specpower-driven/schema.yaml` to include verify gate (three-way routing) and final commit step
  - [x] Verify GREEN: Run test — confirm pass + no regressions
  - [x] REFACTOR: Keep concise — schema instruction is the terse version
  - [x] SIMPLIFY: Verify schema archive instruction is consistent with archive-change.ts template

- [x] 3.3 Regenerate all skill and command files from updated templates
  - [x] RED: No test needed (output file regeneration is a mechanical step)
  - [x] Verify RED: (skip — regeneration has no behavioral assertion)
  - [x] GREEN: Run `node build.js` and the skill generation pipeline to regenerate `.claude/skills/openspec-apply-change/SKILL.md`, `.claude/skills/openspec-archive-change/SKILL.md`, `.claude/commands/opsx/apply.md`, `.claude/commands/opsx/archive.md`
  - [x] Verify GREEN: Run all tests, confirm no regressions, verify generated files contain the new hard gate and verify gate language
  - [x] REFACTOR: (N/A — regeneration step)
  - [x] SIMPLIFY: Verify no stale generated content from previous version remains

- [x] 3.4 Add pre-commit checkbox validation — programmatic guard against unmarked tasks
  - [x] RED: Write a test verifying archive step 8 includes a validation check: run `openspec instructions apply --change "<name>" --json`, check `progress.remaining > 0`, and block commit with error message if unmarked tasks found
  - [x] Verify RED: Run test — confirm it fails (current archive step 8 has no pre-commit validation)
  - [x] GREEN: In `archive-change.ts`, add pre-commit validation to step 8: before `git commit`, run `openspec instructions apply --json` to check `progress.remaining`; if > 0, display error listing unmarked tasks and STOP
  - [x] Verify GREEN: Run test — confirm pass + no regressions
  - [x] REFACTOR: Keep validation concise; avoid duplicating the check in the command template (reference step 3 task check)
  - [x] SIMPLIFY: Verify the error message clearly names the unmarked tasks and instructs to mark them first
