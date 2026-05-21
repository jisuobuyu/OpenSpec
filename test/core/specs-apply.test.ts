import { describe, it, expect } from 'vitest';
import { buildSpecSkeleton } from '../../src/core/specs-apply.js';

describe('specs-apply', () => {
  describe('buildSpecSkeleton', () => {
    it('generates spec skeleton with folder name and change name', () => {
      const skeleton = buildSpecSkeleton('user-auth', 'add-user-auth');
      expect(skeleton).toContain('user-auth');
      expect(skeleton).toContain('add-user-auth');
    });

    it('generates different output for different inputs', () => {
      const a = buildSpecSkeleton('a', 'change-a');
      const b = buildSpecSkeleton('b', 'change-b');
      expect(a).not.toBe(b);
    });

    it('returns a non-empty string', () => {
      const skeleton = buildSpecSkeleton('test', 'test-change');
      expect(typeof skeleton).toBe('string');
      expect(skeleton.length).toBeGreaterThan(0);
    });
  });
});
