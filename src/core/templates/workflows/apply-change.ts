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
   - In-progress tasks: read \`last_checkpoint\` from \`.openspec.yaml\` and check \`tasks.md\` for the first task without \`- [x]\`

   If a previous apply session was interrupted, display:
   \`\`\`
   ## Session Recovery

   Previous apply did not complete normally.
	   Last checkpoint: <last_checkpoint>
   ✅ 1.1 ... (checked in tasks.md)
   ⚠ 1.2 ... (next task to resume)
   

   Options:
   [1] Resume — continue from the next unchecked task
   [2] Restart — reset the undone task's sub-steps and start fresh
   [3] Skip — mark the undone task as done and continue from the next one
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

**B2. Subagent Dispatch (MANDATORY — NOT OPTIONAL)**

BEFORE any implementation work, verify the skill file exists at one of these paths:
- Project level: \`.claude/skills/subagent-driven-development/SKILL.md\`
- User level: \`~/.claude/skills/subagent-driven-development/SKILL.md\`

**HARD GATE**: If the skill EXISTS (at either path), you MUST call:

\`\`\`
Skill({skill: "subagent-driven-development"})
\`\`\`

This skill wraps the TDD cycle in an isolated subagent. It:
- Creates a git worktree for isolation
- Dispatches an implementer subagent that FOLLOWS THE TDD SUB-STEPS from B1
- Runs two-stage review (spec compliance → code quality) after implementation
- Returns the result

Pass the full task text including all 6 sub-steps to the subagent.

**WHY THIS IS NOT OPTIONAL:**
- No subagent = no worktree isolation
- No subagent = no independent spec compliance review
- No subagent = no independent code quality review
- The final archive commit carries the assurance of these reviews. Without subagent dispatch, that assurance is void.

The outer-loop controller's role is to DISPATCH, not to implement. Implementation happens INSIDE the subagent.

Announce: \`[Skill] subagent-driven-development → task X.Y (model, N files)\`

**After the skill returns**, verify the task result. Blocked or incomplete → pause, escalate to user.

DO NOT execute the task locally unless the skill file genuinely does not exist at either path.

**If the subagent skill is unavailable (降级路径):**

- **strict**: Error — "[Skill check] subagent-driven-development ✗ — 请安装 subagent 技能后重试". Halt. Do not proceed without subagent in strict mode. Run \`openspec init --tools claude\` to install bundled skills, or manually copy to \`.claude/skills/subagent-driven-development/\`.

- **enhanced**: Hard stop first — "[Skill check] subagent-driven-development ✗ — subagent skill not found". Report the missing skill to the user with clear instructions to install it before proceeding. Only if the user explicitly confirms they cannot or will not install the skill, execute the task locally with the following subagent-equivalent discipline:

  **B2-fallback. Local execution with subagent-equivalent discipline**

  When executing without subagent (user confirmed unavailable), you take on the subagent's responsibilities:

  1. **B1 TDD cycle** — execute all 6 sub-steps in full. No shortcuts.

  2. **Spec compliance self-check** — after GREEN passes, re-read the Spec reference
     for this task. Verify:
     - Does the implementation cover every scenario in the spec requirement?
     - Is anything built that the spec doesn't ask for (over-building)?
     - Fix gaps before proceeding to REFACTOR.

  3. **Systematic debugging on failure** — if any TDD sub-step fails
     (RED passes when it should fail, GREEN doesn't pass, Verify GREEN shows
     regressions), apply the same debugging discipline the subagent would use:
     - **Phase 1 — Root cause**: Read error fully, reproduce consistently, trace
       data flow backward to find source. See \`@systematic-debugging/root-cause-tracing.md\`.
     - **Phase 2 — Pattern**: Find working similar code, compare differences.
     - **Phase 3 — Hypothesis**: Single hypothesis, minimal test, one variable.
     - **Phase 4 — Fix**: One fix at source. Verify. Add defense-in-depth
       (see \`@systematic-debugging/defense-in-depth.md\`).
     - **3-attempt rule**: 1-2 failures → re-analyze. 3+ failures → pause,
       report as BLOCKED (possible architectural problem).
     - **Flaky tests**: Use condition-based waiting (see \`@systematic-debugging/condition-based-waiting.md\`),
       not arbitrary delays.

  4. **Code quality self-review** — before marking task complete:
     - Are names clear and accurate?
     - Is code clean and maintainable?
     - Did I avoid overbuilding (YAGNI)?
     - Are tests testing real behavior, not mocks?

  Announce: "[Local] TDD + spec check + debugging discipline (subagent unavailable)"

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

**C1. Mark task complete — DO IT NOW**

IMMEDIATELY after C0 passes, use the Edit tool to update \`tasks.md\`:
\`- [ ] X.Y ...\` → \`- [x] X.Y ...\`

Do NOT defer this. Do NOT batch with other tasks.
The checkbox is the single source of truth for progress.
If the session ends, the checkbox is how recovery knows what's done.

After marking, announce: "✓ Task X.Y complete (N/M done)"

Then STOP. Report progress. Wait for user confirmation before next task.

**C2. Update last_checkpoint**

Update \`.openspec.yaml\` with \`last_checkpoint: "<task-id>"\`.

**C3. Read next task**

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
- Subagent: mandatory per task via \`Skill({skill: "subagent-driven-development"})\` — HARD GATE. Verify skill file exists before each task. DO NOT skip this gate. \`.claude/skills/\` (project) and \`~/.claude/skills/\` (user). Unavailable → hard stop; only local if user explicitly refuses
- Post-checkpoint: verify sub-steps → checkbox → checkpoint → next task. NO git commits during apply
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
- Subagent: \`Skill({skill: "subagent-driven-development"})\` — MANDATORY when skill file exists. HARD GATE: verify skill at \`.claude/skills/\` or \`~/.claude/skills/\` before any implementation. DO NOT execute locally unless skill is genuinely missing
- Subagent unavailable: hard stop first, instruct user to install skill. Only if user explicitly refuses to install: enhanced → local TDD + spec check + debugging + quality review; strict → halt with error

### Post-checkpoint
- **C0 Sub-step compliance**: verify all 6 TDD sub-steps are \`[x]\`; if not → Retry/Explain/Override
- Update \`tasks.md\` checkbox: \`- [ ]\` → \`- [x]\` — DO IT NOW, do NOT defer
- Update \`.openspec.yaml\` → \`last_checkpoint: "<task-id>"\`
- NO git commit during apply — commits happen only at archive time
- Read next task, return to outer loop

**Completion**: All tasks done → suggest \`/opsx:verify\` and \`/opsx:archive\`

**Guardrails**
- You are the outer-loop CONTROLLER — one task at a time
- Snapshot config at start, use consistently
- Follow TDD sub-steps: RED → Verify RED → GREEN → Verify GREEN → REFACTOR → SIMPLIFY
- Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
- Subagent: mandatory per task — HARD GATE via \`Skill({skill: "subagent-driven-development"})\`. Verify skill file before implementation. DO NOT skip this gate
- NO git commits during apply — commits happen only at archive time`,
  };
}
