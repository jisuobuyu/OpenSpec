/**
 * Compliance Check Command
 *
 * Static analysis: checks tasks.md for embedded TDD sub-steps (RED, GREEN, REFACTOR, SIMPLIFY).
 * TDD is embedded directly in task structure — no external skill dependency.
 * Reports whether each task has all four required sub-steps.
 */

import { promises as fs } from 'fs';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { parseTasks } from '../../core/validation/consistency-auditor.js';
import { readProjectConfig } from '../../core/project-config.js';

export interface ComplianceCheckOptions {
  change?: string;
  json?: boolean;
}

interface TaskCompliance {
  taskId: string;
  description: string;
  hasSubSteps: boolean;
  missingSubSteps: string[];
  severity: 'pass' | 'warn';
  message: string;
}

export interface ComplianceReport {
  changeName: string;
  disciplineLevel: string;
  tasks: TaskCompliance[];
  summary: {
    total: number;
    requireSkill: number;
    warn: number;
  };
}

const REQUIRED_SUB_STEPS = ['RED', 'GREEN', 'REFACTOR', 'SIMPLIFY'];

/**
 * Check that a task has all required embedded TDD sub-steps.
 *
 * Sub-steps are indented checkboxes under the task line:
 *   - [ ] RED: ...
 *   - [ ] GREEN: ...
 *   - [ ] REFACTOR: ...
 *   - [ ] SIMPLIFY: ...
 */
export function checkTaskSubSteps(
  taskId: string,
  rawLines: string[],
): { hasAll: boolean; missing: string[] } {
  // Find the task line index
  const taskLineIndex = rawLines.findIndex((line) => {
    const match = line.match(/^- \[[ x]\] (\d+\.\d+)\b/);
    return match && match[1] === taskId;
  });

  if (taskLineIndex === -1) {
    return { hasAll: false, missing: REQUIRED_SUB_STEPS };
  }

  // Scan subsequent indented lines (up to next task or end) for sub-steps
  const found = new Set<string>();
  for (let i = taskLineIndex + 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    // Stop at next task (non-indented or new task number)
    if (/^- \[[ x]\] \d+\.\d+/.test(line)) break;
    // Check for sub-step markers
    for (const step of REQUIRED_SUB_STEPS) {
      if (line.includes(`${step}:`)) {
        found.add(step);
      }
    }
  }

  const missing = REQUIRED_SUB_STEPS.filter((s) => !found.has(s));
  return { hasAll: missing.length === 0, missing };
}

/**
 * Analyzes task compliance: checks that each task has embedded TDD sub-steps.
 * TDD is mandatory — every task must have RED, GREEN, REFACTOR, SIMPLIFY sub-items.
 */
export function analyzeTaskCompliance(
  tasks: Array<{ id: string; description: string }>,
  rawLines: string[],
): TaskCompliance[] {
  return tasks.map((task) => {
    const { hasAll, missing } = checkTaskSubSteps(task.id, rawLines);
    const severity = hasAll ? 'pass' : 'warn';
    const message = hasAll
      ? 'TDD sub-steps: RED → GREEN → REFACTOR → SIMPLIFY ✓'
      : `MISSING TDD sub-steps: ${missing.join(', ')}. Add these sub-items under task ${task.id}.`;

    return {
      taskId: task.id,
      description: task.description,
      hasSubSteps: hasAll,
      missingSubSteps: missing,
      severity,
      message,
    };
  });
}

export async function complianceCheckCommand(options: ComplianceCheckOptions): Promise<void> {
  const projectRoot = process.cwd();

  if (!options.change) {
    throw new Error('Missing required option --change. Use --change <name> to check compliance.');
  }

  const changesDir = path.join(projectRoot, 'openspec', 'changes');
  const changeDir = path.join(changesDir, options.change);

  try {
    await fs.access(changeDir);
  } catch {
    throw new Error(`Change '${options.change}' not found at ${changeDir}`);
  }

  const spinner = options.json ? undefined : ora('Running compliance check...').start();

  try {
    // Read discipline config (for display only)
    const config = readProjectConfig(projectRoot);
    const disciplineLevel = config?.discipline?.level || 'strict';

    // Read tasks.md
    let tasksContent = '';
    try {
      tasksContent = await fs.readFile(path.join(changeDir, 'tasks.md'), 'utf-8');
    } catch {
      throw new Error(`No tasks.md found for change '${options.change}'`);
    }

    const tasks = parseTasks(tasksContent);

    if (tasks.length === 0) {
      spinner?.stop();
      console.log(chalk.gray('No tasks found in tasks.md.'));
      return;
    }

    // Get raw lines for sub-step analysis (parseTasks strips sub-items)
    const rawLines = tasksContent.split('\n');

    const taskCompliances = analyzeTaskCompliance(tasks, rawLines);

    const summary = {
      total: taskCompliances.length,
      requireSkill: taskCompliances.length,
      warn: taskCompliances.filter((t) => t.severity === 'warn').length,
    };

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify({
        changeName: options.change,
        disciplineLevel,
        tasks: taskCompliances,
        summary,
      } as ComplianceReport, null, 2));
      return;
    }

    // Text output
    console.log(chalk.bold(`\nCompliance Check: ${options.change}`));
    console.log(chalk.gray(`Discipline: ${disciplineLevel} | TDD: embedded (sub-steps required)\n`));

    for (const tc of taskCompliances) {
      const icon = tc.severity === 'warn'
        ? chalk.yellow('⚠')
        : chalk.green('✓');

      console.log(`  ${icon} ${tc.taskId.padEnd(5)} ${tc.message}`);
    }

    console.log();
    console.log(chalk.bold(`  Summary: ${summary.requireSkill} task(s), ${summary.warn} need TDD sub-steps`));

    if (summary.warn > 0) {
      console.log();
      console.log(chalk.yellow('  ⚠ Add the missing sub-steps under each task in tasks.md:'));
      console.log(chalk.yellow('       - [ ] RED: Write failing test'));
      console.log(chalk.yellow('       - [ ] GREEN: Write minimal code to pass'));
      console.log(chalk.yellow('       - [ ] REFACTOR: Clean up code'));
      console.log(chalk.yellow('       - [ ] SIMPLIFY: Review changed files'));
    }
    console.log();
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}
