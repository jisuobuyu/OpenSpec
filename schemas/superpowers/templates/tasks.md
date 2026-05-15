## TDD Level Annotations

Each task may include a TDD level annotation to control the apply workflow:
- `[TDD: Full]` — Full RED→GREEN→REFACTOR cycle with verification after each step:
  1. RED: Write a failing test
  2. Verify RED: Confirm the test fails for the expected reason
  3. GREEN: Write minimal code to make the test pass
  4. Verify GREEN: Confirm all tests pass
  5. REFACTOR: Improve code structure while keeping tests green
- `[TDD: Lite]` — Write tests first, then implement (skip refactor step). Pure renames may skip tests entirely.
- `[TDD: Skip]` — Direct implementation without test-first ordering.

## Spec Reference Annotations

Each task may reference a spec requirement for precise context injection during apply:
- `[Spec: REQ-xxx]` — Links task to a specific requirement. The apply workflow extracts
  the corresponding requirement block (description + scenarios) and injects it as pre-context.
- Multiple references: `[Spec: REQ-001, REQ-003]` — injects all referenced requirements.
- No `[Spec: ...]` annotation → falls back to full spec summary injection.

## 1. <!-- Task Group Name -->

- [ ] 1.1 [TDD: Full] [Spec: REQ-xxx] <!-- Task description -->
- [ ] 1.2 [TDD: Lite] <!-- Task description -->
- [ ] 1.3 [TDD: Skip] <!-- Task description -->

## 2. <!-- Task Group Name -->

- [ ] 2.1 <!-- Task description -->
- [ ] 2.2 <!-- Task description -->
