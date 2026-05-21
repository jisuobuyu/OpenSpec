## MODIFIED Requirements

### Requirement: Subagent Dispatch Must Be Mandatory

The apply workflow SHALL require subagent dispatch via `Skill({skill: "subagent-driven-development"})` for every task. Before executing any implementation work, the controller MUST check for the subagent skill file at the project level (`.claude/skills/subagent-driven-development/SKILL.md`) and user level (`~/.claude/skills/subagent-driven-development/SKILL.md`). If the skill file exists at either location, the controller MUST call the Skill tool — local execution is not permitted.

#### Scenario: Skill file exists — dispatch mandatory

- **WHEN** the subagent skill file exists at `.claude/skills/subagent-driven-development/SKILL.md`
- **THEN** the controller SHALL call `Skill({skill: "subagent-driven-development"})` with the full task text
- **AND** the controller SHALL NOT execute any implementation code locally

#### Scenario: Skill file missing — enhanced degradation

- **WHEN** the subagent skill file does not exist at either path
- **AND** discipline level is `enhanced`
- **THEN** the controller SHALL degrade to local execution with full TDD + spec self-check + debugging discipline + quality self-review

#### Scenario: Skill file missing — strict halt

- **WHEN** the subagent skill file does not exist at either path
- **AND** discipline level is `strict`
- **THEN** the controller SHALL halt with an error message directing the user to install the subagent skill

### Requirement: Task Checkbox Must Be Marked Immediately

After completing a task's 6 TDD sub-steps and passing the C0 compliance check, the controller SHALL immediately update `tasks.md` to mark the task's checkbox from `- [ ]` to `- [x]`. The controller SHALL NOT defer checkbox updates or batch them with subsequent tasks.

#### Scenario: Single task completed — checkbox marked immediately

- **WHEN** task 1.1 passes all 6 TDD sub-step compliance checks
- **THEN** the controller SHALL use the Edit tool to update `tasks.md` before proceeding to the next task
- **AND** the controller SHALL announce the completion with progress count (e.g., "Task 1.1 complete (1/5 done)")

#### Scenario: Session interrupted mid-apply — recovery from checkboxes

- **WHEN** a previous apply session was interrupted
- **THEN** the recovery check SHALL read `.openspec.yaml` `last_checkpoint` to identify the last completed task
- **AND** the next task without `[x]` in `tasks.md` SHALL be the resume point

### Requirement: No Per-Task Git Commits During Apply

The apply workflow SHALL NOT create git commits. All implementation changes SHALL remain uncommitted until the archive phase.

#### Scenario: Task completed — no commit created

- **WHEN** task 1.1 completes and checkbox is marked
- **THEN** no `git add` or `git commit` command SHALL be executed
- **AND** `.openspec.yaml` `last_checkpoint` SHALL be updated to the completed task ID

### Requirement: Session Recovery Uses Checkpoint State

Session recovery SHALL detect in-progress work by reading `.openspec.yaml` `last_checkpoint` and comparing with `tasks.md` checkbox status, instead of relying on `git diff --name-only`.

#### Scenario: Recovery with uncommitted changes

- **WHEN** a previous apply session left uncommitted changes
- **THEN** the controller SHALL read `last_checkpoint` from `.openspec.yaml`
- **AND** SHALL scan `tasks.md` for the first task without `[x]` following the checkpoint
- **AND** SHALL offer Resume/Discard/Skip options based on that task
