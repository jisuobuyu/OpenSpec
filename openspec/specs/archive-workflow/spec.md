# Archive Workflow Specification

## Purpose

The archive workflow finalizes completed OpenSpec changes by running verification checks, syncing delta specs, creating a single git commit that captures both implementation and archive move, and moving the change directory to the archive.

## Requirements

### Requirement: Verification Must Pass Before Archive

The archive workflow SHALL verify that implementation verification has been completed before allowing the archive to proceed. If verification has not been run, the archive workflow SHALL offer to run it and SHALL NOT proceed until verification passes.

#### Scenario: Verification not run — must verify first

- **WHEN** the user invokes archive for a change that has not been verified
- **THEN** the controller SHALL prompt: "Verification has not been run. Run verification before archiving?"
- **AND** the two options SHALL be: [1] Run verify and then archive (Recommended), [2] Skip verification and archive now
- **AND** if user chooses [1], the controller SHALL invoke `/opsx:verify` and SHALL NOT proceed to archive until verify passes

#### Scenario: Verification already passed — proceed

- **WHEN** the user invokes archive and verification has already been completed successfully
- **THEN** the controller SHALL proceed to the final commit step without re-verifying

### Requirement: Single Commit Created After Archive Move

The archive workflow SHALL create a single git commit after the archive directory move. This single commit captures both the implementation changes AND the archive rename (move to archive/). The commit message SHALL list every completed task by ID and description, and SHALL include verification and review status.

#### Scenario: Archive with all tasks complete and verified

- **WHEN** all tasks are marked `[x]` in `tasks.md`
- **AND** verification has passed (Layer 1 tests + Layer 2 audit)
- **THEN** the controller SHALL first move the change directory to archive/
- **AND** then create a single commit with the format:
  ```
  feat(<change-name>): <proposal summary>

  Changes:
  - <task-id>: <task description>
  - <task-id>: <task description>

  Verify: <Layer 1 status>
          <Layer 2 status>
  Review: <review status>
  ```

#### Scenario: Archive with warnings — commit includes warning flags

- **WHEN** archive proceeds with warnings (e.g., incomplete artifacts, skipped review)
- **THEN** the commit SHALL still be created after the move
- **AND** the commit message SHALL note each warning

### Requirement: Pre-Commit Checkbox Validation

Before creating the final commit, the archive workflow SHALL run `openspec instructions apply --change "<name>" --json` and check `progress.remaining`. If `progress.remaining > 0`, the commit SHALL be blocked with an error listing the number of unmarked tasks.

#### Scenario: Unmarked tasks detected — commit blocked

- **WHEN** the archive workflow reaches the validation step
- **AND** `openspec instructions apply --json` reports `progress.remaining > 0`
- **THEN** the controller SHALL display: "N task(s) still unmarked in tasks.md. Mark them first before archive."
- **AND** the controller SHALL NOT proceed to commit

#### Scenario: All tasks marked — commit proceeds

- **WHEN** the archive workflow reaches the validation step
- **AND** `openspec instructions apply --json` reports `progress.remaining === 0`
- **THEN** the controller SHALL proceed

### Requirement: Archive Blocked Without Verify Pass

The archive workflow SHALL refuse to proceed if verification was attempted but failed.

#### Scenario: Verification failed — archive blocked

- **WHEN** the user attempts to archive a change where verification was run but returned failures
- **THEN** the controller SHALL display: "Verification failed. Fix issues and re-verify before archiving."
- **AND** the archive SHALL NOT proceed
