# Commands

Reference for OpenSpec slash commands. Invoked in your AI coding assistant (Claude Code, Cursor, Windsurf, etc.).

For workflow patterns, see [Workflows](workflows.md). For CLI commands, see [CLI](cli.md).

## Quick Reference

Default profile is `strict` with 14 workflows:

### Core Workflows (5)

| Command | Purpose |
|---------|---------|
| `/opsx:propose` | Create a change and generate all planning artifacts |
| `/opsx:explore` | Think through ideas before committing to a change |
| `/opsx:apply` | Implement tasks with mandatory TDD + subagent |
| `/opsx:sync` | Merge delta specs into main specs |
| `/opsx:archive` | Archive a completed change |

### Enhanced Workflows (9)

| Command | Purpose |
|---------|---------|
| `/opsx:new` | Start a new change scaffold |
| `/opsx:continue` | Create the next artifact based on dependencies |
| `/opsx:ff` | Fast-forward: create all planning artifacts at once |
| `/opsx:verify` | 6-dimension consistency audit + test verification |
| `/opsx:review` | Adaptive code review (self-audit / two-phase) |
| `/opsx:simplify` | Post-task code refinement |
| `/opsx:abort` | Non-destructive change abortion |
| `/opsx:rewind` | Task-level rewind with checkbox sync |
| `/opsx:unarchive` | Restore archived change |
| `/opsx:bulk-archive` | Archive multiple changes at once |
| `/opsx:onboard` | Guided tutorial through the complete workflow |

To switch profiles: `openspec config profile [core|enhanced|strict]` then `openspec update`.

---

## Command Reference

### `/opsx:propose`

Create a new change and generate all planning artifacts in one step.

**What it does:**
- Creates `openspec/changes/<change-name>/`
- Generates artifacts needed before implementation (proposal, exploration, specs, design, tasks, review)
- Stops when the change is ready for `/opsx:apply`

**Example:**
```text
You: /opsx:propose add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md
     ✓ specs/ui/spec.md
     ✓ design.md
     ✓ tasks.md
     Ready for implementation. Run /opsx:apply.
```

---

### `/opsx:explore`

Think through ideas, investigate problems, and clarify requirements. Can optionally invoke `Skill({skill: "brainstorming"})` for complex decisions.

---

### `/opsx:new`

Start a new change scaffold — creates the change folder with `.openspec.yaml` metadata. Use `/opsx:continue` or `/opsx:ff` to create artifacts.

**Example:**
```
You: /opsx:new add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     Schema: specpower-driven

     Ready to create: exploration, proposal
     Use /opsx:continue to create one, or /opsx:ff to create all.
```

---

### `/opsx:continue`

Create the next artifact in the dependency chain, one at a time.

---

### `/opsx:ff`

Fast-forward: creates all planning artifacts at once in dependency order. Complex changes invoke `Skill({skill: "writing-plans"})`.

---

### `/opsx:apply`

Implement tasks from the change. **TDD is the core contract — 6 sub-steps per task, non-negotiable. Subagent is the execution wrapper — worktree isolation + review.**

**Two layers, clear separation:**

| Layer      | Role             | How                                         |
|------------|------------------|---------------------------------------------|
| TDD cycle  | WHAT must happen | 6 sub-steps embedded in tasks.md |
| Subagent   | HOW it happens  | Wraps TDD in worktree + two-stage review |

**Three-phase outer loop:**

```
Phase A: Pre-context
  → TDD contract: 6 sub-steps (RED → Verify RED → GREEN → Verify GREEN → REFACTOR → SIMPLIFY)
  → Spec reference extraction for context injection
  → Execution mode: model selection by complexity

Phase B: Task Execution
  → B1. TDD cycle (强制): execute 6 sub-steps in strict order — subagent or not
  → B2. Subagent wrapper (加强): Skill("subagent-driven-development") wraps B1 in isolation
      If subagent unavailable: strict=error, enhanced=local fallback, B1 still executes fully

Phase C: Post-checkpoint
  → C0: Verify all 6 sub-checkboxes are [x]
  → Checkbox → commit → checkpoint → next task
```

**Example:**
```
You: /opsx:apply

AI:  [Skill] subagent-driven-development → task 1.1 (standard, 3 files)

     Working on 1.1: Implement ThemeContext...
     [x] RED: Wrote failing test
     [x] Verify RED: Test fails correctly (feature missing)
     [x] GREEN: Implemented ThemeContext, test passes
     [x] Verify GREEN: All tests pass, no regressions
     [x] REFACTOR: Cleaned up code, tests still green
     [x] SIMPLIFY: Reviewed files for clarity

     ✓ 1.1 Complete. Commit: feat(1.1): Create ThemeContext
```

---

### `/opsx:verify`

Two-layer verification:

| Layer | Method | What it checks |
|-------|--------|----------------|
| L1 | `Skill("verification-before-completion")` | Test suite + coverage |
| L2 | `openspec verify --change` | 6-dimension consistency audit |

**6 audit dimensions:** Spec Coverage, Scenario Completeness, Task Alignment, Design Consistency, Scope Boundary, Implicit Change.

Use `openspec verify --change <name>` for programmatic (code-driven) audit with reproducible results.

---

### `/opsx:review`

Complexity-adaptive code review:

| Complexity | Method |
|------------|--------|
| Simple (<5 files) | AI self-audit checklist |
| Medium (5-15 files) | AI self-review, generate review.md |
| Complex (15+ files) | Two-phase: `Skill("requesting-code-review")` + Spec Review |

---

### `/opsx:simplify`

Post-task code refinement — embedded as the SIMPLIFY sub-step in every task. Can also be invoked standalone via `Skill({skill: "simplify"})` for ad-hoc cleanup outside the apply workflow.

---

### `/opsx:sync`

Merge delta specs from a change into main specs without archiving.

---

### `/opsx:archive`

Archive a completed change. For `specpower-driven` schema, warns if `review.md` or verification checkpoint is missing.

---

### `/opsx:abort`

Non-destructive change abortion. Code backed up to git branch `aborted/<change-name>`, artifacts moved to `openspec/changes/aborted/`.

---

### `/opsx:rewind`

Task-level rewind. Uses `git revert` to undo commits after a specified task, resets `tasks.md` checkboxes.

---

### `/opsx:unarchive`

Restore an archived change. Delta specs reverted from main specs, change moved back to active.

---

### `/opsx:bulk-archive`

Archive multiple completed changes at once. Detects spec conflicts across changes.

---

### `/opsx:onboard`

Guided onboarding tutorial using your actual codebase.

---

## Command Syntax by AI Tool

| Tool | Syntax Example |
|------|----------------|
| Claude Code | `/opsx:propose`, `/opsx:apply` |
| Cursor | `/opsx-propose`, `/opsx-apply` |
| Windsurf | `/opsx-propose`, `/opsx-apply` |
| Copilot (IDE) | `/opsx-propose`, `/opsx-apply` |

---

## Troubleshooting

### "Change not found"
Specify the change name explicitly: `/opsx:apply add-dark-mode`

### "No artifacts ready"
Run `openspec status --change <name>` to see what's blocking

### "Schema not found"
List available schemas: `openspec schemas`

### Commands not recognized
Run `openspec init` then `openspec update` to regenerate skills
