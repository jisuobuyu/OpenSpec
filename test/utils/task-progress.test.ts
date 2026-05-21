import { describe, it, expect } from 'vitest';
import { countTasksFromContent, formatTaskStatus } from '../../src/utils/task-progress.js';

describe('countTasksFromContent', () => {
  it('counts single task without sub-steps', () => {
    const content = '- [ ] 1.1 Implement login';
    const result = countTasksFromContent(content);
    expect(result.total).toBe(1);
    expect(result.completed).toBe(0);
  });

  it('counts completed task', () => {
    const content = '- [x] 1.1 Implement login';
    const result = countTasksFromContent(content);
    expect(result.total).toBe(1);
    expect(result.completed).toBe(1);
  });

  it('does NOT count TDD sub-step checkboxes as tasks', () => {
    const content = `- [ ] 1.1 Implement login
  - [ ] RED: Write failing test
  - [x] Verify RED: Confirm test fails
  - [ ] GREEN: Write minimal code
  - [ ] Verify GREEN: Confirm pass
  - [ ] REFACTOR: Clean up
  - [ ] SIMPLIFY: Review files`;
    const result = countTasksFromContent(content);
    expect(result.total).toBe(1);
    expect(result.completed).toBe(0);
  });

  it('correctly counts mix of completed and pending tasks with sub-steps', () => {
    const content = `## 1. Setup
- [x] 1.1 Create context
  - [x] RED: Test context
  - [x] Verify RED: Confirm fails
  - [x] GREEN: Implement
  - [x] Verify GREEN: Confirm pass
  - [x] REFACTOR: Clean
  - [x] SIMPLIFY: Review
- [ ] 1.2 Add variables
  - [x] RED: Test variables
  - [x] Verify RED: Confirm fails
  - [ ] GREEN: Implement
  - [ ] Verify GREEN: Confirm pass
  - [ ] REFACTOR: Clean
  - [ ] SIMPLIFY: Review
- [ ] 1.3 Integrate
  - [ ] RED: Test integration
  - [ ] Verify RED: Confirm fails
  - [ ] GREEN: Implement
  - [ ] Verify GREEN: Confirm pass
  - [ ] REFACTOR: Clean
  - [ ] SIMPLIFY: Review`;
    const result = countTasksFromContent(content);
    expect(result.total).toBe(3);
    expect(result.completed).toBe(1);
  });

  it('handles multiple task groups', () => {
    const content = `## 1. Group A
- [x] 1.1 Task A1
- [x] 1.2 Task A2
- [x] 1.3 Task A3

## 2. Group B
- [ ] 2.1 Task B1
- [ ] 2.2 Task B2`;
    const result = countTasksFromContent(content);
    expect(result.total).toBe(5);
    expect(result.completed).toBe(3);
  });

  it('handles empty content', () => {
    const result = countTasksFromContent('');
    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
  });

  it('does not match lines without task IDs', () => {
    const content = `# Tasks
- [ ] This is not a task
- [x] Neither is this
Just a paragraph
- [ ] RED: Not a task either`;
    const result = countTasksFromContent(content);
    expect(result.total).toBe(0);
  });
});

describe('formatTaskStatus', () => {
  it('returns "No tasks" for zero total', () => {
    expect(formatTaskStatus({ total: 0, completed: 0 })).toBe('No tasks');
  });

  it('returns "✓ Complete" when all done', () => {
    expect(formatTaskStatus({ total: 5, completed: 5 })).toBe('✓ Complete');
  });

  it('returns progress fraction for partial completion', () => {
    expect(formatTaskStatus({ total: 5, completed: 3 })).toBe('3/5 tasks');
  });
});
