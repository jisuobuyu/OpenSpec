import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { generateApplyInstructions, applyInstructionsCommand } from '../../../src/commands/workflow/instructions.js';

describe('generateApplyInstructions', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-instructions-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('parseTasksFile excludes TDD sub-step checkboxes from task count', async () => {
    // Setup: create a minimal project with specpower-driven schema metadata
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const changeDir = path.join(changesDir, 'test-change');
    await fs.mkdir(changeDir, { recursive: true });

    // .openspec.yaml with schema metadata
    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      'schema: specpower-driven\n'
    );

    // Create required artifact files so apply is not blocked
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal\n');
    await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n');

    // Create tasks.md with 2 tasks, each having 6 TDD sub-steps
    await fs.writeFile(
      path.join(changeDir, 'tasks.md'),
      `## 1. Core

- [ ] 1.1 Add validation
  - [ ] RED: Write failing test for validation
  - [ ] Verify RED: Confirm failure
  - [ ] GREEN: Implement validation
  - [ ] Verify GREEN: Confirm pass
  - [ ] REFACTOR: Clean up
  - [ ] SIMPLIFY: Review
- [x] 1.2 Add logging
  - [x] RED: Write failing test for logging
  - [x] Verify RED: Confirm failure
  - [x] GREEN: Implement logging
  - [x] Verify GREEN: Confirm pass
  - [x] REFACTOR: Clean up
  - [x] SIMPLIFY: Review
`
    );

    const result = await generateApplyInstructions(tempDir, 'test-change', 'specpower-driven');

    // Should count 2 tasks, NOT 14 (2 tasks + 12 sub-steps)
    expect(result.progress.total).toBe(2);
    expect(result.progress.complete).toBe(1);
    expect(result.progress.remaining).toBe(1);
  });

  it('returns empty tasks for empty tasks.md', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const changeDir = path.join(changesDir, 'empty-change');
    await fs.mkdir(changeDir, { recursive: true });

    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      'schema: specpower-driven\n'
    );
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal\n');
    await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '# No tasks yet\n');

    const result = await generateApplyInstructions(tempDir, 'empty-change', 'specpower-driven');
    expect(result.progress.total).toBe(0);
  });

  it('apply instruction does not contain deprecated TDD annotations', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const changeDir = path.join(changesDir, 'instr-check');
    await fs.mkdir(changeDir, { recursive: true });

    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      'schema: specpower-driven\n'
    );
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal\n');
    await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n');
    await fs.writeFile(
      path.join(changeDir, 'tasks.md'),
      '- [ ] 1.1 A task\n  - [ ] RED: Test\n  - [ ] GREEN: Code\n'
    );

    const result = await generateApplyInstructions(tempDir, 'instr-check', 'specpower-driven');

    expect(result.instruction).not.toContain('[TDD]');
    expect(result.instruction).not.toContain('[TDD: Lite]');
    expect(result.instruction).not.toContain('[TDD: Skip]');
    expect(result.instruction).not.toContain('test-driven-development');
  });

  it('apply instruction contains two-layer model references', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const changeDir = path.join(changesDir, 'model-check');
    await fs.mkdir(changeDir, { recursive: true });

    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      'schema: specpower-driven\n'
    );
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal\n');
    await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n');
    await fs.writeFile(
      path.join(changeDir, 'tasks.md'),
      '- [ ] 1.1 A task\n  - [ ] RED: Test\n  - [ ] GREEN: Code\n'
    );

    const result = await generateApplyInstructions(tempDir, 'model-check', 'specpower-driven');

    expect(result.instruction).toContain('subagent-driven-development');
    expect(result.instruction).toContain('Iron Law');
  });

  it('blocks when required artifacts are missing', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const changeDir = path.join(changesDir, 'blocked-change');
    await fs.mkdir(changeDir, { recursive: true });

    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      'schema: specpower-driven\n'
    );
    // No proposal.md or design.md — should be blocked

    const result = await generateApplyInstructions(tempDir, 'blocked-change', 'specpower-driven');
    expect(result.state).toBe('blocked');
    expect(result.missingArtifacts).toBeDefined();
    expect(result.missingArtifacts!.length).toBeGreaterThan(0);
  });

  it('reports all-done when all tasks are complete', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const changeDir = path.join(changesDir, 'done-change');
    await fs.mkdir(changeDir, { recursive: true });

    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      'schema: specpower-driven\n'
    );
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal\n');
    await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n');
    await fs.writeFile(
      path.join(changeDir, 'tasks.md'),
      '- [x] 1.1 Done task 1\n- [x] 1.2 Done task 2\n- [x] 1.3 Done task 3\n'
    );

    const result = await generateApplyInstructions(tempDir, 'done-change', 'specpower-driven');
    expect(result.state).toBe('all_done');
    expect(result.progress.total).toBe(3);
    expect(result.progress.complete).toBe(3);
    expect(result.progress.remaining).toBe(0);
  });
});
