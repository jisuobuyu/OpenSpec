/**
 * Skill Template Workflow Modules
 *
 * Apply workflow — the orchestration core of the OpenSpec x Superpowers fusion.
 * This is a thin orchestration layer: it tells the AI WHEN to call WHICH skill,
 * but does not embed TDD/Simplify instructions directly.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getApplyChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-apply-change',
    description: 'Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.',
    instructions: `Implement tasks from an OpenSpec change.

**You are the OpenSpec apply outer-loop controller.** Your job is to process tasks one at a time, calling Superpowers skills as needed. Do NOT autonomously decide to proceed to the next task — return to this controller after each task completes.

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
   - \`discipline.level\`: \`core\` (no skill calls), \`enhanced\` (skill calls with graceful degradation), \`strict\` (skill calls, error if missing)
   - \`discipline.tdd.default\`: \`full\` / \`lite\` / \`skip\` / \`adaptive\` — default TDD level when no \`[TDD: ...]\` annotation on a task
   - \`discipline.subagent.mode\`: \`off\` / \`per-task\` / \`adaptive\` — whether to use subagent-driven-development

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
   - Remaining tasks with their TDD levels and spec references
   - Dynamic instruction from CLI

**The Outer Loop**

Process tasks ONE AT A TIME. For each pending task, follow this three-phase structure:

---

### Phase A: Pre-context

**A1. Parse TDD level annotation**

Scan the task line in \`tasks.md\` for a TDD annotation:
- \`[TDD: Full]\` → Full RED→GREEN→REFACTOR cycle
- \`[TDD: Lite]\` → Test-first without refactor step
- \`[TDD: Skip]\` → Direct implementation, no test-first ordering
- No annotation → Use \`discipline.tdd.default\` from the config snapshot

**A2. Parse Spec reference annotation**

Scan the task line for \`[Spec: REQ-xxx]\` annotations:
- Single reference: Extract the requirement block (header + description + all scenarios) from the spec file, inject as pre-context before implementation
- Multiple references: \`[Spec: REQ-001, REQ-003]\` → extract and inject all referenced requirements
- No \`[Spec: ...]\` annotation → Fall back to full spec summary injection (brief overview of all requirements)

**A3. Determine subagent mode**

Check \`discipline.subagent.mode\` from the config snapshot:
- \`per-task\`: Use \`Skill({skill: "subagent-driven-development"})\` for this task
- \`adaptive\`: Use subagent only for Complex tasks (files > 5, cross-module, or architectural)
- \`off\`: Never use subagent

---

### Phase B: Skill Execution

**CRITICAL — you MUST announce every skill invocation before calling it.**
Use this exact format so the user can see what is happening:

\`\`\`
[Skill] test-driven-development → Full TDD (RED → Verify RED → GREEN → Verify GREEN → REFACTOR)
[Skill] simplify → refining files: src/auth/login.ts, src/auth/login.test.ts
[Skill] subagent-driven-development → isolating complex task (7 files, cross-module)
\`\`\`

Based on the parsed TDD level and discipline level:

**B1. If discipline.level is \`core\`:**
- Announce: \`[No Skill] core mode — implementing directly\`
- Implement directly (no skill calls)
- Follow TDD level conventions manually

**B2. If discipline.level is \`enhanced\` or \`strict\`:**

| TDD Level | Action | Announce |
|-----------|--------|----------|
| \`Full\` | \`Skill({skill: "test-driven-development"})\` | \`[Skill] test-driven-development → Full TDD (RED→GREEN→REFACTOR)\` |
| \`Lite\` | \`Skill({skill: "test-driven-development"})\` with hint: "skip REFACTOR step" | \`[Skill] test-driven-development → Lite TDD (RED→GREEN, skip REFACTOR)\` |
| \`Skip\` | Implement directly | \`[No Skill] TDD: Skip — implementing directly\` |

**B3. Skill availability check (before calling any skill):**

Check if the skill directory exists at \`~/.claude/skills/<skill-name>/SKILL.md\` or equivalent:
- **enhanced**: If skill is missing, degrade gracefully — use a built-in simplified version and note: "[Skill check] <skill-name> ✗ (降级为内置 Lite TDD)"
- **strict**: If skill is missing, error: "[Skill check] <skill-name> ✗ — 请安装后重试"

---

### Phase C: Post-checkpoint

After the task implementation completes:

**C0. SKILL COMPLIANCE CHECK** — run this BEFORE marking task complete.

Verify that all required skills were actually invoked during Phase B:

| Check | Rule |
|-------|------|
| Task has \`[TDD: Full]\` → was \`Skill({skill: "test-driven-development"})\` called? | Required |
| Task has \`[TDD: Lite]\` → was \`Skill({skill: "test-driven-development"})\` called? | Required |
| Task completed → was \`Skill({skill: "simplify"})\` called? | Required (enhanced/strict) |

How to verify:
- Scan the conversation messages from the current Phase B execution
- Check for \`[Skill]\` announcement markers you output earlier
- Check for actual Skill tool invocations

If a required skill was NOT called:
\`\`\`
⚠ Skill compliance failure:
   Task 1.2 has [TDD: Full] but test-driven-development was not invoked.

   Options:
   [1] Retry — redo task with Skill({skill: "test-driven-development"})
   [2] Explain — provide reason why skill was not needed
   [3] Override — mark task done anyway (will be noted in review)
\`\`\`

If user selects [1], go back to Phase B with the skill. If [2] or [3], note the exception and continue.

**C1. Update task checkbox**

In \`tasks.md\`, change \`- [ ]\` to \`- [x]\` for the completed task.

**C2. Trigger simplify**

If the discipline level is \`enhanced\` or \`strict\`:
- Announce: \`[Skill] simplify → refining files: <file-list>\`
- Invoke: \`Skill({skill: "simplify"})\`

Pass the file whitelist (only files changed in this task) and create a dedicated commit:
\`\`\`
git add <changed-files>
git commit -m "simplify(<task-id>): refine code from task <task-id>"
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
- Always parse TDD level and Spec reference before each task
- Call Skill() based on TDD level, not unconditionally
- Post-checkpoint: checkbox → simplify → checkpoint → next task
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

**You are the OpenSpec apply outer-loop controller.** Process tasks one at a time, calling Superpowers skills as directed. Do NOT autonomously proceed to the next task — return to the controller after each one.

**Input**: Optionally specify a change name (e.g., \`/opsx:apply add-auth\`). If omitted, infer from context or prompt.

**Steps**

1. **Select the change** — infer from context, auto-select if only one, or prompt with \`openspec list --json\`

2. **Snapshot discipline config** — read \`openspec/config.yaml\` → \`discipline\` section, cache for the session

3. **Check status** — \`openspec status --change "<name>" --json\`

4. **Get apply instructions** — \`openspec instructions apply --change "<name>" --json\`

5. **Read context files** — all files from \`contextFiles\` in the instructions output

6. **Detect session recovery** — check for incomplete prior session; offer resume/discard/skip options

7. **Show progress** — schema, discipline level, N/M tasks, remaining tasks with TDD/Spec annotations

**The Outer Loop** — process ONE task at a time through three phases:

### Pre-context
- **Parse TDD level**: \`[TDD: Full]\` / \`[TDD: Lite]\` / \`[TDD: Skip]\` / default from discipline config
- **Parse Spec reference**: \`[Spec: REQ-xxx]\` → extract requirement block for precise context injection; no ref → full spec summary
- **Subagent mode**: check \`discipline.subagent.mode\` — \`per-task\` always, \`adaptive\` for complex tasks, \`off\` never

### Skill Execution
- **Announce before every skill**: \`[Skill] <skill-name> → <what it does>\`
- \`discipline.level: core\` → announce \`[No Skill] core mode\`, implement directly
- \`discipline.level: enhanced\` / \`strict\`:
  - \`[TDD: Full]\` → announce + \`Skill({skill: "test-driven-development"})\`
  - \`[TDD: Lite]\` → announce + skill + skip-refactor hint
  - \`[TDD: Skip]\` → announce \`[No Skill] TDD: Skip\`, direct implementation
- **Skill check**: enhanced → degrade gracefully if missing; strict → error

### Post-checkpoint
- **C0 Skill compliance check**: verify [TDD: Full/Lite] → Skill was actually called; if not → alert user (Retry/Explain/Override)
- Update \`tasks.md\` checkbox: \`- [ ]\` → \`- [x]\`
- Announce: \`[Skill] simplify → refining files: <list>\`
- Trigger \`Skill({skill: "simplify"})\` on changed files, commit as \`simplify(<task-id>)\`
- Update \`.openspec.yaml\` → \`last_checkpoint: "<task-id>"\`
- Read next task, return to outer loop

**Completion**: All tasks done → suggest \`/opsx:verify\` and \`/opsx:archive\`

**Guardrails**
- You are the outer-loop CONTROLLER — one task at a time
- Snapshot config at start, use consistently
- Parse TDD + Spec annotations before each task
- Post-checkpoint: checkbox → simplify → checkpoint → next`,
  };
}
