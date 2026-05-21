import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { metricsCommand } from '../../src/commands/metrics.js';

describe('metricsCommand', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-metrics-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('resolves in JSON mode with empty project', async () => {
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes'), { recursive: true });
    await expect(metricsCommand({ json: true })).resolves.toBeUndefined();
  });
});
