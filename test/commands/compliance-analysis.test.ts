/**
 * Unit tests for compliance check core analysis logic (TDD mandatory).
 */

import { describe, it, expect } from 'vitest';
import { analyzeTaskCompliance } from '../../src/commands/workflow/compliance-check.js';

describe('analyzeTaskCompliance', () => {
  const makeTasks = (descriptions: string[]) =>
    descriptions.map((desc, i) => ({ id: `${i + 1}`, description: desc }));

  it('[TDD] → pass, skill expected', () => {
    const tasks = makeTasks(['Implement login']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD] Implement login']);
    expect(result[0].hasTdd).toBe(true);
    expect(result[0].severity).toBe('pass');
    expect(result[0].expectedSkill).toBe('test-driven-development');
  });

  it('multiple [TDD] tasks → all pass', () => {
    const tasks = makeTasks(['A', 'B', 'C']);
    const result = analyzeTaskCompliance(tasks, [
      '- [ ] 1 [TDD] A',
      '- [ ] 2 [TDD] B',
      '- [ ] 3 [TDD] C',
    ]);
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.severity === 'pass')).toBe(true);
  });

  it('no annotation → warn', () => {
    const tasks = makeTasks(['Some task']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 Some task']);
    expect(result[0].hasTdd).toBe(false);
    expect(result[0].severity).toBe('warn');
    expect(result[0].expectedSkill).toBe('test-driven-development');
    expect(result[0].message).toContain('MISSING [TDD]');
  });

  it('mixed: TDD tasks pass, others warn', () => {
    const tasks = makeTasks(['Implement login', 'Update docs', 'Add dashboard']);
    const rawLines = [
      '- [ ] 1 [TDD] Implement login',
      '- [ ] 2 Update docs',
      '- [ ] 3 Add dashboard',
    ];
    const result = analyzeTaskCompliance(tasks, rawLines);

    expect(result).toHaveLength(3);
    expect(result[0].severity).toBe('pass');
    expect(result[1].severity).toBe('warn');
    expect(result[2].severity).toBe('warn');
  });

  it('handles empty tasks array', () => {
    const result = analyzeTaskCompliance([], []);
    expect(result).toHaveLength(0);
  });

  it('preserves task description in output', () => {
    const tasks = makeTasks(['Implement login with OAuth']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD] Implement login with OAuth']);
    expect(result[0].description).toBe('Implement login with OAuth');
  });

  it('preserves task id in output', () => {
    const tasks = [{ id: '2.1', description: 'Create model' }];
    const result = analyzeTaskCompliance(tasks, ['- [ ] 2.1 [TDD] Create model']);
    expect(result[0].taskId).toBe('2.1');
  });

  it('all tasks require skill', () => {
    const tasks = makeTasks(['A', 'B', 'C']);
    const result = analyzeTaskCompliance(tasks, [
      '- [ ] 1 [TDD] A',
      '- [ ] 2 B',
      '- [ ] 3 [TDD] C',
    ]);
    expect(result.every((r) => r.expectedSkill === 'test-driven-development')).toBe(true);
  });
});
