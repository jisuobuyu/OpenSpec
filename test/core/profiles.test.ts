import { describe, it, expect } from 'vitest';

import {
  CORE_WORKFLOWS,
  ALL_WORKFLOWS,
  getProfileWorkflows,
} from '../../src/core/profiles.js';

describe('profiles', () => {
  describe('CORE_WORKFLOWS', () => {
    it('should contain the default core workflows', () => {
      expect(CORE_WORKFLOWS).toEqual(['propose', 'explore', 'apply', 'sync', 'archive']);
    });

    it('should be a subset of ALL_WORKFLOWS', () => {
      for (const workflow of CORE_WORKFLOWS) {
        expect(ALL_WORKFLOWS).toContain(workflow);
      }
    });
  });

  describe('ALL_WORKFLOWS', () => {
    it('should contain all 16 workflows', () => {
      expect(ALL_WORKFLOWS).toHaveLength(16);
    });

    it('should contain expected workflow IDs', () => {
      const expected = [
        'propose', 'explore', 'apply', 'sync', 'archive',
        'new', 'continue', 'ff', 'verify',
        'review', 'simplify', 'abort', 'rewind', 'unarchive',
        'bulk-archive', 'onboard',
      ];
      expect([...ALL_WORKFLOWS]).toEqual(expected);
    });
  });

  describe('getProfileWorkflows', () => {
    it('should return core workflows for core profile', () => {
      const result = getProfileWorkflows('core');
      expect(result).toEqual(CORE_WORKFLOWS);
    });

    it('should return core workflows for core profile even if customWorkflows provided', () => {
      const result = getProfileWorkflows('core', ['new', 'apply']);
      expect(result).toEqual(CORE_WORKFLOWS);
    });

    it('should return core + enhanced workflows for enhanced profile', () => {
      const result = getProfileWorkflows('enhanced');
      expect(result).toContain('propose');
      expect(result).toContain('review');
      expect(result).toContain('simplify');
      expect(result).toContain('abort');
      expect(result).toContain('rewind');
      expect(result).toContain('unarchive');
      expect(result).toHaveLength(14);
    });

    it('should return same workflows for strict as enhanced', () => {
      const enhanced = getProfileWorkflows('enhanced');
      const strict = getProfileWorkflows('strict');
      expect(strict).toEqual(enhanced);
    });

    it('should return custom workflows for custom profile', () => {
      const customWorkflows = ['explore', 'new', 'apply', 'ff'];
      const result = getProfileWorkflows('custom', customWorkflows);
      expect(result).toEqual(customWorkflows);
    });

    it('should return empty array for custom profile with no customWorkflows', () => {
      const result = getProfileWorkflows('custom');
      expect(result).toEqual([]);
    });

    it('should return empty array for custom profile with empty customWorkflows', () => {
      const result = getProfileWorkflows('custom', []);
      expect(result).toEqual([]);
    });
  });
});
