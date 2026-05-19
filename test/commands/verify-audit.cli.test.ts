/**
 * CLI Integration tests for openspec verify and openspec status --deps.
 *
 * Runs the actual CLI command against E2E fixtures and validates output.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';

const CLI = path.resolve(process.cwd(), 'dist/cli/index.js');

describe('CLI verify', () => {
  let testDir: string;
  let fixtureDir: string;

  async function copyDir(src: string, dest: string) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-cli-audit-${randomUUID()}`);
    // Copy E2E fixtures to temp dir
    fixtureDir = path.resolve(process.cwd(), 'test/fixtures/e2e-change');
    await copyDir(fixtureDir, testDir);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should output 6-dimension audit in text format', () => {
    const output = execSync(
      `node "${CLI}" verify --change add-dark-mode`,
      { cwd: testDir, encoding: 'utf-8' }
    );

    expect(output).toContain('Consistency Audit: add-dark-mode');
    expect(output).toContain('Spec Coverage');
    expect(output).toContain('Scenario Completeness');
    expect(output).toContain('Task Alignment');
    expect(output).toContain('Design Consistency');
    expect(output).toContain('Scope Boundary');
    expect(output).toContain('Implicit Change');
    expect(output).toContain('Overall:');
  });

  it('should output valid JSON with --json flag', () => {
    const output = execSync(
      `node "${CLI}" verify --change add-dark-mode --json`,
      { cwd: testDir, encoding: 'utf-8' }
    );

    const report = JSON.parse(output);
    expect(report.changeName).toBe('add-dark-mode');
    expect(report.dimensions).toHaveLength(6);
    expect(report.overall).toMatch(/Pass|Warning|Critical/);
    expect(report.summary).toBeTruthy();

    // Each dimension should have required fields
    for (const dim of report.dimensions) {
      expect(dim.dimension).toBeTruthy();
      expect(dim.severity).toMatch(/Pass|Warning|Critical/);
      expect(dim.detail).toBeTruthy();
      expect(Array.isArray(dim.recommendations)).toBe(true);
    }
  });

  it('should error when --change is missing', () => {
    expect(() => {
      execSync(`node "${CLI}" verify`, {
        cwd: testDir, encoding: 'utf-8', stdio: 'pipe',
      });
    }).toThrow();
  });

  it('should error for non-existent change', () => {
    expect(() => {
      execSync(`node "${CLI}" verify --change nonexistent`, {
        cwd: testDir, encoding: 'utf-8', stdio: 'pipe',
      });
    }).toThrow(/not found/);
  });
});

describe('CLI status --deps', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-cli-deps-${randomUUID()}`);
    const changesDir = path.join(testDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    // Create changes with depends_on
    await fs.mkdir(path.join(changesDir, 'change-a'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'change-a', '.openspec.yaml'),
      'schema: specpower-driven\ndepends_on:\n  - change-b\n');
    await fs.writeFile(path.join(changesDir, 'change-a', 'proposal.md'), '# Change A\n\n## Why\nTest\n\n## What Changes\n- Test');

    await fs.mkdir(path.join(changesDir, 'change-b'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'change-b', '.openspec.yaml'),
      'schema: specpower-driven\ndepends_on:\n  - change-c\n');
    await fs.writeFile(path.join(changesDir, 'change-b', 'proposal.md'), '# Change B\n\n## Why\nTest\n\n## What Changes\n- Test');

    await fs.mkdir(path.join(changesDir, 'change-c'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'change-c', 'proposal.md'), '# Change C\n\n## Why\nTest\n\n## What Changes\n- Test');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should display dependency tree', () => {
    const output = execSync(
      `node "${CLI}" status --deps`,
      { cwd: testDir, encoding: 'utf-8' }
    );

    expect(output).toContain('Dependency Tree');
    expect(output).toContain('change-a');
    expect(output).toContain('change-b');
    expect(output).toContain('change-c');
    expect(output).toContain('no dependencies');
  });

  it('should output valid JSON with --deps --json', () => {
    const output = execSync(
      `node "${CLI}" status --deps --json`,
      { cwd: testDir, encoding: 'utf-8' }
    );

    const report = JSON.parse(output);
    expect(report.hasCycles).toBe(false);
    expect(report.depGraph).toBeDefined();
    expect(report.depGraph['change-a']).toContain('change-b');
    expect(report.depGraph['change-b']).toContain('change-c');
    expect(report.summary).toContain('No circular dependencies');
  });
});

describe('CLI metrics', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-cli-metrics-${randomUUID()}`);
    await fs.mkdir(path.join(testDir, 'openspec'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should display empty state message', () => {
    const output = execSync(
      `node "${CLI}" metrics`,
      { cwd: testDir, encoding: 'utf-8' }
    );
    expect(output).toContain('No metrics collected');
  });

  it('should output valid JSON even when empty', () => {
    const output = execSync(
      `node "${CLI}" metrics --json`,
      { cwd: testDir, encoding: 'utf-8' }
    );

    const report = JSON.parse(output);
    expect(report.version).toBe(1);
    expect(report.changeCount).toBe(0);
    expect(report.snapshotCount).toBe(0);
    expect(report.averages).toBeDefined();
    expect(report.averages.specCoverage).toBe(0);
  });
});
