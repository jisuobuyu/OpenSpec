## ADDED Requirements

### Requirement: Each uncovered source module has a dedicated test file

Every source module listed in the proposal's Impact section SHALL have a corresponding test file that imports and exercises the module's public API. Each test file SHALL contain at minimum: one test for the happy path, one test for an edge case, and one test for error handling where applicable.

#### Scenario: metrics command has tests

- **WHEN** `npx vitest run test/commands/metrics.test.ts` is executed
- **THEN** at least 3 tests SHALL run and pass
- **AND** the test file SHALL import from `src/commands/metrics.ts`

#### Scenario: instructions command has tests verifying apply instruction content

- **WHEN** `npx vitest run test/commands/workflow/instructions.test.ts` is executed
- **THEN** at least one test SHALL verify that `generateApplyInstructions()` returns instruction text containing "Layer 1" or "TDD" references
- **AND** at least one test SHALL verify that `parseTasksFile()` correctly excludes TDD sub-step checkboxes

#### Scenario: All new test files integrate with the test suite

- **WHEN** `npx vitest run` is executed after all new test files are added
- **THEN** all existing 1614 tests SHALL continue to pass
- **AND** all new tests SHALL pass
- **AND** the total test count SHALL increase

### Requirement: Critical instruction path tests verify schema-instruction consistency

Tests for `src/commands/workflow/instructions.ts` SHALL verify that `apply.instruction` returned by the schema is consistent with the current implementation — specifically that it does NOT contain references to deprecated `[TDD]` annotations or `Skill({skill: "test-driven-development"})`.

#### Scenario: Apply instructions do not contain deprecated content

- **WHEN** a test calls `generateApplyInstructions()` on a project using specpower-driven schema
- **THEN** the returned instruction text SHALL NOT contain the strings `[TDD]`, `[TDD: Lite]`, or `[TDD: Skip]`

#### Scenario: Apply instructions contain current model references

- **WHEN** a test calls `generateApplyInstructions()` on a project using specpower-driven schema
- **THEN** the returned instruction text SHALL contain a reference to embedded TDD sub-steps or the two-layer model

### Requirement: Test coverage for utility modules

Utility modules `src/utils/item-discovery.ts` and `src/utils/match.ts` SHALL have dedicated test files verifying their public functions.

#### Scenario: Item discovery tests

- **WHEN** `npx vitest run test/utils/item-discovery.test.ts` is executed
- **THEN** at least 2 tests SHALL run and pass
- **AND** the test SHALL cover function discovery in directory scanning scenarios

#### Scenario: Match utility tests

- **WHEN** `npx vitest run test/utils/match.test.ts` is executed
- **THEN** at least 2 tests SHALL run and pass
- **AND** the test SHALL cover the pattern matching functions

### Requirement: Test coverage for workspace submodules

Workspace submodules `src/core/workspace/link-input.ts`, `src/core/workspace/open-surface.ts`, and `src/core/workspace/openers.ts` SHALL have dedicated test files.

#### Scenario: Workspace submodule tests pass

- **WHEN** `npx vitest run test/core/workspace/link-input.test.ts test/core/workspace/open-surface.test.ts test/core/workspace/openers.test.ts` is executed
- **THEN** each test file SHALL have at least 2 passing tests
