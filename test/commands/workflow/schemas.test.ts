import { describe, it, expect } from 'vitest';
import { listSchemas, getSchemaDir } from '../../../src/core/artifact-graph/index.js';

describe('schemasCommand', () => {
  describe('listSchemas', () => {
    it('returns an array of available schemas', () => {
      const schemas = listSchemas();
      expect(Array.isArray(schemas)).toBe(true);
      expect(schemas.length).toBeGreaterThan(0);
    });

    it('includes specpower-driven schema', () => {
      const schemas = listSchemas();
      expect(schemas).toContain('specpower-driven');
    });

    it('does not contain duplicates', () => {
      const schemas = listSchemas();
      const unique = new Set(schemas);
      expect(unique.size).toBe(schemas.length);
    });
  });

  describe('getSchemaDir', () => {
    it('returns a path for specpower-driven', () => {
      const dir = getSchemaDir('specpower-driven');
      expect(dir).toBeDefined();
      expect(typeof dir).toBe('string');
    });
  });
});
