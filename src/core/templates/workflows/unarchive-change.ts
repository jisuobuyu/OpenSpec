/**
 * Skill Template Workflow Modules
 *
 * Unarchive workflow — restore an archived change to active status.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getUnarchiveChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-unarchive-change',
    description: 'Restore an archived change to active status. Use when you need to resume work on a previously archived change.',
    instructions: `Restore an archived change to active status.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available archived changes.

**IMPORTANT**: Unarchive restores the change artifacts, but does NOT restore code. The implementation code must be manually recovered (via git).

**Steps**

1. **If no change name provided, prompt for selection**

   List archived changes:
   \`\`\`bash
   ls openspec/changes/archive/
   \`\`\`

   Show available archived changes with their archive dates. Use the **AskUserQuestion tool** to let the user select.

2. **Confirm unarchive intent**

   Display a summary:
   \`\`\`
   ## Unarchive Change: <change-name>

   This will:
   - Move artifacts from archive/ back to active changes/
   - Remove delta specs from main specs (if they were merged)
   - **NOT** restore any code changes — you MUST manually git checkout/revert

   The change's tasks.md, design.md, proposal.md, and other artifacts
   will be restored to their pre-archive state.

   **WARNING**: Code changes from this change are NOT automatically restored.
   Use git to recover: \`git checkout <original-branch>\` or \`git cherry-pick <commits>\`

   Continue?
   \`\`\`

   Use the **AskUserQuestion tool** with options:
   - "Yes, unarchive this change"
   - "No, keep it archived"

   Do NOT proceed without explicit confirmation.

3. **Identify the archived change**

   \`\`\`bash
   ls openspec/changes/archive/ | grep <name>
   \`\`\`

   The directory will be in format: \`YYYY-MM-DD-<name>\` or \`<name>\`.

4. **Revert delta specs from main specs (if they were merged)**

   Check if the archived change has delta specs:
   \`\`\`bash
   ls openspec/changes/archive/YYYY-MM-DD-<name>/specs/
   \`\`\`

   If delta specs exist and were merged into main specs:
   - Identify the operations that were applied (ADDED, MODIFIED, REMOVED, RENAMED)
   - Reverse each operation:
     - **ADDED**: Remove the added requirements from main specs
     - **MODIFIED**: Roll back to pre-modification content (from archive copy)
     - **REMOVED**: Restore the removed requirements from archive copy
     - **RENAMED**: Revert the name back

   **Note**: This operation is complex and spec-dependent. If the main specs have been further modified since archive, manual resolution may be needed.

   Use a three-way approach:
   a. Read the archived delta spec
   b. Compare with the current main spec
   c. Prompt user for each conflict: "Keep main", "Restore archived", "Manual merge"

5. **Move change back to active**

   \`\`\`bash
   mv openspec/changes/archive/YYYY-MM-DD-<name> openspec/changes/<name>
   \`\`\`

   Verify the move succeeded:
   \`\`\`bash
   ls openspec/changes/<name>/
   \`\`\`

6. **Display recovery instructions**

   \`\`\`
   ## Change Unarchived: <change-name>

   **Artifacts restored to:** openspec/changes/<name>/
   **Delta specs:** Reverted from main specs (or "No delta specs")

   ### Code Recovery Required

   Code changes are NOT automatically restored. To recover:

   1. Find the original branch or commits:
      \`git reflog | grep <change-name>\`
      or check \`refs/heads/aborted/<name>\` if the change was aborted

   2. Restore code:
      \`git checkout <branch-name>\` or \`git cherry-pick <commit-range>\`

   3. Continue work:
      \`/opsx:apply <name>\`

   ### Artifact Status

   The change's proposal, specs, design, tasks, and review are
   restored to their archived state. Review them before resuming work.
   \`\`\`

**Guardrails**
- Always confirm before unarchiving
- Clearly warn that code is NOT automatically restored
- Handle delta spec reversion carefully — spec conflicts may need manual resolution
- Preserve all artifacts from the archive
- Show clear code recovery instructions`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxUnarchiveCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Unarchive',
    description: 'Restore an archived change to active status',
    category: 'Workflow',
    tags: ['workflow', 'unarchive', 'experimental'],
    content: `Restore an archived change to active status.

**Input**: Optionally specify a change name (e.g., \`/opsx:unarchive add-auth\`). If omitted, prompt for selection from archived changes.

**IMPORTANT**: Code is NOT automatically restored — only artifacts are recovered.

**Steps**

1. **Select change** — list archived changes, prompt for selection

2. **Confirm unarchive** — show what will happen, get explicit confirmation

3. **Revert delta specs** — if delta specs were merged to main specs, reverse the operations (ADDED → remove, MODIFIED → rollback, REMOVED → restore, RENAMED → revert)

4. **Move back to active** — \`mv openspec/changes/archive/YYYY-MM-DD-<name> openspec/changes/<name>\`

5. **Display recovery instructions** — how to recover code (git reflog, cherry-pick), artifact status, next steps

**Guardrails**
- Always confirm before unarchiving
- Warn that code is NOT automatically restored
- Handle spec conflicts with user prompts`,
  };
}
