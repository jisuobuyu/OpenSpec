## ADDED Requirements

### Requirement: parseTasksFile excludes TDD sub-step checkboxes

The `parseTasksFile()` function in `src/commands/workflow/instructions.ts` SHALL count only task-level checkboxes (lines matching `- [ ] X.Y ...`) and SHALL NOT count TDD sub-step checkboxes (indented lines like `- [ ] RED: ...`, `- [ ] GREEN: ...`, `- [ ] REFACTOR: ...`, `- [ ] SIMPLIFY: ...`, `- [ ] Verify RED: ...`, `- [ ] Verify GREEN: ...`).

#### Scenario: Tasks with TDD sub-steps counted correctly

- **WHEN** `parseTasksFile()` reads a tasks.md containing:
  ```
  ## 1. Core
  - [ ] 1.1 Add validation
    - [ ] RED: Write failing test
    - [ ] Verify RED: Confirm failure
    - [ ] GREEN: Implement validation
    - [ ] Verify GREEN: Confirm pass
    - [ ] REFACTOR: Clean up
    - [ ] SIMPLIFY: Review
  - [x] 1.2 Add logging
    - [x] RED: Write failing test
    - [x] Verify RED: Confirm failure
    - [x] GREEN: Implement logging
    - [x] Verify GREEN: Confirm pass
    - [x] REFACTOR: Clean up
    - [x] SIMPLIFY: Review
  ```
- **THEN** it SHALL return exactly 2 tasks (1.1 and 1.2)
- **AND** task 1.1 SHALL have `done: false`
- **AND** task 1.2 SHALL have `done: true`

#### Scenario: Empty tasks file returns no tasks

- **WHEN** `parseTasksFile()` reads an empty string or content with no checkbox lines
- **THEN** it SHALL return an empty array

#### Scenario: Sub-step checkboxes without task headers ignored

- **WHEN** `parseTasksFile()` reads content containing only TDD sub-step lines (no task-level `- [ ] X.Y` lines)
- **THEN** it SHALL return an empty array

### Requirement: Apply instructions output shows accurate task counts

The `openspec instructions apply --change <name>` output SHALL display accurate task counts in the `### Progress` section, matching the count from `parseTasksFile()`.

#### Scenario: Progress section shows task count excluding sub-steps

- **WHEN** `openspec instructions apply --change "test-change"` is run on a change with 3 tasks each having 6 TDD sub-steps
- **THEN** the progress line SHALL show `0/3 complete` (not `0/21 complete`)
