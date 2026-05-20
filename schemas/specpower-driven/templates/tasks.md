## TDD is Mandatory — The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

If you wrote code before the test, delete it. Start over. No exceptions.

Every task embeds the full TDD cycle directly as sub-steps. Follow each sub-step
in order. If you didn't watch the test fail, you don't know if it tests the right thing.

  - [ ] RED: Write one minimal failing test showing what should happen
  - [ ] Verify RED: Run the test — confirm it fails for the expected reason (feature missing, not typo)
  - [ ] GREEN: Write the minimum code to make the test pass
  - [ ] Verify GREEN: Run the test — confirm it passes and all other tests still pass
  - [ ] REFACTOR: Clean up code: remove duplication, improve names, extract helpers. Keep tests green.
  - [ ] SIMPLIFY: Review all changed files for clarity, consistency, and dead code

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

## 1. <!-- Task Group Name -->

- [ ] 1.1 [Spec: REQ-xxx] <!-- Task description -->
  - [ ] RED: <!-- Write one failing test -->
  - [ ] Verify RED: <!-- Run test, confirm it fails correctly -->
  - [ ] GREEN: <!-- Write minimum code to pass -->
  - [ ] Verify GREEN: <!-- Run test, confirm pass + no regressions -->
  - [ ] REFACTOR: <!-- Clean up, keep tests green -->
  - [ ] SIMPLIFY: <!-- Review changed files for clarity -->
- [ ] 1.2 <!-- Task description -->
  - [ ] RED: <!-- Write one failing test -->
  - [ ] Verify RED: <!-- Run test, confirm it fails correctly -->
  - [ ] GREEN: <!-- Write minimum code to pass -->
  - [ ] Verify GREEN: <!-- Run test, confirm pass + no regressions -->
  - [ ] REFACTOR: <!-- Clean up, keep tests green -->
  - [ ] SIMPLIFY: <!-- Review changed files for clarity -->

## 2. <!-- Task Group Name -->

- [ ] 2.1 <!-- Task description -->
  - [ ] RED: <!-- Write one failing test -->
  - [ ] Verify RED: <!-- Run test, confirm it fails correctly -->
  - [ ] GREEN: <!-- Write minimum code to pass -->
  - [ ] Verify GREEN: <!-- Run test, confirm pass + no regressions -->
  - [ ] REFACTOR: <!-- Clean up, keep tests green -->
  - [ ] SIMPLIFY: <!-- Review changed files for clarity -->
