## ADDED Requirements

### Requirement: Apply instruction describes the two-layer execution model

The `apply.instruction` field in `schemas/specpower-driven/schema.yaml` SHALL describe the current execution model: Layer 1 (embedded 6-step TDD cycle, non-negotiable) and Layer 2 (subagent isolation via `Skill({skill: "subagent-driven-development"})`, execution mode enhancement). The instruction MUST be returned verbatim by `openspec instructions apply --change <name>`.

The instruction text SHALL include:
- Two-layer model explanation (Layer 1: TDD cycle with 6 embedded sub-steps, Layer 2: subagent isolation with worktree + review)
- Per-task execution sequence: announce → read Spec annotations → dispatch → follow 6 sub-steps → C0 compliance → post-checkpoint
- The Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
- Subagent dispatch with skill path locations (`.claude/skills/` project-level, `~/.claude/skills/` user-level)
- Degradation path when subagent is unavailable: enhanced mode degrades, strict mode halts
- C0 sub-step compliance: verify all 6 sub-steps are `[x]` before proceeding; 3-attempt rule

#### Scenario: LLM receives correct apply directives

- **WHEN** a user runs `openspec instructions apply --change "add-auth"`
- **THEN** the `<instruction>` block in the output SHALL contain the two-layer model with Layer 1 (embedded TDD sub-steps) and Layer 2 (subagent isolation)
- **AND** it SHALL NOT reference `[TDD]`/`[TDD: Lite]`/`[TDD: Skip]` annotations
- **AND** it SHALL NOT reference `Skill({skill: "test-driven-development"})`
- **AND** it SHALL reference `Skill({skill: "subagent-driven-development"})`

#### Scenario: Instruction includes 6 specific sub-step names

- **WHEN** `openspec instructions apply --change "add-auth"` is run
- **THEN** the instruction text SHALL list the 6 sub-steps in order: RED, Verify RED, GREEN, Verify GREEN, REFACTOR, SIMPLIFY
- **AND** each sub-step SHALL have a one-line description of its purpose

#### Scenario: Instruction includes degradation path

- **WHEN** `openspec instructions apply --change "add-auth"` is run
- **THEN** the instruction text SHALL describe what happens when `subagent-driven-development` skill is unavailable
- **AND** SHALL distinguish between strict mode (halt) and enhanced mode (degrade to local execution with full TDD discipline)

### Requirement: Removed annotation system is absent from schema

The schema.yaml `apply.instruction` SHALL NOT contain any reference to the deprecated `[TDD]`/`[TDD: Lite]`/`[TDD: Skip]` annotation system. These annotations were removed when the 6-step TDD sub-steps were embedded directly into tasks.md and Skill({skill: "test-driven-development"}) was replaced by Skill({skill: "subagent-driven-development"}).

#### Scenario: Schema file is free of deprecated annotations

- **WHEN** a text search is performed on `schemas/specpower-driven/schema.yaml`
- **THEN** the strings `[TDD]`, `[TDD: Lite]`, `[TDD: Skip]`, and `Skill({skill: "test-driven-development"})` SHALL NOT appear in the `apply.instruction` field
