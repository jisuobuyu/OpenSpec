import { describe, it, expect } from 'vitest';
import { parseWorkspaceSetupLinkInput } from '../../../src/core/workspace/link-input.js';

describe('parseWorkspaceSetupLinkInput', () => {
  it('returns a record', async () => {
    const result = await parseWorkspaceSetupLinkInput([]);
    expect(typeof result).toBe('object');
    expect(result).toBeDefined();
  });
});
