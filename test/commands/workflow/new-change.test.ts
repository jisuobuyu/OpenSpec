import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { newChangeCommand } from '../../../src/commands/workflow/new-change.js';

describe('newChangeCommand', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-newchange-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Create openspec directory structure
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes'), { recursive: true });

    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('throws when name is undefined', async () => {
    await expect(newChangeCommand(undefined, {})).rejects.toThrow(
      'Missing required argument <name>'
    );
  });

  it('creates a change directory with .openspec.yaml', async () => {
    await newChangeCommand('test-feature', {});

    const changeDir = path.join(tempDir, 'openspec', 'changes', 'test-feature');
    const exists = await fs.stat(changeDir).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    const metaPath = path.join(changeDir, '.openspec.yaml');
    const metaContent = await fs.readFile(metaPath, 'utf-8');
    expect(metaContent).toContain('schema:');
  });

  it('throws for invalid change name', async () => {
    await expect(newChangeCommand('invalid/name', {})).rejects.toThrow();
  });

  it('creates change with description in README.md', async () => {
    await newChangeCommand('desc-feature', { description: 'A test feature' });

    const readmePath = path.join(
      tempDir, 'openspec', 'changes', 'desc-feature', 'README.md'
    );
    const readme = await fs.readFile(readmePath, 'utf-8');
    expect(readme).toContain('A test feature');
  });
});
