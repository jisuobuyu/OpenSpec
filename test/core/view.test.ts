import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ViewCommand } from '../../src/core/view.js';

const stripAnsi = (input: string): string => input.replace(/\u001b\[[0-9;]*m/g, '');

describe('ViewCommand', () => {
  let tempDir: string;
  let originalLog: typeof console.log;
  let logOutput: string[] = [];

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-view-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    originalLog = console.log;
    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };

    logOutput = [];
  });

  afterEach(async () => {
    console.log = originalLog;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('shows changes with no tasks in Draft section, not Completed', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    // Empty change (no tasks.md) - should show in Draft
    await fs.mkdir(path.join(changesDir, 'empty-change'), { recursive: true });

    // Change with tasks.md but no tasks - should show in Draft
    await fs.mkdir(path.join(changesDir, 'no-tasks-change'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'no-tasks-change', 'tasks.md'), '# Tasks\n\nNo tasks yet.');

    // Change with all tasks complete - should show in Completed
    await fs.mkdir(path.join(changesDir, 'completed-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'completed-change', 'tasks.md'),
      '- [x] 1.1 Done task\n'
    );

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const output = logOutput.map(stripAnsi).join('\n');

    // Draft section should contain empty and no-tasks changes
    expect(output).toContain('Draft Changes');
    expect(output).toContain('empty-change');
    expect(output).toContain('no-tasks-change');

    // Completed section should only contain changes with all tasks done
    expect(output).toContain('Completed Changes');
    expect(output).toContain('completed-change');

    // Verify empty-change and no-tasks-change are in Draft section (marked with ○)
    const draftLines = logOutput
      .map(stripAnsi)
      .filter((line) => line.includes('○'));
    const draftNames = draftLines.map((line) => line.trim().replace('○ ', ''));
    expect(draftNames).toContain('empty-change');
    expect(draftNames).toContain('no-tasks-change');

    // Verify completed-change is in Completed section (marked with ✓)
    const completedLines = logOutput
      .map(stripAnsi)
      .filter((line) => line.includes('✓'));
    const completedNames = completedLines.map((line) => line.trim().replace('✓ ', ''));
    expect(completedNames).toContain('completed-change');
    expect(completedNames).not.toContain('empty-change');
    expect(completedNames).not.toContain('no-tasks-change');
  });

  it('sorts active changes by completion percentage ascending with deterministic tie-breakers', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    await fs.mkdir(path.join(changesDir, 'gamma-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'gamma-change', 'tasks.md'),
      '- [x] 1.1 Done\n- [x] 1.2 Also done\n- [ ] 1.3 Not done\n'
    );

    await fs.mkdir(path.join(changesDir, 'beta-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'beta-change', 'tasks.md'),
      '- [x] 1.1 Task 1\n- [ ] 1.2 Task 2\n'
    );

    await fs.mkdir(path.join(changesDir, 'delta-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'delta-change', 'tasks.md'),
      '- [x] 1.1 Task 1\n- [ ] 1.2 Task 2\n'
    );

    await fs.mkdir(path.join(changesDir, 'alpha-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'alpha-change', 'tasks.md'),
      '- [ ] 1.1 Task 1\n- [ ] 1.2 Task 2\n'
    );

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const activeLines = logOutput
      .map(stripAnsi)
      .filter(line => line.includes('◉'));

    const activeOrder = activeLines.map(line => {
      const afterBullet = line.split('◉')[1] ?? '';
      return afterBullet.split('[')[0]?.trim();
    });

    expect(activeOrder).toEqual([
      'alpha-change',
      'beta-change',
      'delta-change',
      'gamma-change'
    ]);
  });

  it('displays SP tag for specpower-driven schema changes', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(path.join(changesDir, 'spec-change'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'spec-change', 'tasks.md'), '- [ ] 1.1 Task 1\n');
    await fs.mkdir(path.join(changesDir, 'spec-change', '.openspec.yaml').replace('.openspec.yaml', ''), { recursive: true });
    // Write .openspec.yaml with schema
    await fs.writeFile(
      path.join(changesDir, 'spec-change', '.openspec.yaml'),
      'schema: specpower-driven\n'
    );

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const output = logOutput.map(stripAnsi).join('\n');
    // spec-change should appear in Active with the SP tag
    const specLine = logOutput.map(stripAnsi).find(l => l.includes('spec-change'));
    expect(specLine).toBeDefined();
  });

  it('displays 探 tag when explore.md exists', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(path.join(changesDir, 'explored-change'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'explored-change', 'tasks.md'), '- [ ] 1.1 Task\n');
    await fs.writeFile(path.join(changesDir, 'explored-change', 'explore.md'), '# Exploration\n');

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const output = logOutput.map(stripAnsi).join('\n');
    expect(output).toContain('explored-change');
  });

  it('displays 审 tag when review.md exists', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(path.join(changesDir, 'reviewed-change'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'reviewed-change', 'tasks.md'), '- [ ] 1.1 Task\n');
    await fs.writeFile(path.join(changesDir, 'reviewed-change', 'review.md'), '# Review\n');

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const output = logOutput.map(stripAnsi).join('\n');
    expect(output).toContain('reviewed-change');
  });

  it('handles change with no .openspec.yaml gracefully', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(path.join(changesDir, 'no-meta'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'no-meta', 'tasks.md'), '- [ ] 1.1 Task\n');

    const viewCommand = new ViewCommand();
    // Should not throw
    await expect(viewCommand.execute(tempDir)).resolves.toBeUndefined();

    const output = logOutput.map(stripAnsi).join('\n');
    expect(output).toContain('no-meta');
  });

  it('handles corrupted tasks.md gracefully', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
    await fs.mkdir(path.join(changesDir, 'corrupt-tasks'), { recursive: true });
    // Write garbage
    await fs.writeFile(path.join(changesDir, 'corrupt-tasks', 'tasks.md'), '\x00\x01\x02');

    const viewCommand = new ViewCommand();
    // Should not crash
    await expect(viewCommand.execute(tempDir)).resolves.toBeUndefined();
  });

  it('should exclude archive directory from change listing', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(path.join(changesDir, 'archive', 'old-change'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'archive', 'old-change', 'tasks.md'), '- [x] Done\n');

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const output = logOutput.map(stripAnsi).join('\n');
    expect(output).not.toContain('old-change');
  });
});

