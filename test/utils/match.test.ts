import { describe, it, expect } from 'vitest';
import { nearestMatches, levenshtein } from '../../src/utils/match.js';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0);
  });

  it('returns string length for completely different strings', () => {
    expect(levenshtein('abc', '')).toBe(3);
    expect(levenshtein('', 'xyz')).toBe(3);
  });

  it('returns 1 for single character difference', () => {
    expect(levenshtein('cat', 'bat')).toBe(1);
    expect(levenshtein('cat', 'cut')).toBe(1);
  });
});

describe('nearestMatches', () => {
  it('returns candidates sorted by similarity', () => {
    const candidates = ['apply', 'archive', 'explore', 'proposal'];
    const matches = nearestMatches('applly', candidates);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toBe('apply');
  });

  it('limits to max results', () => {
    const candidates = ['a', 'b', 'c', 'd', 'e', 'f'];
    const matches = nearestMatches('z', candidates, 3);
    expect(matches.length).toBe(3);
  });

  it('returns empty array for empty candidates', () => {
    const matches = nearestMatches('test', []);
    expect(matches.length).toBe(0);
  });
});
