import { describe, it, expect } from 'vitest';
import { detectCircularDeps, formatDependencyTree } from '../../../src/core/conflict/circular-deps.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { stringify as yamlStringify } from 'yaml';

describe('circular-deps', () => {
  let testDir: string;

  async function createChange(name: string, dependsOn?: string[]) {
    const changeDir = path.join(testDir, 'openspec', 'changes', name);
    await fs.mkdir(changeDir, { recursive: true });

    // Create minimal proposal so it's detected as a change
    await fs.writeFile(path.join(changeDir, 'proposal.md'), `# Change: ${name}\n\n## Why\nTest\n\n## What Changes\n- Test`);

    if (dependsOn && dependsOn.length > 0) {
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        yamlStringify({ schema: 'spec-driven', depends_on: dependsOn })
      );
    }
  }

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec', 'changes'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should pass with no cycles (A→B, B→C)', async () => {
    await createChange('change-a', ['change-b']);
    await createChange('change-b', ['change-c']);
    await createChange('change-c');

    const report = await detectCircularDeps(testDir);
    expect(report.hasCycles).toBe(false);
    expect(report.depGraph['change-a']).toEqual(['change-b']);
    expect(report.depGraph['change-b']).toEqual(['change-c']);
  });

  it('should detect A→B→A cycle', async () => {
    await createChange('change-a', ['change-b']);
    await createChange('change-b', ['change-a']);

    const report = await detectCircularDeps(testDir);
    expect(report.hasCycles).toBe(true);
    expect(report.cycles.length).toBeGreaterThan(0);
  });

  it('should detect A→B→C→A cycle', async () => {
    await createChange('change-a', ['change-b']);
    await createChange('change-b', ['change-c']);
    await createChange('change-c', ['change-a']);

    const report = await detectCircularDeps(testDir);
    expect(report.hasCycles).toBe(true);
    const cycle = report.cycles[0];
    expect(cycle.changes).toContain('change-a');
    expect(cycle.changes).toContain('change-b');
    expect(cycle.changes).toContain('change-c');
  });

  it('should detect self-cycle (A→A)', async () => {
    await createChange('change-a', ['change-a']);

    const report = await detectCircularDeps(testDir);
    expect(report.hasCycles).toBe(true);
  });

  it('should pass with no cycles and no dependencies', async () => {
    await createChange('change-a');
    await createChange('change-b');

    const report = await detectCircularDeps(testDir);
    expect(report.hasCycles).toBe(false);
  });

  it('should ignore references to non-existent changes', async () => {
    await createChange('change-a', ['non-existent-change']);
    await createChange('change-b');

    const report = await detectCircularDeps(testDir);
    // Non-existent deps are filtered out, no cycle
    expect(report.hasCycles).toBe(false);
    expect(report.depGraph['change-a']).toEqual([]);
  });

  describe('formatDependencyTree', () => {
    it('should format a simple dependency tree', () => {
      const graph = {
        'change-a': ['change-b', 'change-c'],
        'change-b': ['change-c'],
        'change-c': [],
      };
      const tree = formatDependencyTree(graph, 'change-a');
      expect(tree).toContain('change-a');
      expect(tree).toContain('change-b');
      expect(tree).toContain('change-c');
    });

    it('should handle no dependencies', () => {
      const graph = { 'lone-change': [] };
      const tree = formatDependencyTree(graph, 'lone-change');
      expect(tree).toContain('no dependencies');
    });
  });
});
