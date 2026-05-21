## Why

The `apply.instruction` in `schema.yaml` is actively consumed by `openspec instructions apply` and returned to LLMs, but it references the removed `[TDD]`/`[TDD: Lite]`/`[TDD: Skip]` annotation system and `Skill({skill: "test-driven-development"})`. LLMs receive directives about features that no longer exist, while the actual two-layer execution model (Layer 1: embedded 6-step TDD, Layer 2: subagent isolation) is undocumented in the schema. Additionally, `parseTasksFile` has the same checkbox-overmatch regex bug already fixed in `task-progress.ts`, and 16 source modules lack dedicated test coverage — including the instructions gateway that serves these stale directives.

## What Changes

- **CRITICAL**: Rewrite `apply.instruction` in `schemas/specpower-driven/schema.yaml` to describe the current two-layer model: Layer 1 (TDD cycle with 6 embedded sub-steps, non-negotiable) + Layer 2 (subagent isolation via `Skill({skill: "subagent-driven-development"})`, execution mode)
- Fix `parseTasksFile()` regex in `src/commands/workflow/instructions.ts` to exclude TDD sub-step checkboxes (same overmatch bug as `task-progress.ts`)
- Add dedicated test coverage for 14 uncovered source modules:
  - `src/commands/metrics.ts` — CLI command with zero tests
  - `src/commands/workflow/instructions.ts` — critical: verifies correct instructions returned to LLMs
  - `src/commands/workflow/status.ts`, `schemas.ts`, `templates.ts`, `new-change.ts`, `shared.ts` — CLI commands with zero tests
  - `src/commands/workflow/verify-audit.ts` — unit test (currently only has CLI e2e)
  - `src/core/config.ts` — core config used by every command, no dedicated test
  - `src/utils/item-discovery.ts`, `match.ts` — utility modules with no tests
  - `src/core/specs-apply.ts` — spec application logic with no tests
  - `src/core/workspace/link-input.ts`, `open-surface.ts`, `openers.ts` — workspace submodules with no tests

## Non-Goals

- Not adding declarative `sub_steps` definition to schema (YAGNI — hardcoded in compliance-check.ts, one schema exists)
- Not modifying `verify.instruction` or `archive.instruction` (consistent with implementation, not consumed by any code)
- Not testing `src/commands/workflow/index.ts` (pure re-export barrel, no logic)
- Not changing existing code behavior beyond the parseTasksFile regex fix
- Not adding isolated unit tests for 17 individual workflow template modules (parity snapshot covers them collectively)
- No template versioning or schema structure refactoring in this change
- No changes to the TDD sub-step format or enforcement model

## Decision

Single comprehensive change rather than split into two (schema fix + test coverage separately). The instruction path tests are the regression tests for the schema fix — splitting them would leave the critical `apply.instruction` change untested. The parseTasksFile fix is in the same module that serves instructions, making it natural to fix and test together. All test additions are additive with zero risk to existing functionality.

Rejected: schema-only fix (no regression guard), split changes (instruction fix untested in first change).

## Capabilities

### New Capabilities
- `apply-instruction-sync`: The `apply.instruction` in schema.yaml accurately describes the two-layer execution model — Layer 1 embedded TDD sub-steps (RED → Verify RED → GREEN → Verify GREEN → REFACTOR → SIMPLIFY) and Layer 2 subagent isolation via `Skill({skill: "subagent-driven-development"})`. LLMs receiving `openspec instructions apply` get correct, current directives.
- `instruction-parse-fix`: The `parseTasksFile()` function in `src/commands/workflow/instructions.ts` uses a regex that excludes TDD sub-step checkboxes, returning accurate task counts in apply instructions output.
- `test-coverage-expansion`: 14 new or expanded test files providing dedicated coverage for previously untested source modules, including critical paths like instruction generation, CLI commands, and utility modules.

### Modified Capabilities
None. This change does not modify existing spec-level behavior — it fixes instruction content (LLM-facing text) and adds tests.

## Impact

- `schemas/specpower-driven/schema.yaml`: `apply.instruction` section rewritten (~40 lines replaced)
- `src/commands/workflow/instructions.ts`: `parseTasksFile()` regex fix (1 line)
- `test/commands/workflow/instructions.test.ts`: new — instructions + apply path tests
- `test/commands/workflow/status.test.ts`: new
- `test/commands/workflow/schemas.test.ts`: new
- `test/commands/workflow/templates.test.ts`: new
- `test/commands/workflow/new-change.test.ts`: new
- `test/commands/workflow/shared.test.ts`: new
- `test/commands/workflow/verify-audit.unit.test.ts`: new
- `test/commands/metrics.test.ts`: new
- `test/core/config.test.ts`: new
- `test/utils/item-discovery.test.ts`: new
- `test/utils/match.test.ts`: new
- `test/core/specs-apply.test.ts`: new
- `test/core/workspace/link-input.test.ts`: new
- `test/core/workspace/open-surface.test.ts`: new
- `test/core/workspace/openers.test.ts`: new
