/**
 * Skill Template Workflow Modules
 *
 * Abort workflow — non-destructive change cancellation with backup and recovery path.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getAbortChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-abort-change',
    description: 'Abort a change non-destructively. Use when you need to cancel an active change while preserving work for potential recovery.',
    instructions: `Abort a change non-destructively — preserve work for potential recovery.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**IMPORTANT**: Abort is DESTRUCTIVE to the current change. Always confirm before proceeding.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes. Use the **AskUserQuestion tool** to let the user select.
   Show only active changes.

2. **Confirm abort intent**

   Display a summary of what will happen:
   \`\`\`
   ## Abort Change: <change-name>

   This will:
   - Backup your work to \`aborted/<change-name>/\` for recovery
   - Remove the change from the active changes list
   - <if worktree mode: Create a git backup branch \`refs/heads/aborted/<change-name>\`>

   Are you sure? This cannot be easily undone.
   \`\`\`

   Use the **AskUserQuestion tool** with options:
   - "Yes, abort this change (backup first)"
   - "No, keep working on this change"

   Do NOT proceed without explicit confirmation.

3. **Detect worktree mode**

   Check if the change is in a git worktree:
   \`\`\`bash
   git worktree list
   \`\`\`

   If the change directory matches a worktree path, proceed with worktree mode.
   Otherwise, use folder-only mode.

4. **Execute abort**

   ---

   ### Worktree Mode (if worktree detected)

   a. **Create backup branch**:
   \`\`\`bash
   git branch refs/heads/aborted/<change-name> HEAD
   \`\`\`
   This creates a named backup ref so the work can be recovered later.

   b. **Move artifacts to aborted directory**:
   \`\`\`bash
   mkdir -p openspec/changes/aborted
   mv openspec/changes/<name> openspec/changes/aborted/<name>
   \`\`\`

   c. **Remove worktree**:
   \`\`\`bash
   git worktree remove <worktree-path> --force
   \`\`\`

   d. **Clean up backup branch tracking** (optional):
   The backup branch \`refs/heads/aborted/<change-name>\` remains in the repo
   for recovery. It won't appear in normal branch listings.

   ---

   ### Folder-Only Mode (no worktree detected)

   a. **Copy source files to aborted directory**:
   \`\`\`bash
   mkdir -p openspec/changes/aborted/<name>/source
   # Copy modified files (from git diff --name-only HEAD) to aborted/<name>/source/
   for file in $(git diff --name-only HEAD); do
     mkdir -p openspec/changes/aborted/<name>/source/$(dirname "$file")
     cp "$file" openspec/changes/aborted/<name>/source/"$file"
   done
   \`\`\`

   b. **Move artifacts to aborted directory**:
   \`\`\`bash
   mv openspec/changes/<name> openspec/changes/aborted/<name>
   \`\`\`

   c. **Revert code changes**:
   \`\`\`bash
   git checkout -- .
   \`\`\`

   ---

5. **Display recovery instructions**

   \`\`\`
   ## Change Aborted: <change-name>

   **Artifacts saved to:** openspec/changes/aborted/<name>/
   **Recovery branch:** refs/heads/aborted/<name> (worktree mode only)

   ### How to Recover

   To restore this change later:
   1. Move artifacts back: \`mv openspec/changes/aborted/<name> openspec/changes/<name>\`
   2. <if worktree: \`git checkout refs/heads/aborted/<name> -b <new-branch>\`>
   3. Continue work with \`/opsx:apply <name>\`

   ### How to Permanently Delete

   \`rm -rf openspec/changes/aborted/<name>\`
   <if worktree: \`git branch -D refs/heads/aborted/<name>\`>
   \`\`\`

**Guardrails**
- ALWAYS confirm with user before aborting
- ALWAYS backup before deleting — abort is non-destructive by design
- Preserve all artifacts (proposal, specs, design, tasks, etc.)
- In folder-only mode, copy source files to preserve uncommitted work
- In worktree mode, create a named git branch for recovery
- Show clear recovery instructions after abort`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxAbortCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Abort',
    description: 'Abort a change non-destructively with backup and recovery path',
    category: 'Workflow',
    tags: ['workflow', 'abort', 'experimental'],
    content: `Abort a change non-destructively.

**Input**: Optionally specify a change name (e.g., \`/opsx:abort add-auth\`). If omitted, prompt for selection.

**IMPORTANT**: Always confirm with the user before aborting.

**Steps**

1. **Select change** — prompt with \`openspec list --json\` if no name provided

2. **Confirm abort** — show summary of backup plan, get explicit user confirmation

3. **Detect worktree mode** — \`git worktree list\` to check

4. **Execute abort**:
   - **Worktree mode**: \`git branch refs/heads/aborted/<name> HEAD\` → move artifacts to \`aborted/\` → \`git worktree remove --force\`
   - **Folder-only mode**: copy source files to \`aborted/<name>/source/\` → move artifacts → \`git checkout -- .\`

5. **Display recovery instructions** — how to restore or permanently delete

**Guardrails**
- Always confirm before aborting
- Always backup — abort is non-destructive
- Show clear recovery path`,
  };
}
