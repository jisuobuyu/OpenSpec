/**
 * Verify-Audit Command
 *
 * Programmatically runs the 6-dimension consistency audit on a change.
 * Unlike the template-based AI verification, this is code-driven and deterministic.
 */

import { promises as fs } from 'fs';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import {
  consistencyAudit,
  parseTasks,
  parseRequirements,
  parseDesignDecisions,
  type AuditInput,
  type ConsistencySeverity,
} from '../../core/validation/consistency-auditor.js';

export interface VerifyAuditOptions {
  change?: string;
  json?: boolean;
}

function severityColor(s: ConsistencySeverity): string {
  switch (s) {
    case 'Pass': return chalk.green('Pass');
    case 'Warning': return chalk.yellow('Warning');
    case 'Critical': return chalk.red('Critical');
  }
}

function severityIcon(s: ConsistencySeverity): string {
  switch (s) {
    case 'Pass': return chalk.green('✓');
    case 'Warning': return chalk.yellow('⚠');
    case 'Critical': return chalk.red('✗');
  }
}

export async function verifyAuditCommand(options: VerifyAuditOptions): Promise<void> {
  const projectRoot = process.cwd();
  const changesDir = path.join(projectRoot, 'openspec', 'changes');

  if (!options.change) {
    throw new Error('Missing required option --change. Use --change <name> to specify the change to audit.');
  }

  const changeDir = path.join(changesDir, options.change);

  // Verify change exists
  try {
    await fs.access(changeDir);
  } catch {
    throw new Error(`Change '${options.change}' not found at ${changeDir}`);
  }

  const spinner = options.json ? undefined : ora('Running consistency audit...').start();

  try {
    // Read artifacts
    let tasksContent = '';
    let specsContent = '';
    let designContent = '';
    let hasSpecs = false;
    let hasDesign = false;

    try {
      tasksContent = await fs.readFile(path.join(changeDir, 'tasks.md'), 'utf-8');
    } catch { /* no tasks.md */ }

    // Scan delta specs
    const specsDir = path.join(changeDir, 'specs');
    try {
      const entries = await fs.readdir(specsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        try {
          const specContent = await fs.readFile(path.join(specsDir, entry.name, 'spec.md'), 'utf-8');
          specsContent += specContent + '\n';
          hasSpecs = true;
        } catch { /* skip */ }
      }
    } catch { /* no specs dir */ }

    try {
      designContent = await fs.readFile(path.join(changeDir, 'design.md'), 'utf-8');
      hasDesign = true;
    } catch { /* no design.md */ }

    // Parse artifacts
    const tasks = parseTasks(tasksContent);
    const specRequirements = parseRequirements(specsContent);
    const designDecisions = parseDesignDecisions(designContent);

    // Get changed files (from git)
    const changedFiles: string[] = [];
    try {
      const { execSync } = await import('child_process');
      const output = execSync('git diff --name-only HEAD', {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 10000,
      });
      changedFiles.push(...output.trim().split('\n').filter(Boolean));
    } catch { /* no git or no changes */ }

    // Read changed file contents (limit to source files)
    const changedFileContents: Record<string, string> = {};
    for (const file of changedFiles) {
      if (file.match(/\.(ts|js|tsx|jsx|py|go|rs|java|rb|php)($|\/)/)) {
        try {
          changedFileContents[file] = await fs.readFile(path.join(projectRoot, file), 'utf-8');
        } catch { /* skip unreadable */ }
      }
    }

    // Build audit input
    const input: AuditInput = {
      changeName: options.change,
      tasks,
      specRequirements,
      designDecisions,
      changedFiles,
      changedFileContents,
      hasDesign,
      hasSpecs,
    };

    // Run audit
    const report = consistencyAudit(input);

    spinner?.stop();

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    // Text output
    console.log(chalk.bold(`\nConsistency Audit: ${options.change}\n`));

    console.log(chalk.bold('  Dimension              Grade     Detail'));
    console.log('  ─────────────────────────────────────────────────────');

    for (const dim of report.dimensions) {
      const icon = severityIcon(dim.severity);
      const grade = severityColor(dim.severity);
      console.log(`  ${dim.dimension.padEnd(22)} ${icon} ${grade.padEnd(9)} ${dim.detail}`);

      if (dim.recommendations.length > 0) {
        for (const rec of dim.recommendations) {
          console.log(`  ${''.padEnd(22)}   → ${chalk.gray(rec)}`);
        }
      }
    }

    console.log();
    console.log(chalk.bold(`  Overall: ${severityColor(report.overall)}`));
    console.log(`  ${report.summary}`);
    console.log();
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}
