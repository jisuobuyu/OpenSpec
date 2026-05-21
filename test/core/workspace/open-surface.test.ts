import { describe, it, expect } from 'vitest';
import {
  buildWorkspaceGuidanceBlock,
  applyWorkspaceGuidanceBlock,
} from '../../../src/core/workspace/open-surface.js';

describe('buildWorkspaceGuidanceBlock', () => {
  it('returns a string containing workspace guidance', () => {
    const block = buildWorkspaceGuidanceBlock();
    expect(typeof block).toBe('string');
    expect(block.length).toBeGreaterThan(0);
  });

  it('contains OPENSPEC:WORKSPACE-GUIDANCE markers', () => {
    const block = buildWorkspaceGuidanceBlock();
    expect(block).toContain('OPENSPEC:WORKSPACE-GUIDANCE');
  });
});

describe('applyWorkspaceGuidanceBlock', () => {
  it('adds guidance block to empty content', () => {
    const result = applyWorkspaceGuidanceBlock('# Original\n');
    expect(result).toContain('# Original');
    expect(result).toContain('OPENSPEC:WORKSPACE-GUIDANCE');
  });

  it('replaces existing guidance block', () => {
    const firstPass = applyWorkspaceGuidanceBlock('# Content\n');
    const secondPass = applyWorkspaceGuidanceBlock(firstPass);
    // Should not duplicate guidance blocks
    const matches = secondPass.match(/OPENSPEC:WORKSPACE-GUIDANCE:START/g);
    expect(matches?.length).toBe(1);
  });
});
