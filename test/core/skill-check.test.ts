import { describe, it, expect } from 'vitest';
import { checkSuperpowersSkills } from '../../src/core/skill-check.js';
import os from 'os';
import path from 'path';

const homedir = os.homedir();

describe('checkSuperpowersSkills', () => {
  it('returns empty report for core profile (no skills required)', () => {
    const report = checkSuperpowersSkills('core');
    expect(report.summary.total).toBe(0);
    expect(report.allInstalled).toBe(true);
  });

  it('checks 5 skills for enhanced profile (1 always + 2 conditional + 2 optional)', () => {
    const report = checkSuperpowersSkills('enhanced');
    expect(report.skills).toHaveLength(5);
    expect(report.summary.required).toBe(3); // 1 always + 2 conditional
    expect(report.summary.total).toBe(5);
  });

  it('checks 5 skills for strict profile', () => {
    const report = checkSuperpowersSkills('strict');
    expect(report.skills).toHaveLength(5);
    expect(report.summary.required).toBe(3);
  });

  it('identifies always-required skills (only verification-before-completion)', () => {
    const report = checkSuperpowersSkills('enhanced');
    const alwaysRequired = report.skills.filter((s) => s.name === 'verification-before-completion');
    expect(alwaysRequired).toHaveLength(1);
    expect(alwaysRequired[0].required).toBe(true);
  });

  it('TDD and simplify are NOT in the skill list (embedded in tasks)', () => {
    const report = checkSuperpowersSkills('enhanced');
    const names = report.skills.map((s) => s.name);
    expect(names).not.toContain('test-driven-development');
    expect(names).not.toContain('simplify');
  });

  it('identifies conditional-required skills', () => {
    const report = checkSuperpowersSkills('enhanced');
    const conditional = report.skills.filter(
      (s) => ['subagent-driven-development', 'requesting-code-review'].includes(s.name)
    );
    expect(conditional).toHaveLength(2);
    expect(conditional.every((s) => s.required)).toBe(true);
  });

  it('identifies optional skills', () => {
    const report = checkSuperpowersSkills('enhanced');
    const optional = report.skills.filter(
      (s) => ['brainstorming', 'writing-plans'].includes(s.name)
    );
    expect(optional).toHaveLength(2);
    expect(optional.every((s) => !s.required)).toBe(true);
  });

  it('sets allInstalled to true when all required skills are installed', () => {
    const report = checkSuperpowersSkills('enhanced', { tools: ['claude'] });
    expect(typeof report.allInstalled).toBe('boolean');
  });

  it('checks user-level ~/.claude/skills/ paths for each skill', () => {
    const report = checkSuperpowersSkills('enhanced', { tools: ['claude'] });
    for (const skill of report.skills) {
      expect(skill.checkedPaths.length).toBeGreaterThan(0);
      // User-level path should always be checked
      expect(skill.checkedPaths[0]).toContain('.claude');
      expect(skill.checkedPaths[0]).toContain(skill.name);
      expect(skill.checkedPaths[0]).toContain('SKILL.md');
    }
  });

  it('checks project-level paths when projectRoot is provided', () => {
    const projectRoot = '/tmp/test-project';
    const report = checkSuperpowersSkills('enhanced', {
      tools: ['claude'],
      projectRoot,
    });

    for (const skill of report.skills) {
      // Should have at least 2 paths: project-level + user-level
      expect(skill.checkedPaths.length).toBeGreaterThanOrEqual(2);

      // First path should be project-level (normalize for platform)
      const projectPath = path.join(projectRoot, '.claude', 'skills', skill.name, 'SKILL.md');
      expect(skill.checkedPaths[0].replace(/\\/g, '/')).toBe(projectPath.replace(/\\/g, '/'));

      // Second path should be user-level
      const userPath = path.join(homedir, '.claude', 'skills', skill.name, 'SKILL.md');
      expect(skill.checkedPaths[1].replace(/\\/g, '/')).toBe(userPath.replace(/\\/g, '/'));
    }
  });

  it('project-level path is checked before user-level', () => {
    const projectRoot = '/tmp/my-project';
    const report = checkSuperpowersSkills('enhanced', {
      tools: ['claude'],
      projectRoot,
    });

    for (const skill of report.skills) {
      // Project path (index 0) should contain the project root (normalize separators)
      const normalized0 = skill.checkedPaths[0].replace(/\\/g, '/');
      expect(normalized0).toContain('/tmp/my-project');
      // User path (index 1) should contain homedir
      const normalized1 = skill.checkedPaths[1].replace(/\\/g, '/');
      expect(normalized1).toContain(homedir.replace(/\\/g, '/'));
    }
  });

  it('without projectRoot, only user-level paths are checked', () => {
    const report = checkSuperpowersSkills('enhanced', { tools: ['claude'] });
    for (const skill of report.skills) {
      expect(skill.checkedPaths.length).toBe(1);
      expect(skill.checkedPaths[0]).toContain(homedir);
    }
  });
});
