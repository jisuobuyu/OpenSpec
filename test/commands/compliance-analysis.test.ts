/**
 * Unit tests for compliance check analysis logic (embedded 6-step TDD sub-steps).
 */

import { describe, it, expect } from 'vitest';
import { analyzeTaskCompliance } from '../../src/commands/workflow/compliance-check.js';

const FULL_SIX = [
  '- [ ] 1.1 Implement login',
  '  - [ ] RED: Write failing test',
  '  - [ ] Verify RED: Confirm test fails correctly',
  '  - [ ] GREEN: Write minimal code to pass',
  '  - [ ] Verify GREEN: Confirm pass + no regressions',
  '  - [ ] REFACTOR: Clean up code',
  '  - [ ] SIMPLIFY: Review changed files',
];

describe('analyzeTaskCompliance', () => {
  it('all 6 sub-steps → pass', () => {
    const tasks = [{ id: '1.1', description: 'Implement login' }];
    const result = analyzeTaskCompliance(tasks, FULL_SIX);
    expect(result[0].hasSubSteps).toBe(true);
    expect(result[0].severity).toBe('pass');
    expect(result[0].missingSubSteps).toEqual([]);
  });

  it('missing sub-steps → warn', () => {
    const rawLines = [
      '- [ ] 1.1 Some task',
      '  - [ ] RED: Write failing test',
    ];
    const tasks = [{ id: '1.1', description: 'Some task' }];
    const result = analyzeTaskCompliance(tasks, rawLines);
    expect(result[0].hasSubSteps).toBe(false);
    expect(result[0].severity).toBe('warn');
    expect(result[0].missingSubSteps).toEqual(['Verify RED', 'GREEN', 'Verify GREEN', 'REFACTOR', 'SIMPLIFY']);
    expect(result[0].message).toContain('MISSING TDD sub-steps');
  });

  it('multiple tasks: mixed compliance', () => {
    const tasks = [
      { id: '1.1', description: 'Implement login' },
      { id: '1.2', description: 'Update docs' },
      { id: '1.3', description: 'Add dashboard' },
    ];
    const rawLines = [
      '- [ ] 1.1 Implement login',
      '  - [ ] RED: Test login',
      '  - [ ] Verify RED: Confirm',
      '  - [ ] GREEN: Code login',
      '  - [ ] Verify GREEN: Confirm',
      '  - [ ] REFACTOR: Clean',
      '  - [ ] SIMPLIFY: Review',
      '- [ ] 1.2 Update docs',
      '  - [ ] RED: Test docs',
      '- [ ] 1.3 Add dashboard',
      '  - [ ] RED: Test dashboard',
      '  - [ ] Verify RED: Confirm',
      '  - [ ] GREEN: Code dashboard',
      '  - [ ] Verify GREEN: Confirm',
      '  - [ ] REFACTOR: Clean',
      '  - [ ] SIMPLIFY: Review',
    ];
    const result = analyzeTaskCompliance(tasks, rawLines);

    expect(result).toHaveLength(3);
    expect(result[0].severity).toBe('pass');
    expect(result[1].severity).toBe('warn');
    expect(result[2].severity).toBe('pass');
  });

  it('handles empty tasks array', () => {
    const result = analyzeTaskCompliance([], []);
    expect(result).toHaveLength(0);
  });

  it('preserves task id and description', () => {
    const tasks = [{ id: '2.1', description: 'Create user model' }];
    const result = analyzeTaskCompliance(tasks, FULL_SIX);
    expect(result[0].taskId).toBe('2.1');
    expect(result[0].description).toBe('Create user model');
  });

  it('all tasks with missing sub-steps → all warn', () => {
    const tasks = [
      { id: '1.1', description: 'A' },
      { id: '1.2', description: 'B' },
    ];
    const rawLines = [
      '- [ ] 1.1 A',
      '- [ ] 1.2 B',
    ];
    const result = analyzeTaskCompliance(tasks, rawLines);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.severity === 'warn')).toBe(true);
  });
});
