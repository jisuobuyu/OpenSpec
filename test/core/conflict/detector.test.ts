import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../../../src/core/conflict/detector.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

describe('conflict-detector', () => {
  let testDir: string;

  async function createChange(
    name: string,
    files: { tasks?: string; specs?: Record<string, string>; metadata?: Record<string, unknown> }
  ) {
    const changeDir = path.join(testDir, 'openspec', 'changes', name);
    await fs.mkdir(changeDir, { recursive: true });

    if (files.tasks) {
      await fs.writeFile(path.join(changeDir, 'tasks.md'), files.tasks);
    }
    if (files.specs) {
      for (const [specName, content] of Object.entries(files.specs)) {
        const specDir = path.join(changeDir, 'specs', specName);
        await fs.mkdir(specDir, { recursive: true });
        await fs.writeFile(path.join(specDir, 'spec.md'), content);
      }
    }
    if (files.metadata) {
      const yaml = await import('yaml');
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        yaml.stringify(files.metadata)
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

  it('should detect no conflicts with non-overlapping changes', async () => {
    await createChange('change-a', {
      tasks: '- [x] 1.1 Add login in `src/auth/login.ts`',
      specs: { auth: '### Requirement: User can login\n#### Scenario: Login' },
    });
    await createChange('change-b', {
      tasks: '- [x] 1.1 Add dashboard in `src/ui/dashboard.tsx`',
      specs: { ui: '### Requirement: User can view dashboard\n#### Scenario: Dashboard' },
    });

    const report = await detectConflicts(testDir);
    expect(report.hasConflicts).toBe(false);
  });

  it('should detect file intersection conflicts', async () => {
    await createChange('change-a', {
      tasks: '- [x] 1.1 Refactor `src/auth/login.ts`',
    });
    await createChange('change-b', {
      tasks: '- [x] 1.1 Add OAuth to `src/auth/login.ts`',
    });

    const report = await detectConflicts(testDir);
    expect(report.hasConflicts).toBe(true);
    const fileConflicts = report.conflicts.filter((c) => c.type === 'file-intersection');
    expect(fileConflicts.length).toBeGreaterThan(0);
  });

  it('should detect spec semantic conflicts (same requirement)', async () => {
    await createChange('change-a', {
      specs: { auth: '### Requirement: User can login\n#### Scenario: Login' },
    });
    await createChange('change-b', {
      specs: { auth: '### Requirement: User can login\n#### Scenario: Login' },
    });

    const report = await detectConflicts(testDir);
    const specConflicts = report.conflicts.filter((c) => c.type === 'spec-semantic');
    expect(specConflicts.length).toBeGreaterThan(0);
  });

  it('should detect requirement ID collisions (same ID, different definition)', async () => {
    // Both truncate to same 30-char slug: REQ-user-can-login-with-email-a
    await createChange('change-a', {
      specs: { auth: '### Requirement: User can login with email and password authentication' },
    });
    await createChange('change-b', {
      specs: { auth: '### Requirement: User can login with email and password using OAuth' },
    });

    const report = await detectConflicts(testDir);
    const collisions = report.conflicts.filter((c) => c.type === 'requirement-id-collision');
    expect(collisions.length).toBeGreaterThan(0);
  });

  it('should return empty for single change', async () => {
    await createChange('only-change', {
      tasks: '- [ ] 1.1 Do something',
    });

    const report = await detectConflicts(testDir);
    expect(report.hasConflicts).toBe(false);
    expect(report.summary).toContain('Only one active change');
  });

  it('should filter by changes list', async () => {
    await createChange('change-a', {
      tasks: '- [ ] 1.1 Edit `src/shared.ts`',
    });
    await createChange('change-b', {
      tasks: '- [ ] 1.1 Edit `src/shared.ts`',
    });
    await createChange('change-c', {
      tasks: '- [ ] 1.1 Edit `src/other.ts`',
    });

    const report = await detectConflicts(testDir, ['change-a', 'change-c']);
    expect(report.hasConflicts).toBe(false);
  });
});
