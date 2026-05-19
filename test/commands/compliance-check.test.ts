/**
 * Tests for openspec check --compliance command.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';

const CLI = path.resolve(process.cwd(), 'dist/cli/index.js');

describe('CLI check --change', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-compliance-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec', 'changes', 'test-change'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should detect [TDD] tasks as passing', async () => {
    await fs.writeFile(
      path.join(testDir, 'openspec', 'config.yaml'),
      'schema: specpower-driven\ndiscipline:\n  level: strict\n'
    );

    await fs.writeFile(
      path.join(testDir, 'openspec', 'changes', 'test-change', 'tasks.md'),
      `## 1. Core
- [ ] 1.1 [TDD] Implement login endpoint
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
    expect(output).toContain('TDD: mandatory');
    expect(output).toContain('[TDD]');
    expect(output).toContain('test-driven-development');
    expect(output).toContain('MISSING [TDD]');
  });

  it('should show TDD mandatory even with no config', async () => {
    await fs.writeFile(
      path.join(testDir, 'openspec', 'config.yaml'),
      'schema: specpower-driven\n'
    );

    await fs.writeFile(
      path.join(testDir, 'openspec', 'changes', 'test-change', 'tasks.md'),
      `## 1. Core
- [ ] 1.1 [TDD] Implement login
`
    );

    const output = execSync(
      `node "${CLI}" check --change test-change`,
      { cwd: testDir, encoding: 'utf-8' }
    );

    expect(output).toContain('Discipline: strict');
    expect(output).toContain('TDD: mandatory');
  });

  it('should output valid JSON', async () => {
    await fs.writeFile(
      path.join(testDir, 'openspec', 'config.yaml'),
      'schema: specpower-driven\ndiscipline:\n  level: strict\n'
    );
    await fs.writeFile(
      path.join(testDir, 'openspec', 'changes', 'test-change', 'tasks.md'),
      `## 1. Core
- [ ] 1.1 [TDD] Implement login
- [ ] 1.2 Add tests (missing TDD)
- [ ] 1.3 [TDD] Update docs
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

    // Full tasks have expectedSkill
    expect(report.tasks.every((t: any) => t.expectedSkill === 'test-driven-development')).toBe(true);

    // Full tasks are pass, missing TDD are warn
    const fullTask = report.tasks.find((t: any) => t.hasTdd === true);
    expect(fullTask.severity).toBe('pass');

    const missingTask = report.tasks.find((t: any) => t.hasTdd === false);
    expect(missingTask.severity).toBe('warn');

    // JSON should NOT have tddDefault
    expect(report.tddDefault).toBeUndefined();
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
