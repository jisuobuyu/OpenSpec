/**
 * Unit tests for compliance check core analysis logic (TDD mandatory).
 */

import { describe, it, expect } from 'vitest';
import { analyzeTaskCompliance } from '../../src/commands/workflow/compliance-check.js';

describe('analyzeTaskCompliance', () => {
  const makeTasks = (descriptions: string[]) =>
    descriptions.map((desc, i) => ({ id: `${i + 1}`, description: desc }));

  // ── TDD Full → pass ──────────────────────────────────────────

  it('[TDD: Full] → pass, skill expected', () => {
    const tasks = makeTasks(['Implement login']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Full] Implement login']);
    expect(result[0].tddAnnotation).toBe('full');
    expect(result[0].severity).toBe('pass');
    expect(result[0].expectedSkill).toBe('test-driven-development');
  });

  it('multiple [TDD: Full] tasks → all pass', () => {
    const tasks = makeTasks(['A', 'B', 'C']);
    const result = analyzeTaskCompliance(tasks, [
      '- [ ] 1 [TDD: Full] A',
      '- [ ] 2 [TDD: Full] B',
      '- [ ] 3 [TDD: Full] C',
    ]);
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.severity === 'pass')).toBe(true);
  });

  // ── Missing [TDD: Full] → warn ───────────────────────────────

  it('no annotation → warn', () => {
    const tasks = makeTasks(['Some task']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 Some task']);
    expect(result[0].tddAnnotation).toBe('none');
    expect(result[0].severity).toBe('warn');
    expect(result[0].expectedSkill).toBe('test-driven-development');
    expect(result[0].message).toContain('MISSING [TDD: Full]');
  });

  it('[TDD: Lite] is treated as missing (not full) → warn', () => {
    const tasks = makeTasks(['Add tests']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Lite] Add tests']);
    expect(result[0].tddAnnotation).toBe('lite');
    expect(result[0].severity).toBe('warn');
  });

  it('[TDD: Skip] is treated as missing (not full) → warn', () => {
    const tasks = makeTasks(['Update docs']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Skip] Update docs']);
    expect(result[0].tddAnnotation).toBe('skip');
    expect(result[0].severity).toBe('warn');
  });

  // ── Mixed annotations ────────────────────────────────────────

  it('mixed: Full tasks pass, others warn', () => {
    const tasks = makeTasks(['Implement login', 'Update docs', 'Add dashboard']);
    const rawLines = [
      '- [ ] 1 [TDD: Full] Implement login',
      '- [ ] 2 [TDD: Skip] Update docs',
      '- [ ] 3 Add dashboard',
    ];
    const result = analyzeTaskCompliance(tasks, rawLines);

    expect(result).toHaveLength(3);
    expect(result[0].severity).toBe('pass');  // Full
    expect(result[1].severity).toBe('warn');  // Skip — not Full
    expect(result[2].severity).toBe('warn');  // none
  });

  // ── Edge cases ───────────────────────────────────────────────

  it('handles empty tasks array', () => {
    const result = analyzeTaskCompliance([], []);
    expect(result).toHaveLength(0);
  });

  it('rawLines shorter than tasks — uses empty string for missing lines', () => {
    const tasks = makeTasks(['A', 'B']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Full] A']);
    expect(result[0].tddAnnotation).toBe('full');
    expect(result[1].tddAnnotation).toBe('none');
    expect(result[1].severity).toBe('warn');
  });

  it('preserves task description in output', () => {
    const tasks = makeTasks(['Implement login with OAuth']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Full] Implement login with OAuth']);
    expect(result[0].description).toBe('Implement login with OAuth');
  });

  it('preserves task id in output', () => {
    const tasks = [{ id: '2.1', description: 'Create model' }];
    const result = analyzeTaskCompliance(tasks, ['- [ ] 2.1 [TDD: Full] Create model']);
    expect(result[0].taskId).toBe('2.1');
  });

  it('all tasks require skill', () => {
    const tasks = makeTasks(['A', 'B', 'C']);
    const result = analyzeTaskCompliance(tasks, [
      '- [ ] 1 [TDD: Full] A',
      '- [ ] 2 B',
      '- [ ] 3 [TDD: Full] C',
    ]);
    expect(result.every((r) => r.expectedSkill === 'test-driven-development')).toBe(true);
  });
});
