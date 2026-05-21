import { describe, it, expect } from 'vitest';
import {
  getWorkspaceOpenerLabel,
  listWorkspaceOpenerChoices,
} from '../../../src/core/workspace/openers.js';

describe('getWorkspaceOpenerLabel', () => {
  it('returns a human-readable label for agent opener', () => {
    const label = getWorkspaceOpenerLabel({ kind: 'agent', id: 'claude' });
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('returns a human-readable label for editor opener', () => {
    const label = getWorkspaceOpenerLabel({ kind: 'editor' });
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });
});

describe('listWorkspaceOpenerChoices', () => {
  it('returns an array of choices', () => {
    const choices = listWorkspaceOpenerChoices();
    expect(Array.isArray(choices)).toBe(true);
    expect(choices.length).toBeGreaterThan(0);
  });

  it('each choice has value and label', () => {
    const choices = listWorkspaceOpenerChoices();
    for (const choice of choices) {
      expect(choice.value).toBeDefined();
      expect(choice.label).toBeDefined();
    }
  });
});
