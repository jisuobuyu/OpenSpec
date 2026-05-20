## TDD is Mandatory

Every task embeds the RED→GREEN→REFACTOR cycle directly as sub-steps. Follow each
sub-step in order before marking the task complete.

  - [ ] RED: Write a failing test that validates the expected behavior
  - [ ] GREEN: Write the minimum code to make the test pass
  - [ ] REFACTOR: Clean up the code while keeping all tests green
  - [ ] SIMPLIFY: Review changed files for clarity, consistency, and dead code

## Spec Reference Annotations

Each task may reference a spec requirement for precise context injection during apply:
- `[Spec: REQ-xxx]` — Links task to a specific requirement. The apply workflow extracts
  the corresponding requirement block (description + scenarios) and injects it as pre-context.
- Multiple references: `[Spec: REQ-001, REQ-003]` — injects all referenced requirements.
- No `[Spec: ...]` annotation → falls back to full spec summary injection.

## 1. <!-- Task Group Name -->

- [ ] 1.1 [Spec: REQ-xxx] <!-- Task description -->
  - [ ] RED: <!-- Write failing test for this task -->
  - [ ] GREEN: <!-- Write minimal code to pass test -->
  - [ ] REFACTOR: <!-- Clean up code, keep tests green -->
  - [ ] SIMPLIFY: <!-- Review changed files for clarity and consistency -->
- [ ] 1.2 <!-- Task description -->
  - [ ] RED: <!-- Write failing test for this task -->
  - [ ] GREEN: <!-- Write minimal code to pass test -->
  - [ ] REFACTOR: <!-- Clean up code, keep tests green -->
  - [ ] SIMPLIFY: <!-- Review changed files for clarity and consistency -->

## 2. <!-- Task Group Name -->

- [ ] 2.1 <!-- Task description -->
  - [ ] RED: <!-- Write failing test for this task -->
  - [ ] GREEN: <!-- Write minimal code to pass test -->
  - [ ] REFACTOR: <!-- Clean up code, keep tests green -->
  - [ ] SIMPLIFY: <!-- Review changed files for clarity and consistency -->
- [ ] 2.2 <!-- Task description -->
  - [ ] RED: <!-- Write failing test for this task -->
  - [ ] GREEN: <!-- Write minimal code to pass test -->
  - [ ] REFACTOR: <!-- Clean up code, keep tests green -->
  - [ ] SIMPLIFY: <!-- Review changed files for clarity and consistency -->
