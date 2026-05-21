import { describe, it, expect } from 'vitest';
import {
  getApplyChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
} from '../../../src/core/templates/skill-templates.js';

describe('getApplyChangeSkillTemplate', () => {
  const template = getApplyChangeSkillTemplate();
  const instructions = template.instructions;

  it('has correct metadata', () => {
    expect(template.name).toBe('openspec-apply-change');
  });

  it('B2: contains HARD GATE designation', () => {
    expect(instructions).toContain('HARD GATE');
    expect(instructions).toContain('MANDATORY — NOT OPTIONAL');
  });

  it('B2: requires MUST call Skill with exact syntax', () => {
    expect(instructions).toContain('you MUST call');
    expect(instructions).toContain('Skill({skill: "subagent-driven-development"})');
  });

  it('B2: checks skill file at both project and user paths', () => {
    expect(instructions).toContain('.claude/skills/subagent-driven-development/SKILL.md');
    expect(instructions).toContain('~/.claude/skills/subagent-driven-development/SKILL.md');
  });

  it('B2: includes WHY THIS IS NOT OPTIONAL', () => {
    expect(instructions).toContain('WHY THIS IS NOT OPTIONAL');
  });

  it('B2: prohibits local execution when skill exists', () => {
    expect(instructions).toContain('DO NOT execute the task locally');
  });

  it('preserves Iron Law', () => {
    expect(instructions).toContain('NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST');
  });

  it('preserves TDD sub-steps', () => {
    expect(instructions).toContain('RED');
    expect(instructions).toContain('GREEN');
    expect(instructions).toContain('REFACTOR');
    expect(instructions).toContain('SIMPLIFY');
  });

  it('preserves session recovery', () => {
    expect(instructions).toContain('Session Recovery');
  });
});

describe('getOpsxApplyCommandTemplate', () => {
  const template = getOpsxApplyCommandTemplate();
  const content = template.content;

  it('has correct metadata', () => {
    expect(template.name).toBe('OPSX: Apply');
  });

  it('B2: contains HARD GATE in subagent dispatch', () => {
    expect(content).toContain('HARD GATE');
  });

  it('B2: hard stop on missing skill', () => {
    expect(content).toContain('hard stop');
  });
});
