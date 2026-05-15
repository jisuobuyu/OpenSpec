/**
 * Skill Template Workflow Modules
 *
 * Rewind workflow — roll back task-level changes with checkbox synchronization.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getRewindChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-rewind-change',
    description: 'Rewind a change to a previous task. Use when you need to undo recent task implementations and restore a prior state.',
    instructions: `Rewind implementation to a previous task — undo work and reset progress tracking.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run \`openspec list --json\` to get available changes. Use the **AskUserQuestion tool** to let the user select.
   Show only active changes with implementation work (tasks artifact exists).

2. **Read current task state**

   Read \`tasks.md\` and parse the checkbox status:
   \`\`\`
   Current progress:
   ✅ 1.1: Add login endpoint
   ✅ 1.2: Add password hashing
   ✅ 1.3: Add session management
   [ ] 1.4: Add rate limiting
   [ ] 1.5: Add audit logging
   \`\`\`

3. **Choose rewind target**

   Show completed tasks and let the user pick the rewind target:

   \`\`\`
   ## Rewind: <change-name>

   Which task would you like to rewind TO?

   Changes AFTER the selected task will be reverted.
   Changes at or BEFORE the selected task will be kept.

   [1] Keep up to 1.1: Add login endpoint (rewind 1.2 → 1.3)
   [2] Keep up to 1.2: Add password hashing (rewind 1.3 only)
   [3] Keep up to 1.3: Add session management (no rewind needed)
   \`\`\`

   Use the **AskUserQuestion tool** to let the user select the target.

   **IMPORTANT**: Always confirm before proceeding. Show WHAT will be reverted.

4. **Detect worktree mode**

   Check if the change is in a git worktree:
   \`\`\`bash
   git worktree list
   \`\`\`

5. **Execute rewind**

   ---

   ### Worktree Mode

   a. **Identify commits to revert**:
   \`\`\`bash
   git log --oneline --grep="<change-name>" | head -10
   \`\`\`

   Parse the log to find commits matching the tasks to rewind.

   b. **Revert task commits (in reverse order)**:
   \`\`\`bash
   # For each task being rewound, in reverse chronological order:
   git revert <commit-hash> --no-edit
   \`\`\`

   Revert commits one at a time. If a revert conflicts:
   - Pause and show the conflict
   - Let the user decide: resolve manually, skip, or abort rewind

   c. **Reset task checkboxes**:
   In \`tasks.md\`, change the reverted tasks from \`- [x]\` back to \`- [ ]\`:
   \`\`\`
   - [x] 1.1: Add login endpoint       ← keep
   - [x] 1.2: Add password hashing     ← keep (rewind target)
   - [ ] 1.3: Add session management   ← reverted
   - [ ] 1.4: Add rate limiting        ← not started
   - [ ] 1.5: Add audit logging        ← not started
   \`\`\`

   ---

   ### Folder-Only Mode

   a. **Create a reverse patch**:
   \`\`\`bash
   # Identify files modified after the rewind target task
   git diff --name-only HEAD~N HEAD > /tmp/rewind-files.txt
   \`\`\`

   b. **Manually revert changes** in the identified files.
   Since folder-only mode doesn't have per-task commits, use
   \`git diff\` to examine what changed and manually restore the
   state before the rewind target.

   c. **Reset task checkboxes** as in worktree mode.

   ---

6. **Display rewind summary**

   \`\`\`
   ## Rewind Complete: <change-name>

   **Target task:** 1.2: Add password hashing
   **Reverted tasks:**
   - 1.3: Add session management
   - (1.4 and 1.5 were not started, no reversion needed)

   **Current state:**
   ✅ 1.1: Add login endpoint
   ✅ 1.2: Add password hashing
   [ ] 1.3: Add session management
   [ ] 1.4: Add rate limiting
   [ ] 1.5: Add audit logging

   **Next:** Continue implementation from task 1.3 with \`/opsx:apply <name>\`
   \`\`\`

**Guardrails**
- Always confirm the rewind target before executing
- Show WHAT will be reverted before asking for confirmation
- Revert commits in reverse chronological order
- Keep tasks.md checkbox state synchronized with code
- Handle revert conflicts gracefully — pause, don't force
- In folder-only mode, warn that manual verification may be needed`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxRewindCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Rewind',
    description: 'Rewind a change to a previous task with checkbox synchronization',
    category: 'Workflow',
    tags: ['workflow', 'rewind', 'experimental'],
    content: `Rewind implementation to a previous task.

**Input**: Optionally specify a change name (e.g., \`/opsx:rewind add-auth\`). If omitted, prompt for selection.

**Steps**

1. **Select change** — prompt with \`openspec list --json\` if no name provided

2. **Read task state** — parse tasks.md checkboxes, show current progress

3. **Choose rewind target** — let user pick which task to rewind to, show what will be reverted

4. **Detect worktree mode** — \`git worktree list\`

5. **Execute rewind**:
   - **Worktree mode**: \`git log --oneline\` to find task commits → \`git revert\` in reverse order
   - **Folder-only mode**: identify changed files, manually revert

6. **Reset checkboxes** — change reverted tasks from \`- [x]\` to \`- [ ]\`

7. **Display summary** — target task, reverted tasks, current state, next steps

**Guardrails**
- Always confirm rewind target before executing
- Show what will be reverted before confirmation
- Revert in reverse order
- Keep tasks.md checkboxes synchronized with code state`,
  };
}
