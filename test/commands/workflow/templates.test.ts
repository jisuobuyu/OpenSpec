import { describe, it, expect } from 'vitest';
import { resolveSchema, getSchemaDir } from '../../../src/core/artifact-graph/index.js';
import { validateSchemaExists, DEFAULT_SCHEMA } from '../../../src/commands/workflow/shared.js';

describe('templatesCommand', () => {
  describe('schema template resolution', () => {
    it('resolves specpower-driven schema successfully', () => {
      const schema = resolveSchema('specpower-driven');
      expect(schema).toBeDefined();
      expect(schema.name).toBe('specpower-driven');
      expect(schema.artifacts).toBeDefined();
      expect(schema.artifacts.length).toBeGreaterThan(0);
    });

    it('each artifact has a template defined', () => {
      const schema = resolveSchema('specpower-driven');
      for (const artifact of schema.artifacts) {
        expect(artifact.template).toBeDefined();
        expect(typeof artifact.template).toBe('string');
      }
    });

    it('artifacts include explore, proposal, design, specs, tasks, review', () => {
      const schema = resolveSchema('specpower-driven');
      const artifactIds = schema.artifacts.map((a) => a.id);
      expect(artifactIds).toContain('explore');
      expect(artifactIds).toContain('proposal');
      expect(artifactIds).toContain('design');
      expect(artifactIds).toContain('specs');
      expect(artifactIds).toContain('tasks');
      expect(artifactIds).toContain('review');
    });

    it('getSchemaDir returns a valid path for the default schema', () => {
      const dir = getSchemaDir(DEFAULT_SCHEMA);
      expect(dir).toBeDefined();
    });
  });
});
