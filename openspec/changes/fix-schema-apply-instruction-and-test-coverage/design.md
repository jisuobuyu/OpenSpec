## Context

The `openspec instructions apply --change <name>` command returns `schema.apply.instruction` directly to LLMs (via `src/commands/workflow/instructions.ts:263`). When TDD was refactored from `[TDD]` annotations + `Skill({skill: "test-driven-development"})` to embedded 6-step sub-steps + `Skill({skill: "subagent-driven-development"})`, the schema instruction was not updated. LLMs now receive stale directives about removed features. Additionally, `parseTasksFile()` uses a regex that overmatches TDD sub-step checkboxes, and 16 source modules lack test coverage.

## Goals / Non-Goals

**Goals:**
- Rewrite `apply.instruction` to describe the current two-layer execution model
- Fix `parseTasksFile()` regex to exclude TDD sub-step checkboxes (matching `task-progress.ts` fix)
- Add dedicated test coverage for 14 uncovered modules, prioritizing instruction gateway

**Non-Goals:**
- No schema structure changes (no new YAML keys like `sub_steps`)
- No changes to `verify.instruction` or `archive.instruction`
- No refactoring of existing code beyond the regex fix
- No configuration or template changes in this change

## Decisions

| Decision | Rationale | Alternatives |
|----------|-----------|--------------|
| Rewrite apply.instruction inline (no programmatic extraction from template) | Schema is the declarative source. Template (`apply-change.ts`) is the SKILL file. They serve different purposes — schema instruction is a concise summary for LLM consumption, template is full skill content. Keeping them separate allows each to be tuned independently. | Extract instruction from `apply-change.ts` programmatically at runtime — rejected because template text mixes instruction with markup (`##`, `- [ ]`, guardrails) that would leak into schema output. |
| Use `parseTasksFile` regex matching task ID pattern (`X.Y`) | Same approach as `task-progress.ts` fix (commit 2ee0709). Consistent regex across the codebase. | Fix by checking indentation level — rejected because markdown indentation varies (tabs vs spaces vs bullets), making it fragile. |
| Write 14 new test files vs expand existing ones | Each source module gets its own test file matching existing convention (`test/<mirror-path>.test.ts`). Isolated failures, clear ownership. | Consolidate into fewer larger test files — rejected because it obscures which module is failing. |
| Instruction path tests read schema dynamically at test time | Tests the actual schema-to-instruction flow end-to-end. Catches future schema-instruction drift. | Hardcode expected instruction text — rejected because it duplicates schema content in tests, creating another drift vector. |
| Test complexity: simple unit tests with temp directory fixtures | Most uncovered modules are CLI commands or utilities — they need fs isolation (temp dirs) matching existing test patterns (list.test.ts, view.test.ts, etc.). | Use project fixtures — rejected because temp dirs are cleaner, isolated, and already the project standard. |

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `schemas/specpower-driven/schema.yaml` | Replace `apply.instruction` text with two-layer model |
| Modify | `src/commands/workflow/instructions.ts` | Fix `parseTasksFile()` regex to exclude TDD sub-step checkboxes |
| Create | `test/commands/workflow/instructions.test.ts` | Test `generateApplyInstructions()` returns correct instruction content; test `parseTasksFile()` excludes sub-steps |
| Create | `test/commands/workflow/status.test.ts` | Test `statusCommand()` with fixture changes |
| Create | `test/commands/workflow/schemas.test.ts` | Test `schemasCommand()` output |
| Create | `test/commands/workflow/templates.test.ts` | Test `templatesCommand()` output |
| Create | `test/commands/workflow/new-change.test.ts` | Test `newChangeCommand()` creates change directory |
| Create | `test/commands/workflow/shared.test.ts` | Test `validateChangeExists()`, `validateSchemaExists()`, `DEFAULT_SCHEMA` |
| Create | `test/commands/workflow/verify-audit.unit.test.ts` | Test audit functions directly (not via CLI e2e) |
| Create | `test/commands/metrics.test.ts` | Test `metricsCommand()` with fixture data |
| Create | `test/core/config.test.ts` | Test `OPENSPEC_DIR_NAME`, config path resolution |
| Create | `test/utils/item-discovery.test.ts` | Test item discovery functions |
| Create | `test/utils/match.test.ts` | Test pattern matching utilities |
| Create | `test/core/specs-apply.test.ts` | Test spec application logic |
| Create | `test/core/workspace/link-input.test.ts` | Test link input parsing/validation |
| Create | `test/core/workspace/open-surface.test.ts` | Test open surface resolution |
| Create | `test/core/workspace/openers.test.ts` | Test opener detection/availability |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| New test files may not pass on Windows (path separators) | Use `path.join()` for all path assertions; follow existing test file patterns that already handle cross-platform |
| Instruction content divergence between schema and template over time | Instruction path test dynamically reads schema and checks for deprecated content — catches drift at test time |
| 14 new test files may have copy-paste errors from similar tests | Each test follows existing project conventions (tempDir, console.log mocking, vitest describe/it). Review each file for unique assertions |
| parseTasksFile regex change may break existing behavior if task IDs use unexpected format | Test with multiple formats: `- [ ] 1.1`, `- [x] 2.3`, empty tasks, sub-step-only content |

## Migration Plan

1. Run `npm run build` to compile TypeScript
2. Run `npm test` to verify all existing 1614 tests pass + new tests pass
3. Run `openspec init --tools claude` in a test project to verify instruction files are generated correctly
4. Run `openspec instructions apply --change <test-change>` to manually verify output
5. Uninstall global openspec, rebuild, reinstall from source

No rollback needed — changes are limited to instruction text (LLM-facing) and test additions.

## Open Questions

None. All design decisions resolved through exploration.
