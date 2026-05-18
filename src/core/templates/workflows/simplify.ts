/**
 * Skill Template Workflow Modules
 *
 * Simplify workflow — post-task code refinement via the simplify skill.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getSimplifySkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-simplify',
    description: 'Refine recently changed code for clarity and consistency after each task. Use as a post-checkpoint step in the apply workflow.',
    instructions: `Refine code changed in the current task for clarity and consistency.

**Context**: This skill is invoked by the apply outer-loop controller after each task completes (post-checkpoint). It operates on the files touched by the just-completed task.

**Steps**

1. **Identify changed files**

   Run \`git diff --name-only HEAD\` to get the list of files modified in the current task.
   Focus ONLY on these files — do not scan the entire project.

2. **Invoke the simplify skill**

   Announce: \`[Skill] simplify → refining files: <file-list>\`
   Call \`Skill({skill: "simplify"})\` with the file whitelist from step 1.

   The simplify skill will:
   - Review changed code for reuse opportunities
   - Eliminate duplication introduced in this task
   - Improve naming consistency within the changed scope
   - Remove dead code or unnecessary abstractions added in this task
   - Ensure changes align with project conventions

3. **Commit the simplification**

   After simplification, create a dedicated commit:
   \`\`\`
   git add <changed-files>
   git commit -m "simplify(<task-id>): refine code from task <task-id>"
   \`\`

   This keeps simplification separate from implementation, making each task's
   history clean and reversible.

4. **If simplification goes wrong**

   Undo with:
   \`\`\`bash
   git revert HEAD --no-edit
   \`\`\`

   The original task implementation commit remains intact.

**Guardrails**
- Only simplify files changed in the current task — do not touch unrelated code
- If there is nothing to simplify, skip — do not force changes
- Keep the simplification commit separate from the implementation commit
- Do NOT modify spec files, design docs, or task definitions during simplify`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxSimplifyCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Simplify',
    description: 'Refine recently changed code for clarity and consistency',
    category: 'Workflow',
    tags: ['workflow', 'refinement', 'experimental'],
    content: `Refine code changed in the current task for clarity and consistency.

**Context**: This command is typically invoked automatically by the apply outer-loop controller after each task completes. You can also invoke it manually.

**Steps**

1. **Identify changed files**

   Run \`git diff --name-only HEAD\` to get the list of files modified.

2. **Invoke the simplify skill**

   Announce: \`[Skill] simplify → refining files: <file-list>\`
   Call \`Skill({skill: "simplify"})\` with the file whitelist.

3. **Commit the simplification**

   \`\`\`
   git add <changed-files>
   git commit -m "simplify(<task-id>): refine code"
   \`\`

4. **Undo if needed**

   \`git revert HEAD --no-edit\` — the implementation commit stays intact.

**Guardrails**
- Only simplify files changed in the current task
- Skip if there is nothing to simplify
- Keep simplification commit separate from implementation`,
  };
}
