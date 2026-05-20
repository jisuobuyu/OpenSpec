import { describe, it, expect } from 'vitest';
import { checkTaskSubSteps } from '../../src/commands/workflow/compliance-check.js';

const FULL_SIX = [
  '- [ ] 1.1 Implement login',
  '  - [ ] RED: Write failing test',
  '  - [ ] Verify RED: Confirm test fails correctly',
  '  - [ ] GREEN: Write minimal code to pass',
  '  - [ ] Verify GREEN: Confirm pass + no regressions',
  '  - [ ] REFACTOR: Clean up code',
  '  - [ ] SIMPLIFY: Review changed files',
];

describe('checkTaskSubSteps', () => {
  it('detects all 6 sub-steps present', () => {
    const result = checkTaskSubSteps('1.1', FULL_SIX);
    expect(result.hasAll).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('detects missing sub-steps', () => {
    const rawLines = [
      '- [ ] 1.1 Implement login',
      '  - [ ] RED: Write failing test',
      '  - [ ] Verify RED: Confirm fails correctly',
    ];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(false);
    expect(result.missing).toEqual(['GREEN', 'Verify GREEN', 'REFACTOR', 'SIMPLIFY']);
  });

  it('detects when sub-steps are checked (has [x])', () => {
    const rawLines = [
      '- [ ] 1.1 Implement login',
      '  - [x] RED: Write failing test',
      '  - [x] Verify RED: Confirm fails correctly',
      '  - [x] GREEN: Write minimal code',
      '  - [x] Verify GREEN: Confirm pass',
      '  - [x] REFACTOR: Clean up code',
      '  - [x] SIMPLIFY: Review files',
    ];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(true);
  });

  it('returns all missing when task not found', () => {
    const rawLines = ['- [ ] 2.1 Other task'];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(false);
    expect(result.missing).toEqual(['RED', 'Verify RED', 'GREEN', 'Verify GREEN', 'REFACTOR', 'SIMPLIFY']);
  });

  it('handles empty raw lines', () => {
    const result = checkTaskSubSteps('1.1', []);
    expect(result.hasAll).toBe(false);
  });

  it('stops scanning at next task line', () => {
    const rawLines = [
      '- [ ] 1.1 First task',
      ...FULL_SIX.slice(1),
      '- [ ] 1.2 Second task',
      '  - [ ] RED: Test second',
    ];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(true);
  });

  it('distinguishes RED from Verify RED sub-steps', () => {
    const rawLines = [
      '- [ ] 1.1 Task',
      '  - [ ] RED: Write failing test',
      '  - [ ] Verify RED: Confirm fails correctly',
      '  - [ ] GREEN: Write code',
      '  - [ ] Verify GREEN: Confirm pass',
      '  - [ ] REFACTOR: Clean up',
      '  - [ ] SIMPLIFY: Review',
    ];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(true);
  });

  it('fails when Verify RED exists but RED is missing', () => {
    const rawLines = [
      '- [ ] 1.1 Task',
      '  - [ ] Verify RED: Confirm fails correctly',
      '  - [ ] GREEN: Write code',
      '  - [ ] Verify GREEN: Confirm pass',
      '  - [ ] REFACTOR: Clean up',
      '  - [ ] SIMPLIFY: Review',
    ];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(false);
    expect(result.missing).toEqual(['RED']);
  });
});
