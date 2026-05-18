/**
 * Skill Template Workflow Modules
 *
 * Verify workflow — two-layer verification: L1 execution + L2 consistency audit.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getVerifyChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-verify-change',
    description: 'Verify implementation matches change artifacts with two-layer verification. Use when the user wants to validate that implementation is complete, correct, and coherent before archiving.',
    instructions: `Verify that an implementation matches the change artifacts using two-layer verification.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes. Use the **AskUserQuestion tool** to let the user select.
   Show changes that have implementation tasks. Mark with "(In Progress)" if incomplete.

2. **Check status and load artifacts**

   \`\`\`bash
   openspec status --change "<name>" --json
   openspec instructions apply --change "<name>" --json
   \`\`\`

   Read all files from the returned \`contextFiles\`.

3. **Get changed files**

   \`\`\`bash
   git diff --name-only HEAD
   \`\`\`

   Filter to files relevant to the change. Read their contents for audit analysis.

---

## Layer 1 — Execution Verification

**Skill availability check (before invoking):**

Check if \`verification-before-completion\` skill exists at \`~/.claude/skills/verification-before-completion/SKILL.md\` or equivalent:
- **enhanced discipline**: If missing, degrade gracefully — run test suite manually (npm test / pytest / etc.) and collect coverage. Note: "[Skill check] verification-before-completion ✗ (降级为手动测试验证)"
- **strict discipline**: If missing, error: "[Skill check] verification-before-completion ✗ — 请安装后重试"
- **core discipline**: Run tests manually (no skill dependency)

If skill is available or degradation is accepted:
- Announce: \`[Skill] verification-before-completion → running test suite + coverage\`
- Invoke: \`Skill({skill: "verification-before-completion"})\`.

**Purpose**: Run the test suite, collect coverage statistics, and confirm all tests pass.

**Output expectation**: A test result panel showing:
- Test suite status (passed/failed count)
- Coverage percentage (if available)
- Any failing tests with file:line references

---

## Layer 2 — Consistency Audit

Run the 6-dimension consistency audit using the following heuristics.
For each dimension, grade as **Pass**, **Warning**, or **Critical**.

### Dimension 1: Spec Coverage
- Extract all requirements from delta specs (\`### Requirement:\` headers)
- Search changed files for each requirement (by name, keywords)
- Grade: Pass (all covered), Warning (50%+ covered), Critical (<50% covered)

### Dimension 2: Scenario Completeness
- Count scenarios per requirement (\`#### Scenario:\` headers)
- Check if test files (.test.*, .spec.*, __tests__/) exist in changed files
- Grade: Pass (tests found), Warning (no test files found), Critical (no scenarios defined)

### Dimension 3: Task Alignment
- Parse tasks.md checkboxes: \`- [x]\` (done) vs \`- [ ]\` (pending)
- Cross-check: completed tasks vs actual code changes (git diff)
- Grade: Pass (all done), Warning (some pending or completed-without-code), Critical (all pending)

### Dimension 4: Design Consistency
- Extract key decisions from design.md (bulleted items under ## Decisions)
- Search implementation for evidence each decision was followed
- Grade: Pass (all consistent), Warning (some uncertain), Critical (none verified)

### Dimension 5: Scope Boundary
- Check changed files for unexpected paths (node_modules, .env, secrets, parent dirs)
- Check file count (>30 files → warning)
- Grade: Pass (scope OK), Warning (anomalies detected), Critical (N/A for this dimension)

### Dimension 6: Implicit Change
- Extract modified symbols (functions, classes, exports) from changed files
- Compare against spec requirement keywords
- Any modified symbols not matching spec scope → potential implicit change
- Grade: Pass (all within scope), Warning (>5 unaccounted symbols)

---

## Cross-verification: depends_on

If the change's \`.openspec.yaml\` has \`depends_on\` declarations:
- Read the delta specs of each dependency change
- Cross-verify that this change's implementation is consistent with dependency specs
- Flag any inconsistency: "Dependency '<name>' spec requires X, but this change may conflict"

---

## Output: Dual-Panel Report

\`\`\`
## Verification Report: <change-name>

### Layer 1 — Execution
| Metric           | Result  |
|------------------|---------|
| Tests Passed     | N/N     |
| Coverage         | XX%     |
| Failing Tests    | 0 (or list) |

### Layer 2 — Consistency Audit
| Dimension              | Grade    | Detail                          |
|------------------------|----------|----------------------------------|
| Spec Coverage          | Pass     | 5/5 requirements covered        |
| Scenario Completeness  | Warning  | 3 scenarios, no test files      |
| Task Alignment         | Pass     | 7/7 tasks complete              |
| Design Consistency     | Pass     | All decisions verified          |
| Scope Boundary         | Pass     | 12 files, appropriate scope     |
| Implicit Change        | Warning  | 6 unaccounted symbol changes    |

### Cross-verification (if depends_on)
| Dependency    | Status  |
|---------------|---------|
| other-change  | ✓ Consistent |

### Final Assessment
**Overall: Warning** — 2 warning(s), 4 pass. Review warnings before archiving.
\`\`\`

**Graceful Degradation**
- No delta specs → skip Spec Coverage and Scenario Completeness
- No design.md → skip Design Consistency
- No changed files → skip Scope Boundary and Implicit Change
- Always note which dimensions were skipped and why

**Next Step: Review**

After verification passes (no Critical issues), suggest running code review:

> "Verification complete. Would you like to run \`/opsx:review <name>\` to review the implementation code?"

The review adapts to change complexity:
- Simple changes (< 5 files): quick self-audit checklist
- Medium changes (5-15 files): AI self-review → generates review.md
- Complex changes (15+ files): two-phase review with requesting-code-review skill

**Guardrails**
- Run Layer 1 (skill) FIRST, then Layer 2 (audit)
- Layer 2 grades must be evidence-based, not speculative
- When uncertain, prefer Warning over Critical
- Every Warning/Critical must have an actionable recommendation
- Always suggest running review after successful verification`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxVerifyCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Verify',
    description: 'Verify implementation matches change artifacts with two-layer verification',
    category: 'Workflow',
    tags: ['workflow', 'verify', 'experimental'],
    content: `Verify implementation against change artifacts with two-layer verification.

**Input**: Optionally specify a change name (e.g., \`/opsx:verify add-auth\`). If omitted, prompt for selection.

**Steps**

1. **Select change** — prompt with \`openspec list --json\` if no name provided

2. **Load artifacts** — \`openspec status --change "<name>" --json\` and \`openspec instructions apply --change "<name>" --json\`

3. **Get changed files** — \`git diff --name-only HEAD\` (filter to relevant files)

**Layer 1 — Execution Verification**
Invoke \`Skill({skill: "verification-before-completion"})\` to run tests and collect coverage.
Output: test results panel (passed/failed, coverage %, failing tests).

**Layer 2 — Consistency Audit**
Run 6-dimension audit on changed files:
1. **Spec Coverage** — every requirement traced to code (Pass/Warning/Critical)
2. **Scenario Completeness** — every scenario has test paths
3. **Task Alignment** — checkboxes match actual code changes
4. **Design Consistency** — architecture decisions match implementation
5. **Scope Boundary** — unexpected files or excessive scope
6. **Implicit Change** — unaccounted symbol modifications

**Cross-verification**: If \`depends_on\` exists in \`.openspec.yaml\`, verify consistency with dependency specs.

**Output**: Dual-panel report (Layer 1 test results + Layer 2 6-dimension audit + final Pass/Warning/Critical assessment).

**Guardrails**
- Layer 1 first, Layer 2 second
- Evidence-based grading, not speculation
- When uncertain, prefer Warning over Critical
- Every Warning/Critical needs actionable recommendation`,
  };
}
