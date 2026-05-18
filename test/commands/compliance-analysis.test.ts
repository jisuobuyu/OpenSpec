/**
 * Unit tests for compliance check core analysis logic.
 */

import { describe, it, expect } from 'vitest';
import { analyzeTaskCompliance, parseTddAnnotation } from '../../src/commands/workflow/compliance-check.js';

describe('analyzeTaskCompliance', () => {
  const makeTasks = (descriptions: string[]) =>
    descriptions.map((desc, i) => ({ id: `${i + 1}`, description: desc }));

  // ── Core level ──────────────────────────────────────────

  it('core level: Full annotation → skip severity, skill NOT required', () => {
    const tasks = makeTasks(['Implement login']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Full] Implement login'], 'core', 'adaptive');
    expect(result[0].tddAnnotation).toBe('full');
    expect(result[0].severity).toBe('skip');
    expect(result[0].expectedSkill).toBe('test-driven-development');
    expect(result[0].message).toContain('skill NOT required');
  });

  it('core level: Lite annotation → skip severity, skill NOT required', () => {
    const tasks = makeTasks(['Add tests']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Lite] Add tests'], 'core', 'adaptive');
    expect(result[0].severity).toBe('skip');
  });

  it('core level: Skip annotation → pass, no skill', () => {
    const tasks = makeTasks(['Update docs']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Skip] Update docs'], 'core', 'adaptive');
    expect(result[0].tddAnnotation).toBe('skip');
    expect(result[0].expectedSkill).toBeNull();
    expect(result[0].message).toContain('no skill required');
  });

  it('core level: no annotation → pass, no skill', () => {
    const tasks = makeTasks(['Some task']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 Some task'], 'core', 'adaptive');
    expect(result[0].tddAnnotation).toBe('none');
    expect(result[0].expectedSkill).toBeNull();
  });

  // ── Enhanced/Strict level — explicit annotations ─────────

  it('enhanced: Full annotation → warn, skill required', () => {
    const tasks = makeTasks(['Implement login']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Full] Implement login'], 'enhanced', 'adaptive');
    expect(result[0].severity).toBe('warn');
    expect(result[0].expectedSkill).toBe('test-driven-development');
    expect(result[0].message).toContain('MUST call Skill');
  });

  it('enhanced: Lite annotation → warn, skill required', () => {
    const tasks = makeTasks(['Add tests']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Lite] Add tests'], 'strict', 'adaptive');
    expect(result[0].severity).toBe('warn');
    expect(result[0].expectedSkill).toBe('test-driven-development');
    expect(result[0].message).toContain('skip-refactor');
  });

  it('enhanced: Skip annotation → pass, no skill', () => {
    const tasks = makeTasks(['Update docs']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Skip] Update docs'], 'enhanced', 'adaptive');
    expect(result[0].severity).toBe('pass');
    expect(result[0].expectedSkill).toBeNull();
  });

  // ── Enhanced/Strict — no annotation, tddDefault tests ────

  it('enhanced, tddDefault=full: no annotation → warn', () => {
    const tasks = makeTasks(['Implement feature']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 Implement feature'], 'enhanced', 'full');
    expect(result[0].severity).toBe('warn');
    expect(result[0].expectedSkill).toBe('test-driven-development');
  });

  it('enhanced, tddDefault=lite: no annotation → warn', () => {
    const tasks = makeTasks(['Add component']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 Add component'], 'enhanced', 'lite');
    expect(result[0].severity).toBe('warn');
    expect(result[0].expectedSkill).toBe('test-driven-development');
  });

  it('enhanced, tddDefault=adaptive: no annotation → pass, skill optional', () => {
    const tasks = makeTasks(['Add component']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 Add component'], 'enhanced', 'adaptive');
    expect(result[0].severity).toBe('pass');
    expect(result[0].expectedSkill).toBeNull();
    expect(result[0].message).toContain('skill optional');
  });

  it('enhanced, tddDefault=skip: no annotation → pass, skill optional', () => {
    const tasks = makeTasks(['Update config']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 Update config'], 'enhanced', 'skip');
    expect(result[0].severity).toBe('pass');
    expect(result[0].expectedSkill).toBeNull();
  });

  // ── Strict level — same logic as enhanced ────────────────

  it('strict: Full annotation → warn, skill required', () => {
    const tasks = makeTasks(['Implement login']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Full] Implement login'], 'strict', 'adaptive');
    expect(result[0].severity).toBe('warn');
    expect(result[0].expectedSkill).toBe('test-driven-development');
  });

  // ── Multiple tasks ───────────────────────────────────────

  it('handles multiple tasks with mixed annotations', () => {
    const tasks = makeTasks(['Implement login', 'Update docs', 'Add dashboard']);
    const rawLines = [
      '- [ ] 1 [TDD: Full] Implement login',
      '- [ ] 2 [TDD: Skip] Update docs',
      '- [ ] 3 Add dashboard',
    ];
    const result = analyzeTaskCompliance(tasks, rawLines, 'enhanced', 'full');

    expect(result).toHaveLength(3);
    expect(result[0].severity).toBe('warn');  // Full
    expect(result[1].severity).toBe('pass');  // Skip
    expect(result[2].severity).toBe('warn');  // none + default=full
  });

  it('calculates summary correctly — all warn in strict mode', () => {
    const tasks = makeTasks(['A', 'B', 'C']);
    const rawLines = [
      '- [ ] 1 [TDD: Full] A',
      '- [ ] 2 [TDD: Lite] B',
      '- [ ] 3 [TDD: Full] C',
    ];
    const result = analyzeTaskCompliance(tasks, rawLines, 'enhanced', 'adaptive');

    const requireSkill = result.filter((t) => t.expectedSkill !== null).length;
    const warnCount = result.filter((t) => t.severity === 'warn').length;

    expect(requireSkill).toBe(3);
    expect(warnCount).toBe(3);
  });

  it('calculates summary correctly — all skip in core mode', () => {
    const tasks = makeTasks(['A', 'B']);
    const rawLines = [
      '- [ ] 1 [TDD: Full] A',
      '- [ ] 2 [TDD: Lite] B',
    ];
    const result = analyzeTaskCompliance(tasks, rawLines, 'core', 'adaptive');

    const warns = result.filter((t) => t.severity === 'warn');
    expect(warns).toHaveLength(0);
    // skill IS expected but severity is skip
    expect(result[0].expectedSkill).toBe('test-driven-development');
    expect(result[0].severity).toBe('skip');
  });

  // ── Edge cases ───────────────────────────────────────────

  it('handles empty tasks array', () => {
    const result = analyzeTaskCompliance([], [], 'enhanced', 'adaptive');
    expect(result).toHaveLength(0);
  });

  it('rawLines shorter than tasks — uses empty string for missing lines', () => {
    const tasks = makeTasks(['A', 'B']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Full] A'], 'enhanced', 'adaptive');
    expect(result[0].tddAnnotation).toBe('full');
    expect(result[1].tddAnnotation).toBe('none');
  });

  it('preserves task description in output', () => {
    const tasks = makeTasks(['Implement login with OAuth']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Full] Implement login with OAuth'], 'enhanced', 'adaptive');
    expect(result[0].description).toBe('Implement login with OAuth');
  });

  it('preserves task id in output', () => {
    const tasks = [{ id: '2.1', description: 'Create model' }];
    const result = analyzeTaskCompliance(tasks, ['- [ ] 2.1 [TDD: Full] Create model'], 'enhanced', 'adaptive');
    expect(result[0].taskId).toBe('2.1');
  });

  it('treats unknown disciplineLevel as enhanced path (not core)', () => {
    const tasks = makeTasks(['Implement login']);
    const result = analyzeTaskCompliance(tasks, ['- [ ] 1 [TDD: Full] Implement login'], 'unknown', 'adaptive');
    // falls through to else branch (non-core) → enhanced/strict behavior
    expect(result[0].severity).toBe('warn');
  });
});
