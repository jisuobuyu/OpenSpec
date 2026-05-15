/**
 * Skill Template Workflow Modules
 *
 * Review workflow — complexity-adaptive code review with requesting-code-review skill orchestration.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getReviewSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-review',
    description: 'Review implementation with complexity-adaptive depth. Use when the user wants a structured code review before archiving a change.',
    instructions: `Review implementation code for a change with complexity-adaptive depth.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes. Use the **AskUserQuestion tool** to let the user select.
   Show only active changes with implementation work.

2. **Load change context**

   \`\`\`bash
   openspec status --change "<name>" --json
   openspec instructions apply --change "<name>" --json
   \`\`\`

   Read all files from \`contextFiles\`.

3. **Detect change complexity**

   Assess the change's complexity to determine the review format:

   | Signal | Simple | Medium | Complex |
   |--------|--------|--------|---------|
   | Files changed | < 5 | 5-15 | 15+ |
   | Lines changed | < 200 | 200-800 | 800+ |
   | Modules touched | 1 | 2-3 | 4+ |
   | Architectural impact | None | Local | Cross-cutting |

   **Announce the detected complexity level.**

4. **Execute review based on complexity**

   ---

   ### Simple changes (< 5 files, < 200 lines)

   Skip formal review. Perform a self-audit checklist:

   \`\`\`
   ## Self-Audit Checklist
   - [ ] All task checkboxes marked complete
   - [ ] No leftover debug code or console.log
   - [ ] No commented-out code
   - [ ] Variable/function names are descriptive
   - [ ] Error handling for expected failure modes
   - [ ] No hardcoded secrets or credentials
   - [ ] Imports are clean (no unused imports)
   \`\`\`

   If issues found, note them as SUGGESTION level. No formal review.md needed.

   ---

   ### Medium changes (5-15 files, 200-800 lines)

   AI self-review (Form A). Perform a structured review with:

   1. **Code Quality Check**:
      - Naming consistency with project conventions
      - Function length (flag functions > 50 lines)
      - Nesting depth (flag > 4 levels)
      - Duplication within changed files

   2. **Logic Correctness Check**:
      - Edge case handling
      - Null/undefined safety
      - Error propagation
      - Async/await correctness

   3. **Artifact Alignment Check**:
      - Does implementation match spec requirements?
      - Are design decisions reflected in code?
      - Are all tasks accounted for?

   Generate \`review.md\` with:
   - **Review Summary**: Complexity level, files reviewed
   - **Findings**: grouped by severity (CRITICAL / WARNING / SUGGESTION)
   - **Spec Compliance**: requirements coverage check
   - **Design Adherence**: architecture decisions vs implementation
   - **Action Items**: concrete changes needed

   ---

   ### Complex changes (15+ files, 800+ lines, architectural)

   Two-phase review (Form B):

   **Phase 1**: AI self-review (same as Medium)
   **Phase 2**: Invoke \`Skill({skill: "requesting-code-review"})\` for an independent review

   After Phase 2, integrate both reviews into \`review.md\` with a "Convergence" section
   that compares AI findings vs skill findings and flags discrepancies.

   ---

5. **Generate review.md**

   Write the review to \`openspec/changes/<name>/review.md\`. Use the template structure:
   - Review Summary
   - Findings (CRITICAL / WARNING / SUGGESTION)
   - Spec Compliance
   - Design Adherence
   - Action Items

6. **Display summary**

   \`\`\`
   ## Review Complete: <change-name>

   **Complexity:** <level>
   **Format:** <Self-Audit / Form A / Form B>
   **Review:** <path to review.md>

   **Summary:**
   - CRITICAL: N
   - WARNING: N
   - SUGGESTION: N

   <if CRITICAL: "Fix critical issues before archiving.">
   <if all clear: "No critical issues. Ready for archive.">
   \`\`\`

**Guardrails**
- Honor the complexity threshold — don't over-review simple changes, don't under-review complex ones
- Every finding must reference specific file:line locations
- Distinguish between style opinions (SUGGESTION) and actual bugs (CRITICAL)
- If requesting-code-review skill is unavailable in enhanced mode, degrade to extended AI self-review`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxReviewCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Review',
    description: 'Review implementation with complexity-adaptive depth',
    category: 'Workflow',
    tags: ['workflow', 'review', 'experimental'],
    content: `Review implementation code for a change with complexity-adaptive depth.

**Input**: Optionally specify a change name (e.g., \`/opsx:review add-auth\`). If omitted, prompt for selection.

**Steps**

1. **Select change** — prompt with \`openspec list --json\` if no name provided

2. **Load context** — \`openspec status\` and \`openspec instructions apply\` to get artifacts

3. **Detect complexity** — assess files changed, lines changed, modules touched, architectural impact

4. **Execute review**:
   - **Simple** (< 5 files, < 200 lines): Self-audit checklist only, no formal review.md
   - **Medium** (5-15 files, 200-800 lines): AI self-review (Form A) → generate review.md
   - **Complex** (15+ files, 800+ lines, architectural): Two-phase → AI self-review + \`Skill({skill: "requesting-code-review"})\` → integrated review.md

5. **Generate review.md** with Findings (CRITICAL/WARNING/SUGGESTION), Spec Compliance, Design Adherence, Action Items

6. **Display summary** with issue counts and archival readiness

**Guardrails**
- Honor complexity thresholds
- Every finding must reference file:line
- CRITICAL = bugs/breaking issues; WARNING = spec/design gaps; SUGGESTION = style/patterns`,
  };
}
