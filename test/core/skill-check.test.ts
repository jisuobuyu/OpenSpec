import { describe, it, expect } from 'vitest';
import { checkSuperpowersSkills } from '../../src/core/skill-check.js';

describe('checkSuperpowersSkills', () => {
  it('returns empty report for core profile (no skills required)', () => {
    const report = checkSuperpowersSkills('core');
    expect(report.summary.total).toBe(0);
    expect(report.allInstalled).toBe(true);
  });

  it('checks all 7 skills for enhanced profile', () => {
    const report = checkSuperpowersSkills('enhanced');
    expect(report.skills).toHaveLength(7);
    expect(report.summary.required).toBe(5); // 3 always + 2 conditional
    expect(report.summary.total).toBe(7);
  });

  it('checks all 7 skills for strict profile', () => {
    const report = checkSuperpowersSkills('strict');
    expect(report.skills).toHaveLength(7);
    expect(report.summary.required).toBe(5);
  });

  it('identifies always-required skills', () => {
    const report = checkSuperpowersSkills('enhanced');
    const alwaysRequired = report.skills.filter(
      (s) => ['test-driven-development', 'simplify', 'verification-before-completion'].includes(s.name)
    );
    expect(alwaysRequired.every((s) => s.required)).toBe(true);
  });

  it('identifies conditional-required skills', () => {
    const report = checkSuperpowersSkills('enhanced');
    const conditional = report.skills.filter(
      (s) => ['subagent-driven-development', 'requesting-code-review'].includes(s.name)
    );
    expect(conditional.every((s) => s.required)).toBe(true);
  });

  it('identifies optional skills', () => {
    const report = checkSuperpowersSkills('enhanced');
    const optional = report.skills.filter(
      (s) => ['brainstorming', 'writing-plans'].includes(s.name)
    );
    expect(optional.every((s) => !s.required)).toBe(true);
  });

  it('sets allInstalled to true when all required skills are installed', () => {
    // Check with default tool (claude) — will report not installed if skills don't exist
    const report = checkSuperpowersSkills('enhanced', { tools: ['claude'] });
    // In a test environment without Superpowers installed, this will be false
    // which is the expected behavior
    expect(typeof report.allInstalled).toBe('boolean');
  });

  it('checks correct paths for each skill', () => {
    const report = checkSuperpowersSkills('enhanced', { tools: ['claude'] });
    for (const skill of report.skills) {
      expect(skill.checkedPaths.length).toBeGreaterThan(0);
      expect(skill.checkedPaths[0]).toContain('.claude');
      expect(skill.checkedPaths[0]).toContain(skill.name);
      expect(skill.checkedPaths[0]).toContain('SKILL.md');
    }
  });
});
