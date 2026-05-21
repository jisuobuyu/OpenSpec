import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SCHEMA,
  isColorDisabled,
  getStatusColor,
  getStatusIndicator,
  validateSchemaExists,
} from '../../../src/commands/workflow/shared.js';

describe('shared', () => {
  describe('DEFAULT_SCHEMA', () => {
    it('equals specpower-driven', () => {
      expect(DEFAULT_SCHEMA).toBe('specpower-driven');
    });
  });

  describe('validateSchemaExists', () => {
    it('returns schema name when valid', () => {
      const result = validateSchemaExists('specpower-driven');
      expect(result).toBe('specpower-driven');
    });

    it('throws with available schemas list when not found', () => {
      expect(() => validateSchemaExists('nonexistent-schema-xyz')).toThrow(
        /Schema 'nonexistent-schema-xyz' not found/
      );
    });
  });

  describe('isColorDisabled', () => {
    it('returns false by default', () => {
      expect(isColorDisabled()).toBe(false);
    });
  });

  describe('getStatusColor', () => {
    it('returns a function for each status', () => {
      expect(typeof getStatusColor('done')).toBe('function');
      expect(typeof getStatusColor('ready')).toBe('function');
      expect(typeof getStatusColor('blocked')).toBe('function');
    });
  });

  describe('getStatusIndicator', () => {
    it('returns a string for each status', () => {
      expect(typeof getStatusIndicator('done')).toBe('string');
      expect(typeof getStatusIndicator('ready')).toBe('string');
      expect(typeof getStatusIndicator('blocked')).toBe('string');
    });
  });
});
