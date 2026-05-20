/**
 * Skill Template Workflow Modules
 *
 * Apply workflow — the orchestration core of the OpenSpec x Superpowers fusion.
 * TDD and simplify are embedded directly in task sub-steps.
 * Subagent-driven-development remains a Skill call for worktree isolation,
 * enhanced with model selection and two-stage review from the Superpowers skill.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getApplyChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-apply-change',
    description: 'Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.',
    instructions: `Implement tasks from an OpenSpec change.

**You are the OpenSpec apply outer-loop controller.** Process tasks one at a time. Each task has 6 TDD sub-steps embedded directly — follow them in order. Do NOT autonomously proceed to the next task.

**The Iron Law:**

\`\`\`
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
\`\`\`

If you wrote code before the test, delete it. Start over. No exceptions. Don't keep it as "reference." Don't "adapt" it. Delete means delete. Implement fresh from tests.

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

---

**The Outer Loop**

Process tasks ONE AT A TIME. For each pending task, follow this three-phase structure:

---

---

## Task Execution Model — Two Layers

- **Layer 1: TDD CYCLE (strong constraint, NON-NEGOTIABLE)**
  Defined by tasks.md. Every task MUST follow this. Derived from test-driven-development skill.
  RED -> Verify RED -> GREEN -> Verify GREEN -> REFACTOR -> SIMPLIFY
  **This is WHAT must happen. No subagent can skip it.**

- **Layer 2: SUBAGENT ISOLATION (enhancement, EXECUTION MODE)**
  Wraps the TDD cycle in an isolated subagent. Adds worktree isolation + two-stage review.
  **This is HOW it happens. If unavailable, TDD still executes in full — just without isolation.**

**CRITICAL**: Layer 1 (TDD) is the contract. Layer 2 (subagent) is the wrapper. The subagent follows the TDD sub-steps internally. Even if the subagent skill is unavailable, every TDD sub-step still executes. Subagent enhances execution — it does not replace TDD.

---

### Phase A: Pre-context

**A1. The TDD Contract (强约束)**

Every task in \`tasks.md\` has 6 embedded TDD sub-steps. These are non-negotiable. They cannot be skipped, regardless of execution mode:

\`\`\`
- [ ] RED: Write one minimal failing test showing what should happen
- [ ] Verify RED: Run test — confirm it fails for the expected reason (feature missing, not typo/error)
- [ ] GREEN: Write the minimum code to make the test pass
- [ ] Verify GREEN: Run test — confirm it passes and ALL other tests still pass
- [ ] REFACTOR: Clean up code (remove duplication, improve names, extract helpers). Keep tests green.
- [ ] SIMPLIFY: Review all changed files for clarity, consistency, and dead code
\`\`\`

**The Iron Law**: \`NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST\`. Code before test? Delete it. Start over.

**A2. Parse Spec reference**

Scan the task line for \`[Spec: REQ-xxx]\` annotations. Extract and inject the referenced requirement block as pre-context. No annotation → inject full spec summary.

**A3. Execution mode (执行方式)**

The TDD cycle runs inside a subagent for worktree isolation + review:

| Complexity | Subagent model | Signals |
|-----------|----------------|---------|
| Mechanical | Fast/cheap | 1-2 files, clear spec, isolated function |
| Integration | Standard | Multi-file coordination, pattern matching |
| Judgment | Most capable | Architecture, design, broad codebase understanding |

---

### Phase B: Task Execution

**B1. THE TDD CYCLE (强制执行)**

Execute each task's 6 sub-steps in strict order. For each sub-step:

- **RED**: Write one minimal test. It MUST fail (not error). If it passes → you're testing existing behavior, fix the test.
- **Verify RED**: Run the test. Confirm failure is because the feature is missing, not a typo.
- **GREEN**: Write the SIMPLEST code to pass. No extra features, no "improvements" beyond the test.
- **Verify GREEN**: Run the test. Confirm it passes AND all other tests still pass. Any other test fails → fix NOW.
- **REFACTOR**: Remove duplication, improve names, extract helpers. Keep all tests green. Do NOT add behavior.
- **SIMPLIFY**: Review all changed files for clarity, consistency, and dead code. Fix issues found.

After each sub-step completes, mark its checkbox: \`- [ ]\` → \`- [x]\`.

**This is the contract. Subagent or not — these 6 steps always execute in full.**

**B2. Execution wrapper (执行增强)**

Call \`Skill({skill: "subagent-driven-development"})\` to wrap the TDD cycle in an isolated subagent. The skill:

- Creates a git worktree for isolation
- Dispatches an implementer subagent that FOLLOWS THE TDD SUB-STEPS above
- Runs two-stage review (spec compliance → code quality) after implementation
- Returns the result

**The subagent's job is to execute B1's TDD cycle inside isolation.** It does not replace or shorten the TDD cycle. Pass the full task text including all 6 sub-steps to the subagent.

Announce: \`[Skill] subagent-driven-development → task 1.1 (model, N files)\`

**If the subagent skill is unavailable:**
- **strict**: Error — "[Skill check] subagent-driven-development ✗ — 请安装后重试"
- **enhanced**: Degrade — "[Skill check] subagent-driven-development ✗ (降级为本地执行)". Still execute the full TDD cycle in B1.

**After the skill returns**, verify the task result. Blocked or incomplete → pause, escalate to user.

---

### Phase C: Post-checkpoint

After the task implementation completes:

**C0. SUB-STEP COMPLIANCE CHECK** — run this BEFORE marking task complete.

Verify that ALL 6 TDD sub-steps are checked:

\`\`\`
  - [x] RED: Write failing test
  - [x] Verify RED: Confirm test fails correctly
  - [x] GREEN: Write minimum code to pass
  - [x] Verify GREEN: Confirm test passes + no regressions
  - [x] REFACTOR: Clean up code, keep tests green
  - [x] SIMPLIFY: Review changed files for clarity
\`\`\`

If any sub-step is NOT checked:
\`\`\`
⚠ Sub-step compliance failure:
   Task 1.2: Verify RED sub-step not completed.

   If you didn't watch the test fail, you don't know if it tests the right thing.

   Options:
   [1] Retry — redo the missing sub-step
   [2] Explain — provide reason why sub-step was skipped
   [3] Override — mark task done anyway (will be noted in review)
\`\`\`

If user selects [1], go back to the missing sub-step. If [2] or [3], note the exception.

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

---

### Common TDD Rationalizations — DON'T

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete. |
| "TDD will slow me down" | TDD is faster than debugging in production. |

### Red Flags — STOP and Fix

- Code before test → delete code, start over with RED
- Test passes immediately → you're testing existing behavior, fix the test
- Can't explain why test failed → understand before proceeding
- Tests added "later" → that's not TDD, start over
- Rationalizing "just this once" → stop rationalizing
- Skipping Verify RED → you don't know if the test actually tests the right thing
- Subagent reports blocked or incomplete → pause, escalate to user

**Guardrails**
- You are the outer-loop CONTROLLER — process ONE task at a time, then return here
- Snapshot discipline config at start and use it consistently for the entire change
- Follow TDD sub-steps in strict order: RED → Verify RED → GREEN → Verify GREEN → REFACTOR → SIMPLIFY
- The Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
- Subagent: mandatory per task via \`Skill({skill: "subagent-driven-development"})\` — model by complexity, skill handles review internally
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

**You are the OpenSpec apply outer-loop controller.** Process tasks one at a time. Each task has 6 TDD sub-steps embedded directly — follow them in strict order.

**The Iron Law:** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.
Code before test? Delete it. Start over.

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
- **TDD is embedded**: each task has 6 sub-steps: RED → Verify RED → GREEN → Verify GREEN → REFACTOR → SIMPLIFY
- **Parse Spec reference**: \`[Spec: REQ-xxx]\` → extract requirement block for precise context injection
- **Subagent**: mandatory per task, model selected by complexity (cheap/standard/capable). Subagent executes TDD internally.

### Task Execution
- Follow embedded TDD sub-steps in strict order:
  - RED: Write one failing test → Verify RED: Watch it fail correctly → GREEN: Minimal code → Verify GREEN: Watch it pass → REFACTOR: Clean up → SIMPLIFY: Review files
- Subagent: \`Skill({skill: "subagent-driven-development"})\` handles implementer + review internally
- Skill check: enhanced → degrade gracefully if missing; strict → error

### Post-checkpoint
- **C0 Sub-step compliance**: verify all 6 TDD sub-steps are \`[x]\`; if not → Retry/Explain/Override
- Update \`tasks.md\` checkbox: \`- [ ]\` → \`- [x]\`
- Commit work as \`feat(<task-id>): <description>\`
- Update \`.openspec.yaml\` → \`last_checkpoint: "<task-id>"\`
- Read next task, return to outer loop

**Completion**: All tasks done → suggest \`/opsx:verify\` and \`/opsx:archive\`

**Guardrails**
- You are the outer-loop CONTROLLER — one task at a time
- Snapshot config at start, use consistently
- Follow TDD sub-steps: RED → Verify RED → GREEN → Verify GREEN → REFACTOR → SIMPLIFY
- Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
- Subagent: mandatory per task, model by complexity, executes TDD internally`,
  };
}
