import { describe, it, expect } from 'vitest';
import { checkTaskSubSteps } from '../../src/commands/workflow/compliance-check.js';

describe('checkTaskSubSteps', () => {
  it('detects all four sub-steps present', () => {
    const rawLines = [
      '- [ ] 1.1 Implement login',
      '  - [ ] RED: Write failing test',
      '  - [ ] GREEN: Write minimal code to pass',
      '  - [ ] REFACTOR: Clean up code',
      '  - [ ] SIMPLIFY: Review changed files',
    ];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('detects missing sub-steps', () => {
    const rawLines = [
      '- [ ] 1.1 Implement login',
      '  - [ ] RED: Write failing test',
    ];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(false);
    expect(result.missing).toEqual(['GREEN', 'REFACTOR', 'SIMPLIFY']);
  });

  it('detects when some sub-steps are checked', () => {
    const rawLines = [
      '- [ ] 1.1 Implement login',
      '  - [x] RED: Write failing test',
      '  - [x] GREEN: Write minimal code',
      '  - [ ] REFACTOR: Clean up code',
      '  - [ ] SIMPLIFY: Review files',
    ];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(true);
  });

  it('returns all missing when task not found', () => {
    const rawLines = ['- [ ] 2.1 Other task'];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(false);
    expect(result.missing).toEqual(['RED', 'GREEN', 'REFACTOR', 'SIMPLIFY']);
  });

  it('handles empty raw lines', () => {
    const result = checkTaskSubSteps('1.1', []);
    expect(result.hasAll).toBe(false);
  });

  it('stops scanning at next task line', () => {
    const rawLines = [
      '- [ ] 1.1 First task',
      '  - [ ] RED: Test first task',
      '  - [ ] GREEN: Code first task',
      '  - [ ] REFACTOR: Clean first task',
      '  - [ ] SIMPLIFY: Review first task',
      '- [ ] 1.2 Second task',
      '  - [ ] RED: Test second',
    ];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('detects sub-steps with extra whitespace', () => {
    const rawLines = [
      '- [ ] 1.1 Task',
      '    - [ ] RED: Test',
      '    - [ ] GREEN: Code',
      '    - [ ] REFACTOR: Clean',
      '    - [ ] SIMPLIFY: Review',
    ];
    const result = checkTaskSubSteps('1.1', rawLines);
    expect(result.hasAll).toBe(true);
  });
});
