/**
 * Compliance Check Command
 *
 * Static analysis: checks tasks.md TDD annotations against discipline config.
 * Reports whether each task's [TDD: X] annotation is consistent with the
 * configured discipline level, and flags tasks that should trigger skill
 * invocations but might be missed.
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
  tddAnnotation: 'full' | 'lite' | 'skip' | 'none';
  expectedSkill: string | null;
  severity: 'pass' | 'warn' | 'skip';
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

export function parseTddAnnotation(line: string): 'full' | 'lite' | 'skip' | 'none' {
  if (/\[TDD:\s*Full\]/i.test(line)) return 'full';
  if (/\[TDD:\s*Lite\]/i.test(line)) return 'lite';
  if (/\[TDD:\s*Skip\]/i.test(line)) return 'skip';
  return 'none';
}

/**
 * Pure function: analyze task compliance. TDD is mandatory — every task
 * must have [TDD: Full] annotation and call test-driven-development skill.
 */
export function analyzeTaskCompliance(
  tasks: Array<{ id: string; description: string }>,
  rawLines: string[],
): TaskCompliance[] {
  return tasks.map((task, i) => {
    const rawLine = rawLines[i] || '';
    const tddAnnotation = parseTddAnnotation(rawLine);

    const isFull = tddAnnotation === 'full';
    const expectedSkill = 'test-driven-development';
    const severity: 'pass' | 'warn' | 'skip' = isFull ? 'pass' : 'warn';
    const message = isFull
      ? `[TDD: Full] → Skill("test-driven-development") expected.`
      : `MISSING [TDD: Full] annotation → TDD is mandatory for all tasks. Add [TDD: Full] to this task.`;

    return {
      taskId: task.id,
      description: task.description,
      tddAnnotation,
      expectedSkill,
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

    // Re-parse raw lines to get TDD annotations (parseTasks strips them).
    // Must use the SAME regex as parseTasks to ensure index alignment.
    const taskLineRegex = /^- \[([ x])\] (\d+\.\d+)\s*(.*)$/;
    const rawLines = tasksContent.split('\n').filter((l) => taskLineRegex.test(l));

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
    console.log(chalk.gray(`Discipline: ${disciplineLevel} | TDD: mandatory\n`));

    for (const tc of taskCompliances) {
      const icon = tc.severity === 'warn' ? chalk.yellow('⚠')
        : chalk.green('✓');
      const skill = chalk.yellow(` [→ ${tc.expectedSkill}]`);

      console.log(`  ${icon} ${tc.taskId.padEnd(5)} ${tc.message}${skill}`);
    }

    console.log();
    console.log(chalk.bold(`  Summary: ${summary.requireSkill} task(s) require skill, ${summary.warn} need verification`));

    if (summary.warn > 0) {
      console.log();
      console.log(chalk.yellow('  ⚠ Use the C0 compliance check in /opsx:apply to verify'));
      console.log(chalk.yellow('     skills were actually invoked before marking tasks complete.'));
    }
    console.log();
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}
