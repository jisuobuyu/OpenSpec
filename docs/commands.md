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

Implement tasks from the change. **TDD and subagent are mandatory for every task.**

**Three-phase outer loop:**

```
Phase A: Pre-context
  → Every task MUST have [TDD]
  → Extract Spec references for context injection

Phase B: Skill Execution
  → Skill({skill: "test-driven-development"}) — mandatory
  → Skill({skill: "subagent-driven-development"}) — mandatory per-task

Phase C: Post-checkpoint
  → C0: Verify skills were actually called
  → Update tasks.md checkbox: [ ] → [x]
  → Skill({skill: "simplify"}) on changed files
  → Read next task, loop back
```

**Example:**
```
You: /opsx:apply

AI:  [Skill] test-driven-development → TDD (RED→GREEN→REFACTOR)
     [Skill] subagent-driven-development → isolating task 1.1

     Working on 1.1: [TDD] Create ThemeContext...
     [Creates src/context/ThemeContext.tsx + tests]

     ✓ 1.1 Complete
     [Skill] simplify → refining files: src/context/ThemeContext.tsx

     Working on 1.2: [TDD] Add CSS variables...
     ...
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

Post-task code refinement via `Skill({skill: "simplify"})`. Scoped to files changed in the current task. Creates dedicated `simplify(<task-id>)` commit for easy undo.

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
