import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { loadChangeContext, formatChangeStatus } from '../../../src/core/artifact-graph/index.js';

describe('status helper functions', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-status-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('formatChangeStatus returns correct structure for a change with explore and proposal', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const changeDir = path.join(changesDir, 'partial-change');
    await fs.mkdir(changeDir, { recursive: true });

    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      'schema: specpower-driven\n'
    );
    await fs.writeFile(path.join(changeDir, 'explore.md'), '# Explore\n');
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal\n');

    const context = loadChangeContext(tempDir, 'partial-change', 'specpower-driven');
    const status = formatChangeStatus(context);

    expect(status.changeName).toBe('partial-change');
    expect(status.schemaName).toBe('specpower-driven');
    expect(status.isComplete).toBe(false);
    expect(status.artifacts.length).toBeGreaterThan(0);

    const exploreArtifact = status.artifacts.find((a) => a.id === 'explore');
    expect(exploreArtifact).toBeDefined();
    expect(exploreArtifact?.status).toBe('done');

    const tasksArtifact = status.artifacts.find((a) => a.id === 'tasks');
    expect(tasksArtifact).toBeDefined();
    expect(tasksArtifact?.status).toBe('blocked');
  });

  it('formatChangeStatus marks change as complete when all artifacts done', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const changeDir = path.join(changesDir, 'full-change');
    await fs.mkdir(changeDir, { recursive: true });

    await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: specpower-driven\n');
    await fs.writeFile(path.join(changeDir, 'explore.md'), '# E\n');
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# P\n');
    await fs.writeFile(path.join(changeDir, 'design.md'), '# D\n');

    await fs.mkdir(path.join(changeDir, 'specs', 'test-cap'), { recursive: true });
    await fs.writeFile(path.join(changeDir, 'specs', 'test-cap', 'spec.md'), '# Spec\n');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [x] 1.1 A task\n');

    const context = loadChangeContext(tempDir, 'full-change', 'specpower-driven');
    const status = formatChangeStatus(context);

    const doneArtifacts = status.artifacts.filter((a) => a.status === 'done');
    // explore, proposal, design, specs, tasks should all be done
    expect(doneArtifacts.length).toBeGreaterThanOrEqual(5);
  });

  it('formatChangeStatus returns applyRequires', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const changeDir = path.join(changesDir, 'req-change');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: specpower-driven\n');

    const context = loadChangeContext(tempDir, 'req-change', 'specpower-driven');
    const status = formatChangeStatus(context);

    expect(status.applyRequires).toBeDefined();
    expect(Array.isArray(status.applyRequires)).toBe(true);
    expect(status.applyRequires.length).toBeGreaterThan(0);
  });
});
