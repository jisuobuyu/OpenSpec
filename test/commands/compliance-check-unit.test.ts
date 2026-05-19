import { describe, it, expect } from 'vitest';
import { hasTddAnnotation } from '../../src/commands/workflow/compliance-check.js';

describe('hasTddAnnotation', () => {
  it('detects [TDD] annotation', () => {
    expect(hasTddAnnotation('- [ ] 1.1 [TDD] Implement login')).toBe(true);
  });

  it('returns false when no TDD annotation present', () => {
    expect(hasTddAnnotation('- [ ] 1.4 Implement dashboard')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(hasTddAnnotation('- [ ] 1.1 [tdd] Implement login')).toBe(true);
  });

  it('handles extra whitespace around brackets', () => {
    expect(hasTddAnnotation('- [ ] 1.1  [TDD]  Implement login')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(hasTddAnnotation('')).toBe(false);
  });

  it('detects annotation when task is already completed', () => {
    expect(hasTddAnnotation('- [x] 1.1 [TDD] Implement login')).toBe(true);
  });

  it('returns false for TDD in description text only', () => {
    expect(hasTddAnnotation('- [ ] 1.1 Discuss TDD approach for testing')).toBe(false);
  });
});
