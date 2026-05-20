/**
 * Tests for openspec check --change command (embedded TDD sub-steps).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';

const CLI = path.resolve(process.cwd(), 'dist/cli/index.js');

const FULL_SUB_STEPS = `- [ ] RED: Write failing test
  - [ ] GREEN: Write minimal code to pass
  - [ ] REFACTOR: Clean up code
  - [ ] SIMPLIFY: Review changed files`;

describe('CLI check --change', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-compliance-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec', 'changes', 'test-change'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should detect tasks with full TDD sub-steps as passing', async () => {
    await fs.writeFile(
      path.join(testDir, 'openspec', 'config.yaml'),
      'schema: specpower-driven\ndiscipline:\n  level: strict\n'
    );

    await fs.writeFile(
      path.join(testDir, 'openspec', 'changes', 'test-change', 'tasks.md'),
      `## 1. Core
- [ ] 1.1 Implement login endpoint
  ${FULL_SUB_STEPS}
- [ ] 1.2 Update README
- [ ] 1.3 Implement dashboard
`
    );

    const output = execSync(
      `node "${CLI}" check --change test-change`,
      { cwd: testDir, encoding: 'utf-8' }
    );

    expect(output).toContain('Compliance Check: test-change');
    expect(output).toContain('Discipline: strict');
    expect(output).toContain('TDD: embedded');
    expect(output).toContain('TDD sub-steps');
    expect(output).toContain('MISSING TDD sub-steps');
  });

  it('should show TDD embedded even with no config', async () => {
    await fs.writeFile(
      path.join(testDir, 'openspec', 'config.yaml'),
      'schema: specpower-driven\n'
    );

    await fs.writeFile(
      path.join(testDir, 'openspec', 'changes', 'test-change', 'tasks.md'),
      `## 1. Core
- [ ] 1.1 Implement login
  ${FULL_SUB_STEPS}
`
    );

    const output = execSync(
      `node "${CLI}" check --change test-change`,
      { cwd: testDir, encoding: 'utf-8' }
    );

    expect(output).toContain('Discipline: strict');
    expect(output).toContain('TDD: embedded');
  });

  it('should output valid JSON', async () => {
    await fs.writeFile(
      path.join(testDir, 'openspec', 'config.yaml'),
      'schema: specpower-driven\ndiscipline:\n  level: strict\n'
    );
    await fs.writeFile(
      path.join(testDir, 'openspec', 'changes', 'test-change', 'tasks.md'),
      `## 1. Core
- [ ] 1.1 Implement login
  ${FULL_SUB_STEPS}
- [ ] 1.2 Add tests (missing sub-steps)
- [ ] 1.3 Update docs
  ${FULL_SUB_STEPS}
`
    );

    const output = execSync(
      `node "${CLI}" check --change test-change --json`,
      { cwd: testDir, encoding: 'utf-8' }
    );

    const report = JSON.parse(output);
    expect(report.changeName).toBe('test-change');
    expect(report.tasks).toHaveLength(3);
    expect(report.summary.requireSkill).toBe(3);
    expect(report.summary.total).toBe(3);

    // Task 1.1 and 1.3 pass, 1.2 warns
    const fullTasks = report.tasks.filter((t: any) => t.hasSubSteps === true);
    expect(fullTasks).toHaveLength(2);
    expect(fullTasks.every((t: any) => t.severity === 'pass')).toBe(true);

    const missingTasks = report.tasks.filter((t: any) => t.hasSubSteps === false);
    expect(missingTasks).toHaveLength(1);
    expect(missingTasks[0].severity).toBe('warn');
    expect(missingTasks[0].missingSubSteps).toEqual(['GREEN', 'REFACTOR', 'SIMPLIFY']);
  });

  it('should error when --change is missing', () => {
    expect(() => {
      execSync(`node "${CLI}" check`, {
        cwd: testDir, encoding: 'utf-8', stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should show helpful message when no tasks.md', async () => {
    await fs.writeFile(
      path.join(testDir, 'openspec', 'config.yaml'),
      'schema: specpower-driven\n'
    );

    expect(() => {
      execSync(`node "${CLI}" check --change test-change`, {
        cwd: testDir, encoding: 'utf-8', stdio: 'pipe',
      });
    }).toThrow(/No tasks\.md/);
  });
});
