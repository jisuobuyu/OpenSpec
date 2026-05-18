/**
 * Unit tests for compliance check core logic.
 */

import { describe, it, expect } from 'vitest';
import { parseTddAnnotation } from '../../src/commands/workflow/compliance-check.js';

describe('parseTddAnnotation', () => {
  it('detects [TDD: Full] with standard spacing', () => {
    expect(parseTddAnnotation('- [ ] 1.1 [TDD: Full] Implement login')).toBe('full');
  });

  it('detects [TDD: Lite] with standard spacing', () => {
    expect(parseTddAnnotation('- [ ] 1.2 [TDD: Lite] Add tests')).toBe('lite');
  });

  it('detects [TDD: Skip] with standard spacing', () => {
    expect(parseTddAnnotation('- [ ] 1.3 [TDD: Skip] Update docs')).toBe('skip');
  });

  it('returns none when no TDD annotation present', () => {
    expect(parseTddAnnotation('- [ ] 1.4 Implement dashboard')).toBe('none');
  });

  it('is case-insensitive — lower case full', () => {
    expect(parseTddAnnotation('- [ ] 1.1 [TDD: full] Implement login')).toBe('full');
  });

  it('is case-insensitive — lower case lite', () => {
    expect(parseTddAnnotation('- [ ] 1.2 [TDD: lite] Add tests')).toBe('lite');
  });

  it('is case-insensitive — lower case skip', () => {
    expect(parseTddAnnotation('- [ ] 1.3 [TDD: skip] Update docs')).toBe('skip');
  });

  it('is case-insensitive — mixed case', () => {
    expect(parseTddAnnotation('- [ ] 1.1 [TDD: FuLl] Implement login')).toBe('full');
  });

  it('handles no space after colon — [TDD:Full]', () => {
    expect(parseTddAnnotation('- [ ] 1.1 [TDD:Full] Implement login')).toBe('full');
  });

  it('handles multiple spaces after colon', () => {
    expect(parseTddAnnotation('- [ ] 1.1 [TDD:   Full] Implement login')).toBe('full');
  });

  it('handles extra whitespace around brackets', () => {
    expect(parseTddAnnotation('- [ ] 1.1  [TDD: Full]  Implement login')).toBe('full');
  });

  it('returns none for empty string', () => {
    expect(parseTddAnnotation('')).toBe('none');
  });

  it('returns none when TDD appears but not as annotation', () => {
    expect(parseTddAnnotation('- [ ] 1.1 Discuss TDD approach for testing')).toBe('none');
  });

  it('returns none for [TDD] without colon and level', () => {
    expect(parseTddAnnotation('- [ ] 1.1 [TDD] Implement login')).toBe('none');
  });

  it('does not match [TDD: Unknown] as any known level', () => {
    expect(parseTddAnnotation('- [ ] 1.1 [TDD: Unknown] Something')).toBe('none');
  });

  it('detects annotation with inline task description containing special chars', () => {
    expect(parseTddAnnotation('- [ ] 1.1 [TDD: Full] Fix login() — handle null/undefined edge cases')).toBe('full');
  });

  it('detects annotation when task is already completed', () => {
    expect(parseTddAnnotation('- [x] 1.1 [TDD: Full] Implement login')).toBe('full');
  });
});
