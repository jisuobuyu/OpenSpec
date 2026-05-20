/**
 * Skill Template Workflow Modules
 *
 * Apply workflow — the orchestration core of the OpenSpec x Superpowers fusion.
 * TDD and simplify are embedded directly in task structure (not external skills),
 * so they cannot be skipped. Subagent-driven-development remains a Skill call
 * because it requires worktree isolation.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getApplyChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-apply-change',
    description: 'Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.',
    instructions: `Implement tasks from an OpenSpec change.

**You are the OpenSpec apply outer-loop controller.** Your job is to process tasks one at a time. Each task has TDD sub-steps embedded directly — follow them in order. Do NOT autonomously decide to proceed to the next task — return to this controller after each task completes.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run \`openspec list --json\` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., \`/opsx:apply <other>\`).

2. **Snapshot discipline configuration**

   Read \`openspec/config.yaml\` and extract the \`discipline\` section. Cache these values for the entire apply session — do NOT re-read config mid-session. This prevents hot-config drift.

   Key settings and their effects:
   - \`discipline.level\`: \`core\` / \`enhanced\` / \`strict\` — controls behavior when skills are unavailable
   - \`discipline.subagent.mode\`: \`per-task\` — subagent-driven-development is mandatory for every task

3. **Check status to understand the schema**
   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`
   Parse the JSON to understand:
   - \`schemaName\`: The workflow being used
   - Which artifact contains the tasks
   - Current progress

4. **Get apply instructions**
   \`\`\`bash
   openspec instructions apply --change "<name>" --json
   \`\`\`
   This returns contextFiles, progress, task list, and dynamic instruction.

   **Handle states:**
   - If \`state: "blocked"\` (missing artifacts): show message, suggest using openspec-continue-change
   - If \`state: "all_done"\`: congratulate, suggest archive
   - Otherwise: proceed to the outer loop

5. **Read context files**

   Read every file path listed under \`contextFiles\` from the apply instructions output.

6. **Detect session recovery state**

   Read \`tasks.md\` and check for:
   - Completed tasks: \`- [x]\` checkboxes
   - In-progress tasks: look for modified but uncommitted code via \`git diff --name-only\`

   If a previous apply session was interrupted, display:
   \`\`\`
   ## Session Recovery

   Previous apply did not complete normally.
   ✅ 1.1 ... (committed)
   ⚠ 1.2 ... (modified, not committed)
   [ ] 1.3 ...

   Options:
   [1] Resume — commit in-progress work and continue
   [2] Discard — revert uncommitted changes and redo task 1.2
   [3] Skip — keep changes, mark 1.2 done, continue from 1.3
   \`\`\`

   If no recovery needed, show current progress and proceed.

7. **Show current progress**

   Display:
   - Schema and discipline level
   - Progress: "N/M tasks complete"
   - Remaining tasks with their Spec references
   - Dynamic instruction from CLI

**The Outer Loop**

Process tasks ONE AT A TIME. For each pending task, follow this three-phase structure:

---

### Phase A: Pre-context

**A1. TDD is embedded in the task**

Each task has RED → GREEN → REFACTOR → SIMPLIFY sub-steps built into the task line. TDD cannot be skipped because the sub-steps are part of the task itself — not an external skill call.

**A2. Parse Spec reference annotation**

Scan the task line for \`[Spec: REQ-xxx]\` annotations:
- Single reference: Extract the requirement block (header + description + all scenarios) from the spec file, inject as pre-context before implementation
- Multiple references: \`[Spec: REQ-001, REQ-003]\` → extract and inject all referenced requirements
- No \`[Spec: ...]\` annotation → Fall back to full spec summary injection (brief overview of all requirements)

**A3. Subagent-driven development**

Every task MUST use \`Skill({skill: "subagent-driven-development"})\` — subagent isolation is mandatory for all tasks. This is the ONE external skill call because it requires worktree isolation which cannot be inlined.

---

### Phase B: Task Execution

**B1. Follow TDD sub-steps in order**

Work through each task's embedded sub-steps:

\`\`\`
- [ ] RED: Write a failing test that validates the expected behavior
- [ ] GREEN: Write the minimum code to make the test pass
- [ ] REFACTOR: Clean up the code while keeping all tests green
- [ ] SIMPLIFY: Review changed files for clarity, consistency, and dead code
\`\`\`

For each sub-step:
1. Do the work described
2. Verify the result (test fails for RED, test passes for GREEN, all pass for REFACTOR/SIMPLIFY)
3. Mark the sub-checkbox: \`- [ ]\` → \`- [x]\`

**TDD is NOT optional.** Every task MUST go through all four sub-steps. No shortcuts.

**B2. Announce subagent invocation**

Before calling subagent, announce:

\`\`\`
[Skill] subagent-driven-development → isolating task (N files, <module>)
\`\`\`

**B3. Skill availability check (before calling subagent):**

Check if the skill directory exists at \`~/.claude/skills/subagent-driven-development/SKILL.md\` or equivalent:
- **enhanced**: If skill is missing, degrade gracefully — proceed without isolation, note: "[Skill check] subagent-driven-development ✗ (降级为本地执行)"
- **strict**: If skill is missing, error: "[Skill check] subagent-driven-development ✗ — 请安装后重试"

---

### Phase C: Post-checkpoint

After the task implementation completes:

**C0. SUB-STEP COMPLIANCE CHECK** — run this BEFORE marking task complete.

Verify that ALL four TDD sub-steps are checked:

\`\`\`
  - [x] RED: Write failing test
  - [x] GREEN: Write minimal code to pass
  - [x] REFACTOR: Clean up code, keep tests green
  - [x] SIMPLIFY: Review changed files for clarity
\`\`\`

If any sub-step is NOT checked:
\`\`\`
⚠ Sub-step compliance failure:
   Task 1.2: RED sub-step not completed.

   Options:
   [1] Retry — redo the missing sub-step
   [2] Explain — provide reason why sub-step was not needed
   [3] Override — mark task done anyway (will be noted in review)
\`\`\`

If user selects [1], go back to the missing sub-step. If [2] or [3], note the exception and continue.

**C1. Update task checkbox**

In \`tasks.md\`, change \`- [ ]\` to \`- [x]\` for the completed task.

**C2. Commit task work**

Create a dedicated commit for the task:

\`\`\`
git add <changed-files>
git commit -m "feat(<task-id>): <task-description>"
\`\`\`

**C3. Update last_checkpoint**

Update \`.openspec.yaml\` with \`last_checkpoint: "<task-id>"\`.

**C4. Read next task**

Return to the top of the outer loop. Read the next pending task from \`tasks.md\`.
Do NOT autonomously decide which task to do — always go back through the loop.

---

**Completion**

When all tasks are done:
\`\`\`
## Implementation Complete

**Change:** <change-name>
**Discipline:** <level>
**Progress:** M/M tasks complete ✓

All tasks complete! Ready to verify with \`/opsx:verify\` and archive with \`/opsx:archive\`.
\`\`\`

**Pause (issue encountered)**

\`\`\`
## Implementation Paused

**Change:** <change-name>
**Progress:** N/M tasks complete

### Issue
<description>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
\`\`\`

**Guardrails**
- You are the outer-loop CONTROLLER — process ONE task at a time, then return here
- Snapshot discipline config at start and use it consistently for the entire change
- Follow TDD sub-steps in order: RED → GREEN → REFACTOR → SIMPLIFY
- Subagent isolation is mandatory for every task
- Post-checkpoint: verify sub-steps → checkbox → commit → checkpoint → next task
- Pause on errors, blockers, or unclear requirements — do not guess
- Keep code changes minimal and scoped to each task`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxApplyCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Apply',
    description: 'Implement tasks from an OpenSpec change (Experimental)',
    category: 'Workflow',
    tags: ['workflow', 'artifacts', 'experimental'],
    content: `Implement tasks from an OpenSpec change.

**You are the OpenSpec apply outer-loop controller.** Process tasks one at a time. Each task has TDD sub-steps embedded directly — follow them in order. Do NOT autonomously proceed to the next task.

**Input**: Optionally specify a change name (e.g., \`/opsx:apply add-auth\`). If omitted, infer from context or prompt.

**Steps**

1. **Select the change** — infer from context, auto-select if only one, or prompt with \`openspec list --json\`

2. **Snapshot discipline config** — read \`openspec/config.yaml\` → \`discipline\` section, cache for the session

3. **Check status** — \`openspec status --change "<name>" --json\`

4. **Get apply instructions** — \`openspec instructions apply --change "<name>" --json\`

5. **Read context files** — all files from \`contextFiles\` in the instructions output

6. **Detect session recovery** — check for incomplete prior session; offer resume/discard/skip options

7. **Show progress** — schema, discipline level, N/M tasks, remaining tasks with Spec annotations

**The Outer Loop** — process ONE task at a time through three phases:

### Pre-context
- **TDD is embedded**: each task has RED → GREEN → REFACTOR → SIMPLIFY sub-steps in the task body. Follow them in order — no skipping.
- **Parse Spec reference**: \`[Spec: REQ-xxx]\` → extract requirement block for precise context injection; no ref → full spec summary
- **Subagent**: every task MUST use \`Skill({skill: "subagent-driven-development"})\` for worktree isolation

### Task Execution
- Follow embedded TDD sub-steps in order: RED (failing test) → GREEN (minimal code) → REFACTOR (clean up) → SIMPLIFY (refine)
- Mark each sub-checkbox \`- [x]\` after completing
- Announce subagent: \`[Skill] subagent-driven-development → isolating task\`
- Skill check: enhanced → degrade gracefully if missing; strict → error

### Post-checkpoint
- **C0 Sub-step compliance**: verify all four TDD sub-steps are \`[x]\`; if not → Retry/Explain/Override
- Update \`tasks.md\` checkbox: \`- [ ]\` → \`- [x]\`
- Commit work as \`feat(<task-id>): <description>\`
- Update \`.openspec.yaml\` → \`last_checkpoint: "<task-id>"\`
- Read next task, return to outer loop

**Completion**: All tasks done → suggest \`/opsx:verify\` and \`/opsx:archive\`

**Guardrails**
- You are the outer-loop CONTROLLER — one task at a time
- Snapshot config at start, use consistently
- Follow TDD sub-steps: RED → GREEN → REFACTOR → SIMPLIFY
- Subagent isolation mandatory per task
- Post-checkpoint: verify sub-steps → checkbox → commit → checkpoint → next`,
  };
}
