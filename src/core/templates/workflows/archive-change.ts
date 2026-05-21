/**
 * Skill Template Workflow Modules
 *
 * Archive workflow — finalizes a change with pre-archive checks, spec sync, and cleanup.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getArchiveChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-archive-change',
    description: 'Archive a completed change in the experimental workflow. Use when the user wants to finalize and archive a change after implementation is complete.',
    instructions: `Archive a completed change in the experimental workflow.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes. Use the **AskUserQuestion tool** to let the user select.
   Show only active changes (not already archived).

2. **Check artifact completion status**

   \`\`\`bash
   openspec status --change "<name>" --json
   \`\`\`

   Parse to check artifact completion. If any artifacts are not \`done\`:
   - Display warning listing incomplete artifacts
   - Prompt user for confirmation before proceeding

3. **Check task completion**

   Read \`tasks.md\` and parse checkboxes. If incomplete tasks exist:
   - Display warning showing count
   - Prompt user for confirmation before proceeding

4. **Pre-archive verification (if not already run)**

   Check if verification has been done (look for \`last_checkpoint\` in \`.openspec.yaml\`, or a prior verify report).

   **If verification has NOT been run**, prompt the user:
   > "Verification has not been run for this change. Run verification before archiving?"
   >
   > [1] Run verify and then archive (Recommended)
   > [2] Skip verification and archive now

   If user chooses option 1, invoke \`/opsx:verify <name>\` before continuing.

   **If verification was run and FAILED**, BLOCK the archive:
   > "Verification failed. Fix issues and re-verify before archiving."

   Do NOT proceed to archive until verification passes. This is a HARD BLOCK.

   **If verification PASSED**, proceed to the next step.

5. **Pre-archive review (if not already done)**

   Check if code review has been performed — look for \`review.md\` in the change directory.

   **If \`review.md\` does NOT exist**, assess change complexity and prompt:
   - **Simple** (< 5 files changed): note that self-audit is sufficient, no review.md needed
   - **Medium/Complex**: prompt the user:
   > "Code review has not been run for this change. Run review before archiving?"
   >
   > [1] Run review and then archive (Recommended)
   > [2] Skip review and archive now

   If user chooses option 1, invoke \`/opsx:review <name>\` before continuing.

6. **Check for parallel change conflicts**

   If other active changes exist, check for conflicts:
   - Scan other active changes' delta specs for overlapping requirements
   - Check for file-level conflicts (same files referenced)
   - If conflicts detected, warn and ask for confirmation

7. **Sync delta specs to main specs**

   Check for delta specs at \`openspec/changes/<name>/specs/\`.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec
   - Determine operations: adds, modifications, removals, renames
   - Show combined summary and prompt:
     - "Sync now (recommended)" — merge delta specs into main
     - "Archive without syncing" — preserve delta specs in archive only

   If user chooses sync, invoke \`/opsx:sync <name>\` or perform the spec merge directly.

8. **Pre-commit validation**

   Verify all tasks are marked before proceeding:

   \`\`\`bash
   openspec instructions apply --change "<name>" --json
   \`\`\`

   Check \`progress.remaining\`:
   - If \`> 0\`: STOP with error — "\`<N>\` task(s) still unmarked in tasks.md. Mark them first before archive."
   - If \`=== 0\`: proceed.

9. **Perform the archive**

   \`\`\`bash
   mkdir -p openspec/changes/archive
   \`\`\`

   Generate target name: \`YYYY-MM-DD-<change-name>\`

   Check if target already exists:
   - If yes: error, suggest renaming existing archive
   - If no: move the change directory

   \`\`\`bash
   mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>
   \`\`\`

10. **Create final commit**

   The archive move is done but not yet committed. This single commit captures both implementation changes AND the archive move:

   \`\`\`bash
   git add -A
   git commit -m "feat(<change-name>): <proposal summary>

   Changes:
   - <task-id>: <task description>
   - <task-id>: <task description>

   Verify: <Layer 1 status>
           <Layer 2 status>
   Review: <review status>"
   \`\`\`

   Parse \`tasks.md\` to build the Changes list. Read verify output for status lines.
   Include \`Co-Authored-By: Claude <noreply@anthropic.com>\` if applicable.

11. **Clean up worktree (if applicable)**

   If a git worktree was used for this change:
   \`\`\`bash
   git worktree remove <worktree-path> --force
   \`\`\`

   Delete the associated branch if it was created for this change.

12. **Display summary**

   \`\`\`
   ## Archive Complete

   **Change:** <change-name>
   **Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
   **Specs:** ✓ Synced (or "No delta specs" or "Sync skipped")
   **Review:** ✓ Completed (or "Skipped" or "N/A - simple change")
   **Worktree:** Cleaned up (or "N/A")
   **Verification:** ✓ Environment preserved (or "Skipped")

   All tasks complete. Change archived successfully.
   \`\`\`

**Output Variants**

**Success:**
\`\`\`
## Archive Complete

**Change:** <name> → openspec/changes/archive/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced | **Review:** ✓ | **Worktree:** ✓
All done.
\`\`\`

**Success with Warnings:**
\`\`\`
## Archive Complete (with warnings)

**Warnings:**
- Archived with 2 incomplete artifacts
- Delta spec sync was skipped
- Verification was skipped
- Review was skipped

Review the archive if this was not intentional.
\`\`\`

**Error (Archive Exists):**
\`\`\`
## Archive Failed

Target already exists: openspec/changes/archive/YYYY-MM-DD-<name>/

**Options:**
1. Rename the existing archive
2. Delete the existing archive if duplicate
3. Wait until a different date
\`\`\`

**Guardrails**
- Always prompt for change selection if not provided
- Offer to run verify before archive if not already done
- Don't block archive on warnings — inform and confirm
- Sync delta specs to main specs as part of archive flow
- Clean up worktree resources on archive
- Preserve .openspec.yaml when moving (it moves with the directory)`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxArchiveCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Archive',
    description: 'Archive a completed change in the experimental workflow',
    category: 'Workflow',
    tags: ['workflow', 'archive', 'experimental'],
    content: `Archive a completed change.

**Input**: Optionally specify a change name (e.g., \`/opsx:archive add-auth\`). If omitted, prompt for selection.

**Steps**

1. **Select change** — prompt with \`openspec list --json\` if no name provided

2. **Check artifact & task completion** — warn if incomplete, confirm before proceeding

3. **Pre-archive verify** — three-way gate: not-run → offer verify; failed → BLOCK, must fix and re-verify; passed → proceed

4. **Pre-archive review** — if \`review.md\` doesn't exist and change is not simple, offer to run \`/opsx:review\` before archiving

5. **Check parallel conflicts** — scan other active changes for overlapping specs/files

6. **Sync delta specs** — merge delta specs into main specs, or skip with warning

7. **Pre-commit validation** — run \`openspec instructions apply --json\`, check \`progress.remaining\`. If > 0, block with unmarked task count

8. **Archive** — \`mkdir -p openspec/changes/archive\` → \`mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>\`

9. **Create final commit** — \`git add -A && git commit -m "feat(<change-name>): <proposal summary>"\` with Changes list, Verify status, Review status. Single commit captures both implementation and archive rename

10. **Clean up worktree** — \`git worktree remove\` if applicable

11. **Display summary** — archive location, spec sync status, review status, worktree cleanup, warnings

**Guardrails**
- Offer verify before archiving — mandatory if not run; block if verify failed
- Offer review before archiving (simple changes exempt)
- Warn on incomplete tasks/artifacts but don't block
- Sync delta specs as part of archive flow
- Clean up worktree resources`,
  };
}
