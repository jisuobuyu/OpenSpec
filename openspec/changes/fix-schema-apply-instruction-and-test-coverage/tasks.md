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

## 1. Schema Fix — Rewrite apply.instruction

- [x] 1.1 [Spec: REQ-apply-instruction-sync] Rewrite apply.instruction in schema.yaml with two-layer model
  - [x] RED: Verify current schema apply.instruction contains stale [TDD] references
  - [x] Verify RED: Confirm grep finds `[TDD]`, `Skill({skill: "test-driven-development"})` in current instruction
  - [x] GREEN: Replace apply.instruction text with two-layer model (Layer 1 TDD cycle, Layer 2 subagent isolation)
  - [x] Verify GREEN: Confirm stale terms no longer appear; current terms (subagent-driven-development, embedded sub-steps) are present
  - [x] REFACTOR: Review instruction text for clarity and conciseness — ensure it matches apply-change.ts template structure
  - [x] SIMPLIFY: Verify no duplicate or redundant language in the new instruction text

## 2. Bug Fix — parseTasksFile Regex

- [x] 2.1 [Spec: REQ-instruction-parse-fix] Fix parseTasksFile regex to exclude TDD sub-step checkboxes
  - [x] RED: Write a test that verifies parseTasksFile inflates task count with current regex
  - [x] Verify RED: Run test, confirm it FAILS — sub-step checkboxes counted as tasks
  - [x] GREEN: Change regex in instructions.ts:225 to match only task IDs (X.Y pattern, matching task-progress.ts approach)
  - [x] Verify GREEN: Run test, confirm it PASSES — sub-step checkboxes excluded, task count accurate
  - [x] REFACTOR: Verify parseTasksFile regex is consistent with countTasksFromContent regex in task-progress.ts
  - [x] SIMPLIFY: Review instructions.ts for any other checkbox-matching patterns that may need the same fix

## 3. Instruction Path Tests (Critical)

- [x] 3.1 [Spec: REQ-test-coverage-expansion] Create test/commands/workflow/instructions.test.ts with instruction content verification
  - [x] RED: Write tests for generateApplyInstructions returning correct two-layer model content; parseTasksFile excluding sub-steps
  - [x] Verify RED: Confirm tests fail — no test file exists yet
  - [x] GREEN: Create test file with: (a) instruction content validation tests, (b) parseTasksFile sub-step exclusion tests, (c) deprecated content absence tests
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Verify test uses temp directory fixtures consistently with other test files
  - [x] SIMPLIFY: Remove any redundant assertions across test cases

## 4. Workflow CLI Command Tests

- [x] 4.1 [Spec: REQ-test-coverage-expansion] Create test/commands/workflow/status.test.ts
  - [x] RED: Write tests for statusCommand with fixture changes
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: empty changes dir, change with artifacts, change without artifacts
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Use path.join() for all path assertions
  - [x] SIMPLIFY: Remove console.log mock boilerplate duplication

- [x] 4.2 [Spec: REQ-test-coverage-expansion] Create test/commands/workflow/schemas.test.ts
  - [x] RED: Write tests for schemasCommand output
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: list schemas, JSON output format
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Match existing schema.test.ts conventions
  - [x] SIMPLIFY: Consolidate setup/teardown patterns

- [x] 4.3 [Spec: REQ-test-coverage-expansion] Create test/commands/workflow/templates.test.ts
  - [x] RED: Write tests for templatesCommand output
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: template paths, schema-specific templates
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Align temp fixture structure with actual schema
  - [x] SIMPLIFY: Remove unused fixture files

- [x] 4.4 [Spec: REQ-test-coverage-expansion] Create test/commands/workflow/new-change.test.ts
  - [x] RED: Write tests for newChangeCommand creating a change directory
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: create change, change with description, duplicate name error
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Use unique temp dir names per test to avoid collisions
  - [x] SIMPLIFY: Extract shared temp dir creation helper if used across test file

- [x] 4.5 [Spec: REQ-test-coverage-expansion] Create test/commands/workflow/shared.test.ts
  - [x] RED: Write tests for validateChangeExists, validateSchemaExists, DEFAULT_SCHEMA
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: valid change, missing change, valid schema, invalid schema
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Follow existing validation test patterns
  - [x] SIMPLIFY: Avoid redundant temp dir creation across test cases

