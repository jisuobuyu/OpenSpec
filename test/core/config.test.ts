import { describe, it, expect } from 'vitest';
import { OPENSPEC_DIR_NAME } from '../../src/core/config.js';

describe('core config', () => {
  describe('OPENSPEC_DIR_NAME', () => {
    it('equals openspec', () => {
      expect(OPENSPEC_DIR_NAME).toBe('openspec');
    });
  });
});