- [x] 4.6 [Spec: REQ-test-coverage-expansion] Create test/commands/workflow/verify-audit.unit.test.ts
  - [x] RED: Write unit tests for audit functions imported directly (not via CLI)
  - [x] Verify RED: Confirm tests fail (no unit test file)
  - [x] GREEN: Create test file covering: audit dimension scoring, result aggregation
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Isolate from filesystem — use in-memory fixtures
  - [x] SIMPLIFY: Focus on the pure-function audit logic, not CLI output formatting

## 5. Core and Utility Tests

- [x] 5.1 [Spec: REQ-test-coverage-expansion] Create test/commands/metrics.test.ts
  - [x] RED: Write tests for metricsCommand with fixture data
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: metrics with changes, empty project, JSON output
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Match collector.test.ts fixture patterns
  - [x] SIMPLIFY: Share temp dir setup pattern from other command tests

- [x] 5.2 [Spec: REQ-test-coverage-expansion] Create test/core/config.test.ts
  - [x] RED: Write tests for OPENSPEC_DIR_NAME and config path resolution
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: default config values, path resolution, project config detection
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Avoid modifying actual user config during tests
  - [x] SIMPLIFY: Use process.cwd()-relative temp paths

- [x] 5.3 [Spec: REQ-test-coverage-expansion] Create test/utils/item-discovery.test.ts
  - [x] RED: Write tests for item discovery functions
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: discover changes, discover specs, empty directory
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Use temp directory with known fixture structure
  - [x] SIMPLIFY: Test the public API only — avoid testing internal helpers

- [x] 5.4 [Spec: REQ-test-coverage-expansion] Create test/utils/match.test.ts
  - [x] RED: Write tests for pattern matching utilities
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: exact match, fuzzy match, no match, case sensitivity
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Keep tests pure (no fs, no side effects)
  - [x] SIMPLIFY: One describe block per exported function

- [x] 5.5 [Spec: REQ-test-coverage-expansion] Create test/core/specs-apply.test.ts
  - [x] RED: Write tests for spec application logic
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: apply specs to change, merge delta specs
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Use temp directory with spec fixtures
  - [x] SIMPLIFY: Focus on the core apply logic, not archive cleanup

## 6. Workspace Submodule Tests

- [x] 6.1 [Spec: REQ-test-coverage-expansion] Create test/core/workspace/link-input.test.ts
  - [x] RED: Write tests for link input parsing and validation
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: valid link, invalid name, path normalization
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Match workspace foundation.test.ts patterns
  - [x] SIMPLIFY: Unit-test pure validation functions separately from fs-dependent ones

- [x] 6.2 [Spec: REQ-test-coverage-expansion] Create test/core/workspace/open-surface.test.ts
  - [x] RED: Write tests for open surface resolution
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: resolve opener, surface detection
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Mock platform-specific path resolution
  - [x] SIMPLIFY: Focus on the resolution logic, not actual launching

- [x] 6.3 [Spec: REQ-test-coverage-expansion] Create test/core/workspace/openers.test.ts
  - [x] RED: Write tests for opener detection and availability
  - [x] Verify RED: Confirm tests fail (no test file)
  - [x] GREEN: Create test file covering: available opener, unavailable opener, opener selection
  - [x] Verify GREEN: Run test file, confirm all pass
  - [x] REFACTOR: Mock external process checks (which/command -v)
  - [x] SIMPLIFY: Test the detection logic, not the process spawning

## 7. Verification

- [x] 7.1 Run full test suite and verify all existing + new tests pass
  - [x] RED: N/A — verification step only
  - [x] Verify RED: N/A
  - [x] GREEN: Run `npx vitest run` — confirm 1614+ new tests pass, 0 failures
  - [x] Verify GREEN: Check test report for any skipped or failing tests
  - [x] REFACTOR: Fix any test issues found during full suite run
  - [x] SIMPLIFY: Ensure all test files follow consistent patterns (describe/it naming, temp dir cleanup)
